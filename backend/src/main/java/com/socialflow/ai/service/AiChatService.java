package com.socialflow.ai.service;

import com.socialflow.ai.dto.AiCampaignData;
import com.socialflow.ai.dto.AiPostData;
import com.socialflow.ai.dto.AiSuggestedEntities;
import com.socialflow.ai.dto.ChatRequest;
import com.socialflow.ai.dto.ChatResponse;
import com.socialflow.dto.CampaignRequest;
import com.socialflow.model.*;
import com.socialflow.repository.*;
import com.socialflow.service.CampaignService;
import com.socialflow.service.PostService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiChatService {

    private final AiModelConfigService aiModelConfigService;
    private final AiServiceClient aiServiceClient;
    private final ChatSessionRepository sessionRepository;
    private final ChatMessageRepository messageRepository;
    private final CampaignService campaignService;
    private final PostService postService;
    private final UserRepository userRepository;
    private final BrandRepository brandRepository;

    public ChatResponse processChatMessage(ChatRequest request) {
        log.info("Processing chat message for session: {}", request.getSessionId());

        // 1. Get or Create Session
        ChatSession session = sessionRepository.findById(UUID.fromString(request.getSessionId()))
                .orElseGet(() -> {
                    ChatSession newSession = ChatSession.builder()
                            .id(UUID.fromString(request.getSessionId()))
                            .brandId(UUID.fromString(request.getBrandId()))
                            .userId(UUID.fromString(request.getUserId()))
                            .title("New Chat")
                            .isDeleted(false)
                            .build();
                    return sessionRepository.saveAndFlush(newSession);
                });

        // 2. Save User Message
        ChatMessage userMessage = ChatMessage.builder()
                .session(session)
                .role("user")
                .content(request.getMessage())
                .build();
        messageRepository.saveAndFlush(userMessage);

        // 3. Call Python AI Service
        ChatResponse response = aiServiceClient.sendChatMessage(request);

        if (response != null && Boolean.TRUE.equals(response.getSuccess())) {
            // 4. Save AI Message
            String modelUsed = "default";
            AiModelConfig config = aiModelConfigService.getConfigByBrandIdStr(request.getBrandId());
            if (config != null && config.getTextModel() != null) {
                modelUsed = config.getTextModel();
            }
            
            ChatMessage assistantMessage = ChatMessage.builder()
                    .session(session)
                    .role("assistant")
                    .content(response.getAnswer())
                    .modelUsed(modelUsed)
                    .build();
            messageRepository.save(assistantMessage);
        }

        return response;
    }

    /**
     * Auto-saves AI-generated campaigns and posts through the proper service layer.
     * - Campaign  → CampaignService.createCampaign()  (brand ownership validation included)
     * - Post      → PostService.createAiDraftPost()    (validated, transactional, no raw SQL)
     */
    private void handleAutoSave(UUID brandId, UUID userId, AiSuggestedEntities entities) {
        log.info("Handling auto-save via service layer for brand: {}", brandId);

        // 1. Validate brand & user exist
        if (brandRepository.findById(brandId).isEmpty()) {
            log.error("Auto-save aborted: brand not found: {}", brandId);
            return;
        }
        User uploader = userRepository.findById(userId).orElse(null);
        if (uploader == null) {
            log.error("Auto-save aborted: user not found: {}", userId);
            return;
        }

        // 2. Create Campaign via CampaignService (includes brand ownership validation)
        Campaign savedCampaign = null;
        AiCampaignData campaignData = entities.getCampaign();
        if (campaignData != null
                && campaignData.getName() != null
                && !campaignData.getName().isBlank()
                && !campaignData.getName().equals("string")) {
            try {
                CampaignRequest req = new CampaignRequest();
                req.setName(campaignData.getName());
                req.setDescription(campaignData.getDescription());
                req.setStartDate(campaignData.getStartDate() != null
                        ? LocalDate.parse(campaignData.getStartDate()) : null);
                req.setEndDate(campaignData.getEndDate() != null
                        ? LocalDate.parse(campaignData.getEndDate()) : null);

                var campaignResponse = campaignService.createCampaign(brandId, userId, req);
                savedCampaign = new Campaign();
                savedCampaign.setId(campaignResponse.getId());
                log.info("✓ Campaign created via CampaignService: {}", campaignResponse.getId());
            } catch (Exception e) {
                log.error("Failed to create campaign via CampaignService: {}", e.getMessage());
            }
        }

        // 3. Create Posts via PostService.createAiDraftPost()
        List<AiPostData> posts = entities.getPosts();
        if (posts != null) {
            for (AiPostData post : posts) {
                if (post.getContent() == null
                        || post.getContent().isBlank()
                        || post.getContent().equals("string")) {
                    log.warn("Skipping AI post with empty/placeholder content");
                    continue;
                }
                try {
                    postService.createAiDraftPost(
                            post.getContent(),
                            savedCampaign,
                            post.getScheduledTime(),
                            post.getMediaFilenames(),
                            uploader
                    );
                } catch (Exception e) {
                    log.error("Failed to create AI draft post via PostService: {}", e.getMessage());
                }
            }
        }
    }
    @Transactional
    public void handleAiCallback(ChatResponse response) {
        log.info("Received AI callback for session: {}", response.getSessionId());
        
        if (response.getSuggestedEntities() != null) {
            ChatSession session = sessionRepository.findById(UUID.fromString(response.getSessionId())).orElse(null);
            if (session != null) {
                handleAutoSave(session.getBrandId(), session.getUserId(), response.getSuggestedEntities());
            }
        }
    }

    public List<ChatSession> getSessions(String brandId) {
        return sessionRepository.findByBrandIdAndIsDeletedFalseOrderByUpdatedAtDesc(UUID.fromString(brandId));
    }

    public List<ChatMessage> getHistory(String sessionId) {
        return messageRepository.findBySessionIdOrderByCreatedAtAsc(UUID.fromString(sessionId));
    }

    @Transactional
    public void deleteSession(String sessionId) {
        ChatSession session = sessionRepository.findById(UUID.fromString(sessionId))
                .orElseThrow(() -> new RuntimeException("Session not found"));
        session.setDeleted(true);
        sessionRepository.save(session);
    }
}

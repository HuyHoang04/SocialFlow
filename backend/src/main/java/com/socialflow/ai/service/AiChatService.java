package com.socialflow.ai.service;

import com.socialflow.ai.dto.ChatRequest;
import com.socialflow.ai.dto.ChatResponse;
import com.socialflow.model.*;
import com.socialflow.model.enums.PostStatus;
import com.socialflow.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiChatService {

    private final AiModelConfigService aiModelConfigService;
    private final AiServiceClient aiServiceClient;
    private final ChatSessionRepository sessionRepository;
    private final ChatMessageRepository messageRepository;
    private final CampaignRepository campaignRepository;
    private final PostRepository postRepository;
    private final PostMediaRepository postMediaRepository;
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

    private void handleAutoSave(UUID brandId, UUID userId, Map<String, Object> entities) {
        log.info("Handling auto-save for brand: {}", brandId);
        
        Brand brand = brandRepository.findById(brandId).orElse(null);
        if (brand == null) {
            log.error("Brand not found: {}", brandId);
            return;
        }

        // 1. Extract Campaign
        Map<String, Object> campaignData = (Map<String, Object>) entities.get("campaign");
        Campaign campaign = null;
        if (campaignData != null && campaignData.get("name") != null && !campaignData.get("name").equals("string")) {
            campaign = Campaign.builder()
                    .brand(brand)
                    .name((String) campaignData.get("name"))
                    .description((String) campaignData.get("description"))
                    .startDate(campaignData.get("startDate") != null ? java.time.LocalDate.parse((String) campaignData.get("startDate")) : null)
                    .endDate(campaignData.get("endDate") != null ? java.time.LocalDate.parse((String) campaignData.get("endDate")) : null)
                    .build();
            campaign = campaignRepository.save(campaign);
            log.info("✓ Auto-saved campaign: {}", campaign.getId());
        }

        // 2. Extract Posts
        List<Map<String, Object>> postsData = (List<Map<String, Object>>) entities.get("posts");
        if (postsData != null) {
            User uploader = userRepository.findById(userId).orElse(null);
            
            for (Map<String, Object> pData : postsData) {
                String content = (String) pData.get("content");
                if (content == null || content.equals("string")) continue;

                Post post = Post.builder()
                        .campaign(campaign)
                        .content(content)
                        .status(PostStatus.DRAFT)
                        .scheduledTime(pData.get("scheduledTime") != null ? 
                                java.time.OffsetDateTime.parse((String) pData.get("scheduledTime")).toLocalDateTime() : null)
                        .build();
                post = postRepository.save(post);
                log.info("✓ Auto-saved post: {}", post.getId());

                // 3. Extract Media (Images)
                List<String> mediaFiles = (List<String>) pData.get("mediaFilenames");
                if (mediaFiles != null && uploader != null) {
                    for (int i = 0; i < mediaFiles.size(); i++) {
                        String filename = mediaFiles.get(i);
                        PostMedia media = PostMedia.builder()
                                .post(post)
                                .uploader(uploader)
                                .filename(filename)
                                .url(filename)
                                .originalName("ai_gen_" + i + ".png")
                                .contentType("image/png")
                                .sortOrder(i)
                                .build();
                        postMediaRepository.save(media);
                    }
                    log.info("  ✓ Added {} media assets to post", mediaFiles.size());
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

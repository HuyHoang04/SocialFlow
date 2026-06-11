package com.socialflow.ai.service;

import com.socialflow.ai.dto.SuggestReplyRequest;
import com.socialflow.ai.dto.SuggestReplyResponse;
import com.socialflow.model.Brand;
import com.socialflow.model.InboxMessage;
import com.socialflow.repository.BrandRepository;
import com.socialflow.repository.InboxMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiSuggestionService {

    private final AiServiceClient aiServiceClient;
    private final InboxMessageRepository inboxRepository;
    private final BrandRepository brandRepository;

    public String suggestReply(UUID messageId) {
        log.info("Generating AI reply suggestion for message: {}", messageId);

        // 1. Get Message Context
        InboxMessage message = inboxRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        Brand brand = brandRepository.findById(message.getPage().getConnection().getBrand().getId())
                .orElseThrow(() -> new RuntimeException("Brand not found"));

        // 1.5 Fetch Conversation History
        String conversationHistory = "";
        if (message.getConversationId() != null) {
            java.util.List<InboxMessage> history = inboxRepository.findByConversationIdAndPageId(
                message.getConversationId(), message.getPage().getId());
                
            history.sort((m1, m2) -> m1.getCreatedAt().compareTo(m2.getCreatedAt()));
            
            StringBuilder sb = new StringBuilder();
            for (InboxMessage m : history) {
                if (m.getCreatedAt().isAfter(message.getCreatedAt())) continue; // only messages up to the current one
                String sender = Boolean.TRUE.equals(m.getIsFromMe()) ? brand.getName() : m.getAuthorName();
                sb.append(sender).append(": ").append(m.getContent()).append("\n");
            }
            conversationHistory = sb.toString();
        }

        // 2. Build Request for Python Service
        SuggestReplyRequest request = SuggestReplyRequest.builder()
                .brandId(brand.getId().toString())
                .brandName(brand.getName())
                .brandDescription(brand.getDescription())
                .messageContent(message.getContent())
                .conversationHistory(conversationHistory)
                .platform(message.getPage().getPlatform().name())
                .messageType(message.getMessageType().toString().toLowerCase())
                .customerName(message.getAuthorName())
                .maxWords(100)
                .build();

        // 3. Call Python Service
        SuggestReplyResponse response = aiServiceClient.suggestReply(request);

        if (response != null && response.isSuccess()) {
            return response.getSuggestion();
        } else {
            log.warn("AI Suggestion failed: {}", response != null ? response.getError() : "No response");
            return "Xin lỗi, tôi không thể tạo gợi ý lúc này. Vui lòng thử lại sau.";
        }
    }
}

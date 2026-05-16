package com.socialflow.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.socialflow.dto.InboxMessageResponse;
import com.socialflow.model.InboxMessage;
import com.socialflow.model.SocialPage;
import com.socialflow.model.enums.MessageType;
import com.socialflow.model.enums.PlatformType;
import com.socialflow.repository.InboxMessageRepository;
import com.socialflow.repository.SocialPageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebhookEventService {

    private final SocialPageRepository pageRepository;
    private final InboxMessageRepository inboxRepository;
    private final InboxEventPublisher inboxEventPublisher;
    private final WebClient.Builder webClientBuilder;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public void processInstagramPayload(String rawPayload) {
        try {
            JsonNode root = objectMapper.readTree(rawPayload);
            String object = root.path("object").asText();
            
            if (!"instagram".equals(object)) {
                log.warn("[Webhook-IG] Invalid object type, expected 'instagram' but got: {}", object);
                return;
            }

            log.info("[Webhook-IG] Processing Instagram payload");

            for (JsonNode entry : root.path("entry")) {
                String pageId = entry.path("id").asText();
                
                if (entry.has("changes")) {
                    for (JsonNode change : entry.path("changes")) {
                        String field = change.path("field").asText();
                        JsonNode value = change.path("value");
                        
                        log.debug("[Webhook-IG] Processing field: {}", field);
                        
                        switch (field) {
                            case "comments" -> processInstagramComment(pageId, value);
                            case "messages" -> processInstagramDirectMessage(pageId, value);
                            case "message_echoes" -> log.debug("[Webhook-IG] Message echo (own message), ignoring");
                            default -> log.debug("[Webhook-IG] Unhandled field: {}", field);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("[Webhook-IG] Failed to process Instagram payload", e);
        }
    }

    @Transactional
    public void processThreadsPayload(String rawPayload) {
        try {
            JsonNode root = objectMapper.readTree(rawPayload);
            String object = root.path("object").asText();
            
            if (!"threads".equals(object)) {
                log.warn("[Webhook-Threads] Invalid object type, expected 'threads' but got: {}", object);
                return;
            }

            log.info("[Webhook-Threads] Processing Threads payload");

            for (JsonNode entry : root.path("entry")) {
                String pageId = entry.path("id").asText();
                
                if (entry.has("changes")) {
                    for (JsonNode change : entry.path("changes")) {
                        String field = change.path("field").asText();
                        JsonNode value = change.path("value");
                        
                        log.debug("[Webhook-Threads] Processing field: {}", field);
                        
                        switch (field) {
                            case "comments" -> processThreadsComment(pageId, value);
                            case "messages" -> processThreadsDirectMessage(pageId, value);
                            case "message_echoes" -> log.debug("[Webhook-Threads] Message echo (own message), ignoring");
                            default -> log.debug("[Webhook-Threads] Unhandled field: {}", field);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("[Webhook-Threads] Failed to process Threads payload", e);
        }
    }

    @Transactional
    public void processMetaPayload(String rawPayload) {
        try {
            JsonNode root = objectMapper.readTree(rawPayload);
            String object = root.path("object").asText();
            
            log.warn("[Webhook-Meta] DEPRECATED: Use /instagram or /threads endpoint instead. Object: {}", object);
            
            // Route to appropriate handler
            if ("instagram".equals(object)) {
                processInstagramPayload(rawPayload);
            } else if ("threads".equals(object)) {
                processThreadsPayload(rawPayload);
            } else {
                log.warn("[Webhook-Meta] Unknown object type: {}", object);
            }
        } catch (Exception e) {
            log.error("[Webhook-Meta] Failed to process Meta payload", e);
        }
    }

    private void processInstagramComment(String platformPageId, JsonNode value) {
        String commentId  = value.path("id").asText();
        String postId     = value.path("post_id").asText();
        String text       = value.path("text").asText("");
        String authorName = value.path("from").path("name").asText("User");
        String authorId   = value.path("from").path("id").asText(null);
        
        log.info("[Webhook-IG] Comment: id={}, author={}", commentId, authorName);
        
        SocialPage page = findPageByPlatform(platformPageId, PlatformType.INSTAGRAM);
        if (page == null) {
            log.warn("[Webhook-IG] No Instagram page found for pageId={}", platformPageId);
            return;
        }
        
        if (inboxRepository.findByPlatformMessageIdAndPageId(commentId, page.getId()).isPresent()) {
            log.debug("[Webhook-IG] Comment {} already in DB, skipping", commentId);
            return;
        }
        
        boolean isFromMe = page.getPlatformPageId().equals(authorId);
        
        InboxMessage saved = inboxRepository.save(InboxMessage.builder()
                .platformMessageId(commentId)
                .platformPostId(postId)
                .parentMessageId(null)
                .content(text)
                .authorName(authorName)
                .authorId(authorId)
                .messageType(MessageType.COMMENT)
                .createdAt(LocalDateTime.now())
                .page(page)
                .isRead(isFromMe)
                .isFromMe(isFromMe)
                .build());
        
        log.info("[Webhook-IG] ✓ Stored comment: {}", commentId);
        broadcastMeta(page, saved);
    }

    private void processInstagramDirectMessage(String platformPageId, JsonNode value) {
        String messageId    = value.path("id").asText();
        String conversationId = value.path("conversation_id").asText();
        String text         = value.path("text").asText("");
        String senderId     = value.path("from").path("id").asText();
        String senderName   = value.path("from").path("name").asText("Instagram User");
        
        log.info("[Webhook-IG] DM: id={}, from={}, conv={}", messageId, senderName, conversationId);
        
        SocialPage page = findPageByPlatform(platformPageId, PlatformType.INSTAGRAM);
        if (page == null) {
            log.warn("[Webhook-IG] No Instagram page found for pageId={}", platformPageId);
            return;
        }
        
        if (inboxRepository.findByPlatformMessageIdAndPageId(messageId, page.getId()).isPresent()) {
            log.debug("[Webhook-IG] DM {} already in DB, skipping", messageId);
            return;
        }
        
        boolean isFromMe = page.getPlatformPageId().equals(senderId);
        
        InboxMessage saved = inboxRepository.save(InboxMessage.builder()
                .platformMessageId(messageId)
                .conversationId(conversationId)
                .content(text)
                .authorName(senderName)
                .authorId(senderId)
                .messageType(MessageType.DIRECT_MESSAGE)
                .createdAt(LocalDateTime.now())
                .page(page)
                .isRead(isFromMe)
                .isFromMe(isFromMe)
                .build());
        
        log.info("[Webhook-IG] ✓ Stored DM: {}", messageId);
        broadcastMeta(page, saved);
    }

    private void processThreadsComment(String platformPageId, JsonNode value) {
        String commentId  = value.path("id").asText();
        String postId     = value.path("post_id").asText();
        String text       = value.path("text").asText("");
        String authorName = value.path("from").path("name").asText("User");
        String authorId   = value.path("from").path("id").asText(null);
        
        log.info("[Webhook-Threads] Comment: id={}, author={}", commentId, authorName);
        
        SocialPage page = findPageByPlatform(platformPageId, PlatformType.THREADS);
        if (page == null) {
            log.warn("[Webhook-Threads] No Threads page found for pageId={}", platformPageId);
            return;
        }
        
        if (inboxRepository.findByPlatformMessageIdAndPageId(commentId, page.getId()).isPresent()) {
            log.debug("[Webhook-Threads] Comment {} already in DB, skipping", commentId);
            return;
        }
        
        boolean isFromMe = page.getPlatformPageId().equals(authorId);
        
        InboxMessage saved = inboxRepository.save(InboxMessage.builder()
                .platformMessageId(commentId)
                .platformPostId(postId)
                .parentMessageId(null)
                .content(text)
                .authorName(authorName)
                .authorId(authorId)
                .messageType(MessageType.COMMENT)
                .createdAt(LocalDateTime.now())
                .page(page)
                .isRead(isFromMe)
                .isFromMe(isFromMe)
                .build());
        
        log.info("[Webhook-Threads] ✓ Stored comment: {}", commentId);
        broadcastMeta(page, saved);
    }

    private void processThreadsDirectMessage(String platformPageId, JsonNode value) {
        String messageId    = value.path("id").asText();
        String conversationId = value.path("conversation_id").asText();
        String text         = value.path("text").asText("");
        String senderId     = value.path("from").path("id").asText();
        String senderName   = value.path("from").path("name").asText("Threads User");
        
        log.info("[Webhook-Threads] DM: id={}, from={}, conv={}", messageId, senderName, conversationId);
        
        SocialPage page = findPageByPlatform(platformPageId, PlatformType.THREADS);
        if (page == null) {
            log.warn("[Webhook-Threads] No Threads page found for pageId={}", platformPageId);
            return;
        }
        
        if (inboxRepository.findByPlatformMessageIdAndPageId(messageId, page.getId()).isPresent()) {
            log.debug("[Webhook-Threads] DM {} already in DB, skipping", messageId);
            return;
        }
        
        boolean isFromMe = page.getPlatformPageId().equals(senderId);
        
        InboxMessage saved = inboxRepository.save(InboxMessage.builder()
                .platformMessageId(messageId)
                .conversationId(conversationId)
                .content(text)
                .authorName(senderName)
                .authorId(senderId)
                .messageType(MessageType.DIRECT_MESSAGE)
                .createdAt(LocalDateTime.now())
                .page(page)
                .isRead(isFromMe)
                .isFromMe(isFromMe)
                .build());
        
        log.info("[Webhook-Threads] ✓ Stored DM: {}", messageId);
        broadcastMeta(page, saved);
    }

    @Transactional
    public void processFacebookPayload(String rawPayload) {
        try {
            JsonNode root = objectMapper.readTree(rawPayload);
            String object = root.path("object").asText();
            if (!"page".equals(object)) {
                log.debug("[Webhook] Ignoring non-page object: {}", object);
                return;
            }
            for (JsonNode entry : root.path("entry")) {
                String pageId = entry.path("id").asText();
                if (entry.has("messaging")) {
                    for (JsonNode msgEvent : entry.path("messaging")) {
                        processMessagingEvent(pageId, msgEvent);
                    }
                }
                if (entry.has("changes")) {
                    for (JsonNode change : entry.path("changes")) {
                        String field = change.path("field").asText();
                        JsonNode value = change.path("value");
                        switch (field) {
                            case "feed"    -> processFeedChange(pageId, value);
                            case "mention" -> processMentionChange(pageId, value);
                            default        -> log.debug("[Webhook] Unhandled field: {}", field);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("[Webhook] Failed to process Facebook payload", e);
        }
    }

    private void processMessagingEvent(String platformPageId, JsonNode event) {
        if (!event.has("message")) return;
        JsonNode messageNode = event.path("message");
        if (messageNode.path("is_echo").asBoolean(false)) return;

        String msgId    = messageNode.path("mid").asText();
        String text     = messageNode.path("text").asText("");
        String senderId = event.path("sender").path("id").asText();
        String senderName = null;

        log.info("[Webhook] DM received: msgId={}, from={}", msgId, senderId);

        SocialPage page = findPage(platformPageId);
        if (page == null) return;

        if (inboxRepository.findByPlatformMessageIdAndPageId(msgId, page.getId()).isPresent()) {
            log.debug("[Webhook] DM {} already in DB, skipping", msgId);
            return;
        }

        // Resolve conversationId: sync uses FB Thread ID (e.g. "t_12345"),
        // webhook only has sender PSID - look up existing DMs to reuse the real thread ID.
        String convId = null;

        // 1. Find prior DMs from this PSID and reuse their thread ID + name
        List<InboxMessage> byPsid = inboxRepository.findByAuthorIdAndPageIdAndMessageType(
                senderId, page.getId(), MessageType.DIRECT_MESSAGE);
        if (!byPsid.isEmpty()) {
            // Prefer Thread ID format (t_xxx) from sync, over older PSID-based convIds
            convId = byPsid.stream()
                    .map(InboxMessage::getConversationId)
                    .filter(id -> id != null && id.startsWith("t_"))
                    .findFirst()
                    .orElseGet(() -> byPsid.stream()
                            .map(InboxMessage::getConversationId)
                            .filter(id -> id != null)
                            .findFirst()
                            .orElse(null));

            senderName = byPsid.stream()
                    .filter(m -> !Boolean.TRUE.equals(m.getIsFromMe())
                            && m.getAuthorName() != null
                            && !"Facebook User".equals(m.getAuthorName()))
                    .map(InboxMessage::getAuthorName)
                    .findFirst().orElse(null);
        }

        // 2. Fallback: prior webhook runs may have stored under PSID key
        if (convId == null) {
            List<InboxMessage> existing = inboxRepository.findByConversationIdAndPageId(senderId, page.getId());
            if (!existing.isEmpty()) {
                convId = senderId;
                if (senderName == null) {
                    senderName = existing.stream()
                            .filter(m -> !Boolean.TRUE.equals(m.getIsFromMe())
                                    && m.getAuthorName() != null
                                    && !"Facebook User".equals(m.getAuthorName()))
                            .map(InboxMessage::getAuthorName)
                            .findFirst().orElse(null);
                }
            }
        }

        // 3. Brand new conversation
        if (convId == null) convId = senderId;

        // Resolve sender name via Graph API if still unknown
        if (senderName == null && page.getPageAccessToken() != null && !page.getPageAccessToken().isBlank()) {
            try {
                final String psid = senderId;
                JsonNode userInfo = webClientBuilder.baseUrl("https://graph.facebook.com").build()
                        .get()
                        .uri(uri -> uri.path("/v18.0/" + psid)
                                .queryParam("fields", "name,profile_pic")
                                .queryParam("access_token", page.getPageAccessToken())
                                .build())
                        .retrieve()
                        .bodyToMono(JsonNode.class)
                        .block();
                if (userInfo != null && userInfo.has("name")) {
                    senderName = userInfo.get("name").asText();
                    log.info("[Webhook] Resolved sender name: {} for PSID {}", senderName, psid);
                }
            } catch (Exception e) {
                log.warn("[Webhook] Could not resolve sender name for PSID {}: {}", senderId, e.getMessage());
            }
        }

        if (senderName == null) senderName = "Facebook User";
        log.info("[Webhook] DM -> convId={}, sender={}", convId, senderName);

        InboxMessage saved = inboxRepository.save(InboxMessage.builder()
                .platformMessageId(msgId)
                .conversationId(convId)
                .content(text)
                .authorName(senderName)
                .authorId(senderId)
                .messageType(MessageType.DIRECT_MESSAGE)
                .createdAt(LocalDateTime.now())
                .page(page)
                .isRead(false)
                .isFromMe(false)
                .build());

        broadcast(page, saved);
    }

    private void processFeedChange(String platformPageId, JsonNode value) {
        String item = value.path("item").asText();
        String verb = value.path("verb").asText();
        log.info("[Webhook] Feed change: item={}, verb={}", item, verb);
        if (!"add".equals(verb) && !"edited".equals(verb)) return;
        SocialPage page = findPage(platformPageId);
        if (page == null) return;
        switch (item) {
            case "comment"  -> processComment(page, value);
            case "reaction" -> processReaction(page, value);
            default         -> log.debug("[Webhook] Unhandled feed item: {}", item);
        }
    }

    private void processComment(SocialPage page, JsonNode value) {
        String commentId  = value.path("comment_id").asText();
        String postId     = value.path("post_id").asText();
        String parentId   = value.has("parent_id") ? value.path("parent_id").asText() : null;
        String text       = value.path("message").asText("");
        String authorName = value.path("from").path("name").asText("Facebook User");
        String authorId   = value.path("from").path("id").asText(null);
        log.info("[Webhook] Comment: id={}, author={}", commentId, authorName);
        if (inboxRepository.findByPlatformMessageIdAndPageId(commentId, page.getId()).isPresent()) return;
        boolean isFromMe = page.getPlatformPageId().equals(authorId);
        String parentMessageId = (parentId != null && !parentId.equals(postId)) ? parentId : null;
        InboxMessage saved = inboxRepository.save(InboxMessage.builder()
                .platformMessageId(commentId)
                .platformPostId(postId)
                .parentMessageId(parentMessageId)
                .content(text)
                .authorName(authorName)
                .authorId(authorId)
                .messageType(MessageType.COMMENT)
                .createdAt(LocalDateTime.now())
                .page(page)
                .isRead(isFromMe)
                .isFromMe(isFromMe)
                .build());
        broadcast(page, saved);
    }

    private void processReaction(SocialPage page, JsonNode value) {
        String postId       = value.path("post_id").asText();
        String reactionType = value.path("reaction_type").asText("like");
        String authorName   = value.path("from").path("name").asText("Facebook User");
        String authorId     = value.path("from").path("id").asText(null);
        String syntheticId  = "reaction:" + authorId + ":" + postId;
        log.info("[Webhook] Reaction: type={}, author={}", reactionType, authorName);
        if (inboxRepository.findByPlatformMessageIdAndPageId(syntheticId, page.getId()).isPresent()) return;
        String emoji = switch (reactionType) {
            case "like"  -> "Like";
            case "love"  -> "Love";
            case "haha"  -> "Haha";
            case "wow"   -> "Wow";
            case "sad"   -> "Sad";
            case "angry" -> "Angry";
            default      -> "Like";
        };
        InboxMessage saved = inboxRepository.save(InboxMessage.builder()
                .platformMessageId(syntheticId)
                .platformPostId(postId)
                .content(authorName + " reacted " + emoji + " to your post")
                .authorName(authorName)
                .authorId(authorId)
                .messageType(MessageType.COMMENT)
                .createdAt(LocalDateTime.now())
                .page(page)
                .isRead(false)
                .isFromMe(false)
                .build());
        broadcast(page, saved);
    }

    private void processMentionChange(String platformPageId, JsonNode value) {
        String postId     = value.path("post_id").asText();
        String commentId  = value.path("comment_id").asText(null);
        String text       = value.path("item").asText("");
        String authorName = value.path("sender_name").asText("Facebook User");
        String authorId   = value.path("sender_id").asText(null);
        String msgId      = commentId != null ? commentId : "mention:" + postId;
        log.info("[Webhook] Mention: id={}, author={}", msgId, authorName);
        SocialPage page = findPage(platformPageId);
        if (page == null) return;
        if (inboxRepository.findByPlatformMessageIdAndPageId(msgId, page.getId()).isPresent()) return;
        InboxMessage saved = inboxRepository.save(InboxMessage.builder()
                .platformMessageId(msgId)
                .platformPostId(postId)
                .content("[Mention] " + text)
                .authorName(authorName)
                .authorId(authorId)
                .messageType(MessageType.COMMENT)
                .createdAt(LocalDateTime.now())
                .page(page)
                .isRead(false)
                .isFromMe(false)
                .build());
        broadcast(page, saved);
    }

    private SocialPage findPage(String platformPageId) {
        List<SocialPage> pages = pageRepository.findByPlatformPageId(platformPageId);
        if (pages.isEmpty()) {
            log.warn("[Webhook] No page found for platformPageId={}", platformPageId);
            return null;
        }
        return pages.get(0);
    }

    private SocialPage findPageByPlatform(String platformPageId, PlatformType platform) {
        List<SocialPage> pages = pageRepository.findByPlatformPageId(platformPageId);
        if (pages.isEmpty()) {
            log.warn("[Webhook] No page found for platformPageId={} and platform={}", platformPageId, platform);
            return null;
        }
        
        // Filter by platform if needed
        return pages.stream()
                .filter(p -> p.getPlatform() == platform)
                .findFirst()
                .orElseGet(() -> pages.get(0)); // Fallback to first if platform doesn't match
    }

    private void broadcast(SocialPage page, InboxMessage message) {
        UUID brandId = page.getConnection().getBrand().getId();
        InboxMessageResponse response = InboxMessageResponse.builder()
                .id(message.getId())
                .platformMessageId(message.getPlatformMessageId())
                .platformPostId(message.getPlatformPostId())
                .parentMessageId(message.getParentMessageId())
                .content(message.getContent())
                .authorName(message.getAuthorName())
                .authorProfilePic(message.getAuthorProfilePic())
                .createdAt(message.getCreatedAt())
                .isRead(message.getIsRead())
                .isFromMe(message.getIsFromMe())
                .messageType(message.getMessageType())
                .conversationId(message.getConversationId())
                .likeCount(message.getLikeCount())
                .pageId(page.getId())
                .pageName(page.getPageName())
                .platform(PlatformType.FACEBOOK)
                .build();
        inboxEventPublisher.publishNewMessage(brandId, response);
    }

    private void broadcastMeta(SocialPage page, InboxMessage message) {
        UUID brandId = page.getConnection().getBrand().getId();
        InboxMessageResponse response = InboxMessageResponse.builder()
                .id(message.getId())
                .platformMessageId(message.getPlatformMessageId())
                .platformPostId(message.getPlatformPostId())
                .parentMessageId(message.getParentMessageId())
                .content(message.getContent())
                .authorName(message.getAuthorName())
                .authorProfilePic(message.getAuthorProfilePic())
                .createdAt(message.getCreatedAt())
                .isRead(message.getIsRead())
                .isFromMe(message.getIsFromMe())
                .messageType(message.getMessageType())
                .conversationId(message.getConversationId())
                .likeCount(message.getLikeCount())
                .pageId(page.getId())
                .pageName(page.getPageName())
                .platform(page.getPlatform()) // Use actual page platform
                .build();
        inboxEventPublisher.publishNewMessage(brandId, response);
    }
}
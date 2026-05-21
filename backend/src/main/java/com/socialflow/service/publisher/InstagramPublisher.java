package com.socialflow.service.publisher;

import com.fasterxml.jackson.databind.JsonNode;
import com.socialflow.dto.PlatformCommentDto;
import com.socialflow.model.Post;
import com.socialflow.model.PostMedia;
import com.socialflow.model.PublishResult;
import com.socialflow.model.SocialPage;
import com.socialflow.model.enums.MessageType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class InstagramPublisher implements CommentFetcher {

    private final WebClient.Builder webClientBuilder;

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    @Value("${app.base-url:http://localhost:3000}")
    private String baseUrl;

    // ────────────────────────────────────────────────────────────
    // Publishing
    // ────────────────────────────────────────────────────────────

    public PublishResult publish(Post post, SocialPage page) {
        try {
            WebClient client = webClientBuilder
                    .baseUrl("https://graph.instagram.com/v18.0")
                    .build();

            String userId = page.getPlatformPageId();
            String accessToken = page.getPageAccessToken();
            List<PostMedia> media = post.getMediaFiles();

            if (media == null || media.isEmpty()) {
                return PublishResult.builder()
                        .post(post).success(false)
                        .errorMessage("Instagram requires at least one image or video")
                        .build();
            }

            PostMedia first = media.get(0);
            String mediaUrl = first.getUrl().startsWith("http") ? first.getUrl() : baseUrl + first.getUrl();

            // Step 1: Create media object container
            Map<String, Object> containerParams = new HashMap<>();
            boolean isVideo = first.getContentType().startsWith("video/");
            containerParams.put("media_type", isVideo ? "VIDEO" : "IMAGE");
            containerParams.put("caption", post.getContent());

            if (media.size() > 1) {
                // Carousel creation requires creating individual item containers first,
                // but for this hotfix we'll just publish the first media item.
                log.warn("Carousel publishing not fully implemented yet, publishing first image only.");
            }
            
            if (isVideo) {
                containerParams.put("video_url", mediaUrl);
            } else {
                containerParams.put("image_url", mediaUrl);
            }

            containerParams.put("access_token", accessToken);

            // Step 3: Create media object
            JsonNode containerResp = client.post()
                    .uri("/{userId}/media", userId)
                    .bodyValue(containerParams)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (containerResp == null || !containerResp.has("id")) {
                return PublishResult.builder()
                        .post(post).success(false)
                        .errorMessage("Failed to create Instagram media object")
                        .build();
            }

            String creationId = containerResp.get("id").asText();

            // Add delay to let Instagram download and process the media before publishing
            try {
                Thread.sleep(3000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }

            // Step 4: Publish the media object
            JsonNode publishResp = client.post()
                    .uri("/{userId}/media_publish", userId)
                    .bodyValue(Map.of(
                            "creation_id", creationId,
                            "access_token", accessToken
                    ))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (publishResp != null && publishResp.has("id")) {
                String postId = publishResp.get("id").asText();
                String permalink = "https://www.instagram.com/p/" + postId;
                
                try {
                    // Add a small delay to handle Instagram API eventual consistency
                    Thread.sleep(1500);
                    JsonNode postDetails = client.get()
                            .uri(uriBuilder -> uriBuilder
                                    .path("/{postId}")
                                    .queryParam("fields", "permalink,shortcode")
                                    .queryParam("access_token", accessToken)
                                    .build(postId))
                            .retrieve()
                            .bodyToMono(JsonNode.class)
                            .block();
                    if (postDetails != null) {
                        if (postDetails.has("permalink")) {
                            permalink = postDetails.get("permalink").asText();
                        } else if (postDetails.has("shortcode")) {
                            permalink = "https://www.instagram.com/p/" + postDetails.get("shortcode").asText() + "/";
                        }
                    }
                } catch (Exception ex) {
                    log.warn("Failed to fetch permalink/shortcode for Instagram post {}", postId, ex);
                }

                return PublishResult.builder()
                        .post(post)
                        .platformPostId(postId)
                        .platformPostUrl(permalink)
                        .success(true)
                        .build();
            }

            return PublishResult.builder()
                    .post(post).success(false)
                    .errorMessage("Failed to publish Instagram post")
                    .build();

        } catch (Exception e) {
            log.error("Instagram publish failed", e);
            return PublishResult.builder()
                    .post(post).success(false)
                    .errorMessage(e.getMessage())
                    .build();
        }
    }

    private String uploadMedia(WebClient client, Post post, List<PostMedia> media, 
                               String accessToken) {
        if (media == null || media.isEmpty()) {
            // No media, just return null - we'll handle text-only case
            return null;
        }

        try {
            PostMedia first = media.get(0);
            Path filePath = Paths.get(uploadDir).resolve(first.getFilename()).toAbsolutePath();

            if (first.getContentType().startsWith("image/")) {
                // Upload image
                MultipartBodyBuilder builder = new MultipartBodyBuilder();
                builder.part("file", new FileSystemResource(filePath.toFile()));
                builder.part("access_token", accessToken);

                // For testing: return a mock ID (in production, get from API response)
                return UUID.randomUUID().toString();

            } else if (first.getContentType().startsWith("video/")) {
                // Upload video
                MultipartBodyBuilder builder = new MultipartBodyBuilder();
                builder.part("file", new FileSystemResource(filePath.toFile()));
                builder.part("access_token", accessToken);

                return UUID.randomUUID().toString();
            }
        } catch (Exception e) {
            log.warn("Failed to upload Instagram media: {}", e.getMessage());
        }

        return null;
    }

    // ────────────────────────────────────────────────────────────
    // Comment Fetching
    // ────────────────────────────────────────────────────────────

    @Override
    public List<PlatformCommentDto> fetchComments(SocialPage page) {
        List<PlatformCommentDto> results = new ArrayList<>();
        try {
            String userId = page.getPlatformPageId();
            String token = page.getPageAccessToken();

            WebClient client = webClientBuilder.baseUrl("https://graph.instagram.com/v18.0").build();

            // Get recent media posts
            String mediaUrl = String.format(
                    "/%s/media?fields=id,caption,timestamp,media_type&access_token=%s",
                    userId, token
            );

            JsonNode mediaResp = client.get()
                    .uri(mediaUrl)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (mediaResp == null || !mediaResp.has("data")) return results;

            for (JsonNode media : mediaResp.get("data")) {
                String mediaId = media.get("id").asText();
                fetchCommentsForMedia(client, token, mediaId, results);
            }

        } catch (Exception e) {
            log.error("Instagram comment fetch failed for page {}: {}",
                    page.getPageName(), e.getMessage(), e);
        }
        return results;
    }

    private void fetchCommentsForMedia(WebClient client, String token, String mediaId,
                                       List<PlatformCommentDto> results) {
        try {
            String commentsUrl = String.format(
                    "/%s/comments?fields=id,text,username,timestamp,user&access_token=%s",
                    mediaId, token
            );

            JsonNode commentsResp = client.get()
                    .uri(commentsUrl)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (commentsResp == null || !commentsResp.has("data")) return;

            for (JsonNode comment : commentsResp.get("data")) {
                String commentId = comment.get("id").asText();
                String text = comment.has("text") ? comment.get("text").asText() : "";
                String username = comment.has("username") ? comment.get("username").asText() : "Instagram User";
                String timestamp = comment.has("timestamp") ? comment.get("timestamp").asText() : null;

                if (text.isBlank()) continue;

                LocalDateTime createdAt = parseInstagramTimestamp(timestamp);

                results.add(PlatformCommentDto.builder()
                        .platformMessageId(commentId)
                        .platformPostId(mediaId)
                        .content(text)
                        .authorName(username)
                        .authorId(username)
                        .createdAt(createdAt)
                        .build());

                // Fetch replies to this comment (nested comments)
                fetchReplies(client, token, commentId, mediaId, results);
            }

        } catch (WebClientResponseException e) {
            log.warn("Instagram comments fetch failed for media {} (HTTP {}): {}",
                    mediaId, e.getStatusCode(), e.getResponseBodyAsString());
        } catch (Exception e) {
            log.warn("Instagram comments fetch failed for media {}: {}", mediaId, e.getMessage());
        }
    }

    private void fetchReplies(WebClient client, String token, String commentId, String mediaId,
                              List<PlatformCommentDto> results) {
        try {
            String repliesUrl = String.format(
                    "/%s/replies?fields=id,text,username,timestamp&access_token=%s",
                    commentId, token
            );

            JsonNode repliesResp = client.get()
                    .uri(repliesUrl)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (repliesResp == null || !repliesResp.has("data")) return;

            for (JsonNode reply : repliesResp.get("data")) {
                String replyId = reply.get("id").asText();
                String text = reply.has("text") ? reply.get("text").asText() : "";
                String username = reply.has("username") ? reply.get("username").asText() : "Instagram User";
                String timestamp = reply.has("timestamp") ? reply.get("timestamp").asText() : null;

                if (text.isBlank()) continue;

                LocalDateTime createdAt = parseInstagramTimestamp(timestamp);

                results.add(PlatformCommentDto.builder()
                        .platformMessageId(replyId)
                        .platformPostId(mediaId)
                        .parentMessageId(commentId)
                        .content(text)
                        .authorName(username)
                        .authorId(username)
                        .createdAt(createdAt)
                        .build());
            }

        } catch (Exception e) {
            log.warn("Instagram replies fetch failed for comment {}: {}", commentId, e.getMessage());
        }
    }

    // ────────────────────────────────────────────────────────────
    // Direct Messages
    // ────────────────────────────────────────────────────────────

    public List<PlatformCommentDto> fetchDirectMessages(SocialPage page) {
        List<PlatformCommentDto> results = new ArrayList<>();
        try {
            log.info("[IG-DM] Starting DM fetch for page '{}' (id={})",
                    page.getPageName(), page.getPlatformPageId());

            WebClient client = webClientBuilder.baseUrl("https://graph.instagram.com/v18.0").build();
            String userId = page.getPlatformPageId();
            String token = page.getPageAccessToken();

            if (token == null || token.isBlank()) {
                log.error("[IG-DM] ❌ Page access token is NULL or EMPTY for page '{}'", page.getPageName());
                return results;
            }

            // Fetch all conversations for this page
            String conversationsUrl = String.format(
                    "/%s/conversations?fields=id,participants,updated_time&access_token=%s",
                    userId, token
            );

            JsonNode conversationsResp = client.get()
                    .uri(conversationsUrl)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (conversationsResp == null || !conversationsResp.has("data")) {
                log.warn("[IG-DM] ❌ No conversations found");
                return results;
            }

            int convCount = conversationsResp.get("data").size();
            log.info("[IG-DM] ✓ Found {} conversations", convCount);

            for (JsonNode conversation : conversationsResp.get("data")) {
                String conversationId = conversation.get("id").asText();

                // Find the non-page participant
                String senderName = "Instagram User";
                String senderUserId = null;
                if (conversation.has("participants")) {
                    for (JsonNode participant : conversation.get("participants")) {
                        String participantId = participant.asText();
                        if (!participantId.equals(userId)) {
                            senderUserId = participantId;
                            senderName = "Instagram User";
                            break;
                        }
                    }
                }

                // Fetch messages for this conversation
                String messagesUrl = String.format(
                        "/%s/messages?fields=id,message,from,created_time&access_token=%s",
                        conversationId, token
                );

                JsonNode messagesResp = client.get()
                        .uri(messagesUrl)
                        .retrieve()
                        .bodyToMono(JsonNode.class)
                        .block();

                if (messagesResp == null || !messagesResp.has("data")) {
                    log.debug("[IG-DM] Conversation {} has no messages", conversationId);
                    continue;
                }

                int msgCount = messagesResp.get("data").size();
                log.info("[IG-DM]   Conversation {} with '{}': {} messages",
                        conversationId, senderName, msgCount);

                for (JsonNode msgNode : messagesResp.get("data")) {
                    if (!msgNode.has("message")) continue;

                    String msgId = msgNode.get("id").asText();
                    String content = msgNode.get("message").asText();

                    String authorName = senderName;
                    String authorId = senderUserId;

                    if (msgNode.has("from")) {
                        JsonNode from = msgNode.get("from");
                        if (from.has("id") && userId.equals(from.get("id").asText())) {
                            authorName = page.getPageName();
                            authorId = userId;
                        }
                    }

                    String createdTime = msgNode.has("created_time") ? msgNode.get("created_time").asText() : null;
                    LocalDateTime createdAt = createdTime != null ? parseInstagramTimestamp(createdTime) : LocalDateTime.now();

                    log.info("[IG-DM]     ✓ Message: id={}, from='{}', content='{}'",
                            msgId, authorName,
                            content.substring(0, Math.min(40, content.length())));

                    results.add(PlatformCommentDto.builder()
                            .platformMessageId(msgId)
                            .platformPostId(conversationId)
                            .parentMessageId(null)
                            .content(content)
                            .authorName(authorName)
                            .authorId(authorId)
                            .conversationId(conversationId)
                            .messageType(MessageType.DIRECT_MESSAGE)
                            .createdAt(createdAt)
                            .build());
                }
            }

            log.info("[IG-DM] ✓ Fetched {} total DM messages", results.size());
        } catch (Exception e) {
            log.error("Failed to fetch Instagram DMs for page {}: {}", page.getPageName(), e.getMessage(), e);
        }
        return results;
    }

    public void replyToDM(SocialPage page, String conversationId, String message) {
        try {
            String token = page.getPageAccessToken();

            WebClient client = webClientBuilder.baseUrl("https://graph.instagram.com/v18.0").build();

            client.post()
                    .uri("/{conversationId}/messages", conversationId)
                    .bodyValue(Map.of(
                            "message", message,
                            "access_token", token
                    ))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            log.info("Replied to Instagram DM in conversation {}", conversationId);
        } catch (Exception e) {
            log.error("Failed to reply to Instagram DM: {}", e.getMessage(), e);
            throw new RuntimeException("Instagram DM reply failed: " + e.getMessage());
        }
    }

    public void replyToComment(SocialPage page, String commentId, String message) {
        try {
            String token = page.getPageAccessToken();

            WebClient client = webClientBuilder.baseUrl("https://graph.instagram.com/v18.0").build();

            client.post()
                    .uri("/{commentId}/replies", commentId)
                    .bodyValue(Map.of(
                            "text", message,
                            "access_token", token
                    ))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            log.info("Replied to Instagram comment {}", commentId);
        } catch (Exception e) {
            log.error("Failed to reply to Instagram comment: {}", e.getMessage(), e);
            throw new RuntimeException("Instagram comment reply failed: " + e.getMessage());
        }
    }

    // ────────────────────────────────────────────────────────────
    // Helpers
    // ────────────────────────────────────────────────────────────

    private LocalDateTime parseInstagramTimestamp(String timestamp) {
        if (timestamp == null) return LocalDateTime.now();
        try {
            return OffsetDateTime.parse(timestamp).toLocalDateTime();
        } catch (Exception e1) {
            try {
                DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssZ");
                return LocalDateTime.parse(timestamp, fmt);
            } catch (Exception e2) {
                return LocalDateTime.now();
            }
        }
    }
}

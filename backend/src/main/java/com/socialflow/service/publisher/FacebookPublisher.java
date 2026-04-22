package com.socialflow.service.publisher;

import com.fasterxml.jackson.databind.JsonNode;
import com.socialflow.constants.ErrorMessages;
import com.socialflow.model.Post;
import com.socialflow.model.PostMedia;
import com.socialflow.model.PublishResult;
import com.socialflow.model.SocialPage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

import com.socialflow.dto.PlatformCommentDto;
import com.socialflow.model.enums.MessageType;

@Component
@RequiredArgsConstructor
@Slf4j
public class FacebookPublisher implements CommentFetcher {

    private final WebClient.Builder webClientBuilder;

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    public PublishResult publish(Post post, SocialPage page) {
        try {
            WebClient client = webClientBuilder.baseUrl("https://graph.facebook.com/v18.0").build();
            List<PostMedia> media = post.getMediaFiles();

            JsonNode response;

            if (media != null && !media.isEmpty()) {
                PostMedia first = media.get(0);

                if (first.getContentType().startsWith("image/")) {
                    // Two-step: upload unpublished photo → attach to feed post
                    Path imagePath = Paths.get(uploadDir).resolve(first.getFilename()).toAbsolutePath();
                    byte[] imageBytes = java.nio.file.Files.readAllBytes(imagePath);

                    // Step 1: Upload photo as unpublished
                    MultipartBodyBuilder photoBuilder = new MultipartBodyBuilder();
                    photoBuilder.part("source", new FileSystemResource(imagePath.toFile()))
                            .header("Content-Disposition",
                                    "form-data; name=\"source\"; filename=\"" + first.getOriginalName() + "\"");
                    photoBuilder.part("published", "false");
                    photoBuilder.part("access_token", page.getPageAccessToken());

                    JsonNode photoResp = client.post()
                            .uri("/{pageId}/photos", page.getPlatformPageId())
                            .contentType(MediaType.MULTIPART_FORM_DATA)
                            .body(BodyInserters.fromMultipartData(photoBuilder.build()))
                            .exchangeToMono(resp -> {
                                if (resp.statusCode().isError()) {
                                    return resp.bodyToMono(String.class).map(body -> {
                                        log.error("Facebook photo upload error {}: {}", resp.statusCode(), body);
                                        throw new RuntimeException(resp.statusCode() + " " + body);
                                    });
                                }
                                return resp.bodyToMono(JsonNode.class);
                            })
                            .block();

                    if (photoResp != null && photoResp.has("id")) {
                        String photoId = photoResp.get("id").asText();

                        // Step 2: Create feed post with attached photo
                        Map<String, Object> feedBody = new LinkedHashMap<>();
                        feedBody.put("message", post.getContent());
                        feedBody.put("attached_media[0]", "{\"media_fbid\":\"" + photoId + "\"}");
                        feedBody.put("access_token", page.getPageAccessToken());

                        response = client.post()
                                .uri("/{pageId}/feed", page.getPlatformPageId())
                                .bodyValue(feedBody)
                                .retrieve()
                                .bodyToMono(JsonNode.class)
                                .block();
                    } else {
                        log.error("Facebook photo upload failed: {}", photoResp);
                        response = postText(client, post, page);
                    }

                } else if (first.getContentType().startsWith("video/")) {
                    Path videoPath = Paths.get(uploadDir).resolve(first.getFilename());
                    MultipartBodyBuilder builder = new MultipartBodyBuilder();
                    builder.part("source", new FileSystemResource(videoPath.toFile()));
                    builder.part("description", post.getContent());
                    builder.part("access_token", page.getPageAccessToken());

                    response = client.post()
                            .uri("/{pageId}/videos", page.getPlatformPageId())
                            .contentType(MediaType.MULTIPART_FORM_DATA)
                            .body(BodyInserters.fromMultipartData(builder.build()))
                            .retrieve()
                            .bodyToMono(JsonNode.class)
                            .block();
                } else {
                    response = postText(client, post, page);
                }
            } else {
                response = postText(client, post, page);
            }

            if (response != null && response.has("id")) {
                String postId = response.get("id").asText();
                return PublishResult.builder()
                        .post(post)
                        .platformPostId(postId)
                        .platformPostUrl("https://facebook.com/" + postId)
                        .success(true)
                        .build();
            }

            return PublishResult.builder()
                    .post(post).success(false)
                    .errorMessage("No post ID returned from Facebook")
                    .build();

        } catch (Exception e) {
            log.error("Facebook publish failed: {}", e.getMessage(), e);
            return PublishResult.builder()
                    .post(post).success(false)
                    .errorMessage(e.getMessage())
                    .build();
        }
    }

    private JsonNode postText(WebClient client, Post post, SocialPage page) {
        return client.post()
                .uri("/{pageId}/feed", page.getPlatformPageId())
                .bodyValue(Map.of(
                        "message", post.getContent(),
                        "access_token", page.getPageAccessToken()
                ))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();
    }

    @Override
    public List<PlatformCommentDto> fetchComments(SocialPage page) {
        List<PlatformCommentDto> results = new ArrayList<>();
        try {
            WebClient client = webClientBuilder.baseUrl("https://graph.facebook.com/v18.0").build();
            // Use page access token for page-level operations (Graph API v18.0+ requirement)
            String token = page.getPageAccessToken();

            // 1. Fetch recent posts
            JsonNode feedNode = client.get()
                    .uri(uriBuilder -> uriBuilder.path("/{pageId}/feed")
                            .queryParam("access_token", token)
                            .queryParam("limit", 10)
                            .queryParam("fields", "id")
                            .build(page.getPlatformPageId()))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (feedNode != null && feedNode.has("data")) {
                for (JsonNode postNode : feedNode.get("data")) {
                    String postId = postNode.get("id").asText();

                    // 2. Fetch comments for each post
                    String commentsUrl = String.format(
                            "https://graph.facebook.com/v18.0/%s/comments?access_token=%s&fields=%s",
                            postId,
                            token,
                            "id,message,from,created_time,comments%7Bid,message,from,created_time%7D"
                    );
                    JsonNode commentsNode = client.get()
                            .uri(java.net.URI.create(commentsUrl))
                            .retrieve()
                            .bodyToMono(JsonNode.class)
                            .block();

                    log.info("FB Comments raw response for post {}: {}", postId, commentsNode);

                    if (commentsNode != null && commentsNode.has("data")) {
                        for (JsonNode commentNode : commentsNode.get("data")) {
                            parseFbComment(commentNode, postId, null, results);
                        }
                    }
                }
            }
        } catch (org.springframework.web.reactive.function.client.WebClientResponseException e) {
            log.error("Failed to fetch Facebook comments (HTTP {}): {}", e.getStatusCode(), e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            log.error("Failed to fetch Facebook comments: {}", e.getMessage(), e);
        }
        return results;
    }

    private void parseFbComment(JsonNode commentNode, String postId, String parentMessageId, List<PlatformCommentDto> results) {
        if (!commentNode.has("message")) return;

        String messageId = commentNode.get("id").asText();
        String message = commentNode.get("message").asText();

        // Graph API v18.0+ may omit `from` due to privacy changes — use fallback
        String author = "Facebook User";
        String authorId = null;
        if (commentNode.has("from")) {
            JsonNode from = commentNode.get("from");
            if (from.has("name")) author = from.get("name").asText();
            if (from.has("id")) authorId = from.get("id").asText();
        }

        String createdTimeObj = commentNode.get("created_time").asText();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssZ");
        LocalDateTime createdAt = LocalDateTime.parse(createdTimeObj, formatter);

        results.add(PlatformCommentDto.builder()
                .platformMessageId(messageId)
                .platformPostId(postId)
                .parentMessageId(parentMessageId)
                .content(message)
                .authorName(author)
                .authorId(authorId)
                .createdAt(createdAt)
                .build());

        // Parse nested replies
        if (commentNode.has("comments") && commentNode.get("comments").has("data")) {
            for (JsonNode replyNode : commentNode.get("comments").get("data")) {
                parseFbComment(replyNode, postId, messageId, results);
            }
        }
    }

    public List<PlatformCommentDto> fetchDirectMessages(SocialPage page) {
        List<PlatformCommentDto> results = new ArrayList<>();
        try {
            log.info("[FB-DM] Starting DM fetch for page '{}' (id={})",
                    page.getPageName(), page.getPlatformPageId());

            WebClient client = webClientBuilder.baseUrl("https://graph.facebook.com/v18.0").build();
            String token = page.getPageAccessToken();

            if (token == null || token.isBlank()) {
                log.error("[FB-DM] ❌ Page access token is NULL or EMPTY for page '{}'", page.getPageName());
                return results;
            }

            // URL-encode the nested fields syntax: messages{...} → messages%7B...%7D
            String fieldsParam = "id,participants,messages%7Bid,message,from,created_time%7D";
            String url = String.format(
                    "https://graph.facebook.com/v18.0/%s/conversations?fields=%s&access_token=%s",
                    page.getPlatformPageId(),
                    fieldsParam,
                    token
            );

            log.info("[FB-DM] Requesting conversations API for pageId={}", page.getPlatformPageId());

            JsonNode conversationsResp = client.get()
                    .uri(java.net.URI.create(url))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (conversationsResp == null) {
                log.warn("[FB-DM] ❌ Conversations response is NULL");
                return results;
            }

            log.info("[FB-DM] Conversations response: {}",
                    conversationsResp.toString().substring(0,
                            Math.min(500, conversationsResp.toString().length())));

            if (!conversationsResp.has("data")) {
                log.warn("[FB-DM] ❌ No 'data' field in conversations response. " +
                        "Ensure 'pages_messaging' permission is granted. Full response: {}",
                        conversationsResp);
                return results;
            }

            int convCount = conversationsResp.get("data").size();
            log.info("[FB-DM] ✓ Found {} conversations", convCount);

            for (JsonNode conversation : conversationsResp.get("data")) {
                String conversationId = conversation.get("id").asText();

                // Find the non-page participant to use as fallback author and DM recipient
                String senderName = "Facebook User";
                String senderPsid = null;
                if (conversation.has("participants") && conversation.get("participants").has("data")) {
                    for (JsonNode participant : conversation.get("participants").get("data")) {
                        String participantId = participant.get("id").asText();
                        if (!participantId.equals(page.getPlatformPageId())) {
                            senderPsid = participantId;
                            senderName = participant.has("name") ? participant.get("name").asText() : "Facebook User";
                            break;
                        }
                    }
                }

                if (!conversation.has("messages") || !conversation.get("messages").has("data")) {
                    log.debug("[FB-DM] Conversation {} has no messages data", conversationId);
                    continue;
                }

                int msgCount = conversation.get("messages").get("data").size();
                log.info("[FB-DM]   Conversation {} with '{}': {} messages",
                        conversationId, senderName, msgCount);

                for (JsonNode msgNode : conversation.get("messages").get("data")) {
                    if (!msgNode.has("message")) continue;

                    String msgId = msgNode.get("id").asText();
                    String content = msgNode.get("message").asText();

                    String authorName = senderName;
                    String authorId = senderPsid;

                    if (msgNode.has("from")) {
                        JsonNode from = msgNode.get("from");
                        if (from.has("id") && page.getPlatformPageId().equals(from.get("id").asText())) {
                            authorName = page.getPageName();
                            authorId = page.getPlatformPageId();
                        } else {
                            if (from.has("name")) authorName = from.get("name").asText();
                            if (from.has("id")) authorId = from.get("id").asText();
                        }
                    }

                    String createdTime = msgNode.get("created_time").asText();
                    DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssZ");
                    LocalDateTime createdAt = LocalDateTime.parse(createdTime, formatter);

                    log.info("[FB-DM]     ✓ Message: id={}, from='{}', content='{}'",
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

            log.info("[FB-DM] ✓ DONE — Total DMs collected: {}", results.size());

        } catch (org.springframework.web.reactive.function.client.WebClientResponseException e) {
            log.warn("[FB-DM] ❌ HTTP error (status={}): {}. " +
                            "Ensure 'pages_messaging' permission is granted.",
                    e.getStatusCode(), e.getResponseBodyAsString());
        } catch (Exception e) {
            log.error("[FB-DM] ❌ Unexpected error: {}", e.getMessage(), e);
        }
        return results;
    }

    public void replyToDM(SocialPage page, String recipientPsid, String message) {
        try {
            WebClient client = webClientBuilder.baseUrl("https://graph.facebook.com/v18.0").build();
            client.post()
                    .uri(uriBuilder -> uriBuilder
                            .path("/{pageId}/messages")
                            .queryParam("access_token", page.getPageAccessToken())
                            .build(page.getPlatformPageId()))
                    .bodyValue(Map.of(
                            "messaging_type", "RESPONSE",
                            "recipient", Map.of("id", recipientPsid),
                            "message", Map.of("text", message)
                    ))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
            log.info("FB DM sent to PSID {} via page {}", recipientPsid, page.getPageName());
        } catch (org.springframework.web.reactive.function.client.WebClientResponseException e) {
            log.error("Failed to send Facebook DM (HTTP {}): {}", e.getStatusCode(), e.getResponseBodyAsString(), e);
            throw new RuntimeException(ErrorMessages.FB_REPLY_FAILED + e.getResponseBodyAsString());
        } catch (Exception e) {
            log.error("Failed to send Facebook DM: {}", e.getMessage(), e);
            throw new RuntimeException(ErrorMessages.FB_REPLY_FAILED + e.getMessage());
        }
    }

    public void replyToComment(SocialPage page, String commentId, String message) {
        try {
            WebClient client = webClientBuilder.baseUrl("https://graph.facebook.com/v18.0").build();
            client.post()
                    .uri("/{commentId}/comments", commentId)
                    .bodyValue(Map.of(
                            "message", message,
                            "access_token", page.getPageAccessToken()
                    ))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
        } catch (Exception e) {
            log.error("Failed to post Facebook reply: {}", e.getMessage(), e);
            throw new RuntimeException(ErrorMessages.FB_REPLY_FAILED + e.getMessage());
        }
    }
}

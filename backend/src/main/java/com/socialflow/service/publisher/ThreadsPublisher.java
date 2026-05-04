package com.socialflow.service.publisher;

import com.fasterxml.jackson.databind.JsonNode;
import com.socialflow.dto.PlatformCommentDto;
import com.socialflow.model.Post;
import com.socialflow.model.PostMedia;
import com.socialflow.model.PublishResult;
import com.socialflow.model.SocialPage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class ThreadsPublisher implements CommentFetcher {

    private final WebClient.Builder webClientBuilder;

    @Value("${app.base-url:http://localhost:3000}")
    private String baseUrl;

    // ────────────────────────────────────────────────────────────
    // Comment Fetching
    // ────────────────────────────────────────────────────────────

    @Override
    public List<PlatformCommentDto> fetchComments(SocialPage page) {
        List<PlatformCommentDto> results = new ArrayList<>();
        try {
            String token = page.getPageAccessToken();

            List<Post> posts = page.getPosts();
            for (Post post : posts) {
                for (PublishResult pr : post.getPublishResults()) {
                    if (!Boolean.TRUE.equals(pr.getSuccess()) || pr.getPlatformPostId() == null) continue;
                    String mediaId = pr.getPlatformPostId();

                    fetchThreadsReplies(token, mediaId, results);
                }
            }
        } catch (Exception e) {
            log.error("Threads comment fetch failed for page {}: {}",
                    page.getPageName(), e.getMessage(), e);
        }
        return results;
    }

    private void fetchThreadsReplies(String token, String mediaId,
                                     List<PlatformCommentDto> results) {
        try {
            String url = String.format(
                    "https://graph.threads.net/v1.0/%s/replies" +
                    "?fields=id,text,username,timestamp" +
                    "&access_token=%s",
                    mediaId, token
            );

            WebClient client = webClientBuilder.build();
            JsonNode response = client.get()
                    .uri(java.net.URI.create(url))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (response == null || !response.has("data")) return;

            for (JsonNode reply : response.get("data")) {
                String replyId = reply.has("id") ? reply.get("id").asText() : UUID.randomUUID().toString();
                String text = reply.has("text") ? reply.get("text").asText() : "";
                String username = reply.has("username")
                        ? reply.get("username").asText() : "Threads User";
                String timestamp = reply.has("timestamp")
                        ? reply.get("timestamp").asText() : null;

                if (text.isBlank()) continue;

                LocalDateTime createdAt = parseThreadsTimestamp(timestamp);

                results.add(PlatformCommentDto.builder()
                        .platformMessageId(replyId)
                        .platformPostId(mediaId)
                        .content(text)
                        .authorName(username)
                        .authorId(username) // Threads uses username as identifier
                        .createdAt(createdAt)
                        .build());
            }
        } catch (WebClientResponseException e) {
            log.warn("Threads replies fetch failed for post {} (HTTP {}): {}. " +
                            "Ensure threads_read_replies scope is granted.",
                    mediaId, e.getStatusCode(), e.getResponseBodyAsString());
        } catch (Exception e) {
            log.warn("Threads replies fetch failed for post {}: {}",
                    mediaId, e.getMessage());
        }
    }

    private LocalDateTime parseThreadsTimestamp(String timestamp) {
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

    // ────────────────────────────────────────────────────────────
    // Publishing (existing, unchanged)
    // ────────────────────────────────────────────────────────────

    public PublishResult publish(Post post, SocialPage page) {
        try {
            WebClient threads = webClientBuilder
                    .baseUrl("https://graph.threads.net/v1.0")
                    .build();

            String userId = page.getPlatformPageId();
            String accessToken = page.getPageAccessToken();
            List<PostMedia> media = post.getMediaFiles();

            // Determine media type and build container
            Map<String, Object> containerParams = new HashMap<>();
            containerParams.put("access_token", accessToken);
            containerParams.put("text", post.getContent());

            if (media != null && !media.isEmpty()) {
                PostMedia first = media.get(0);
                String mediaUrl = baseUrl + first.getUrl();

                if (first.getContentType().startsWith("image/")) {
                    containerParams.put("media_type", "IMAGE");
                    containerParams.put("image_url", mediaUrl);
                } else if (first.getContentType().startsWith("video/")) {
                    containerParams.put("media_type", "VIDEO");
                    containerParams.put("video_url", mediaUrl);
                } else {
                    containerParams.put("media_type", "TEXT");
                }
            } else {
                containerParams.put("media_type", "TEXT");
            }

            // Step 1: Create media container
            JsonNode containerResp = threads.post()
                    .uri("/{userId}/threads", userId)
                    .bodyValue(containerParams)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (containerResp == null || !containerResp.has("id")) {
                return PublishResult.builder()
                        .post(post).success(false)
                        .errorMessage("Failed to create Threads media container")
                        .build();
            }

            String containerId = containerResp.get("id").asText();

            // Step 2: Publish the container
            JsonNode publishResp = threads.post()
                    .uri("/{userId}/threads_publish", userId)
                    .bodyValue(Map.of(
                            "creation_id", containerId,
                            "access_token", accessToken
                    ))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (publishResp != null && publishResp.has("id")) {
                String postId = publishResp.get("id").asText();
                return PublishResult.builder()
                        .post(post)
                        .platformPostId(postId)
                        .platformPostUrl("https://www.threads.net/@" + page.getPageName() + "/post/" + postId)
                        .success(true)
                        .build();
            }

            return PublishResult.builder()
                    .post(post).success(false)
                    .errorMessage("Failed to publish Threads post")
                    .build();

        } catch (Exception e) {
            log.error("Threads publish failed", e);
            return PublishResult.builder()
                    .post(post).success(false)
                    .errorMessage(e.getMessage())
                    .build();
        }
    }
}


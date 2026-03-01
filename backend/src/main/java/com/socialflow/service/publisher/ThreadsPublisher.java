package com.socialflow.service.publisher;

import com.fasterxml.jackson.databind.JsonNode;
import com.socialflow.model.Post;
import com.socialflow.model.PostMedia;
import com.socialflow.model.PublishResult;
import com.socialflow.model.SocialPage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class ThreadsPublisher {

    private final WebClient.Builder webClientBuilder;

    @Value("${app.base-url:http://localhost:3000}")
    private String baseUrl;

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

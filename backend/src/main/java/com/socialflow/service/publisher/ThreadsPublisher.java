package com.socialflow.service.publisher;

import com.fasterxml.jackson.databind.JsonNode;
import com.socialflow.model.Post;
import com.socialflow.model.PublishResult;
import com.socialflow.model.SocialPage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

/**
 * Threads publisher using Meta Graph API.
 * 
 * Flow (two-step):
 * 1. Create media container: POST /{user-id}/threads with text
 * 2. Publish container: POST /{user-id}/threads_publish with creation_id
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ThreadsPublisher {

    private final WebClient.Builder webClientBuilder;

    public PublishResult publish(Post post, SocialPage page) {
        try {
            WebClient threads = webClientBuilder
                    .baseUrl("https://graph.threads.net/v1.0")
                    .build();

            String userId = page.getPlatformPageId();
            String accessToken = page.getPageAccessToken();

            // Step 1: Create media container
            JsonNode containerResp = threads.post()
                    .uri("/{userId}/threads", userId)
                    .bodyValue(Map.of(
                            "media_type", "TEXT",
                            "text", post.getContent(),
                            "access_token", accessToken
                    ))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (containerResp == null || !containerResp.has("id")) {
                return PublishResult.builder()
                        .post(post)
                        .success(false)
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
                    .post(post)
                    .success(false)
                    .errorMessage("Failed to publish Threads post")
                    .build();

        } catch (Exception e) {
            log.error("Threads publish failed", e);
            return PublishResult.builder()
                    .post(post)
                    .success(false)
                    .errorMessage(e.getMessage())
                    .build();
        }
    }
}

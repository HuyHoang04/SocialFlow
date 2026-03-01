package com.socialflow.service.publisher;

import com.fasterxml.jackson.databind.JsonNode;
import com.socialflow.model.Post;
import com.socialflow.model.PublishResult;
import com.socialflow.model.SocialPage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Instant;
import java.util.Map;

/**
 * Bluesky publisher using AT Protocol.
 * 
 * Flow:
 * 1. Create session with stored appPassword (refreshToken field)
 * 2. POST com.atproto.repo.createRecord with accessJwt
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BlueskyPublisher {

    private final WebClient.Builder webClientBuilder;

    public PublishResult publish(Post post, SocialPage page) {
        try {
            WebClient bsky = webClientBuilder.baseUrl("https://bsky.social/xrpc").build();

            // Re-create session using stored app password
            String appPassword = page.getConnection().getRefreshToken();
            String handle = page.getPageName();

            JsonNode sessionResp = bsky.post()
                    .uri("/com.atproto.server.createSession")
                    .bodyValue(Map.of(
                            "identifier", handle,
                            "password", appPassword
                    ))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            String accessJwt = sessionResp.get("accessJwt").asText();
            String did = sessionResp.get("did").asText();

            // Create post record
            Map<String, Object> record = Map.of(
                    "$type", "app.bsky.feed.post",
                    "text", post.getContent(),
                    "createdAt", Instant.now().toString()
            );

            JsonNode createResp = bsky.post()
                    .uri("/com.atproto.repo.createRecord")
                    .header("Authorization", "Bearer " + accessJwt)
                    .bodyValue(Map.of(
                            "repo", did,
                            "collection", "app.bsky.feed.post",
                            "record", record
                    ))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (createResp != null && createResp.has("uri")) {
                String postUri = createResp.get("uri").asText();
                // Convert AT URI to web URL: at://did/app.bsky.feed.post/rkey → https://bsky.app/profile/handle/post/rkey
                String rkey = postUri.substring(postUri.lastIndexOf('/') + 1);
                String webUrl = "https://bsky.app/profile/" + handle + "/post/" + rkey;

                return PublishResult.builder()
                        .post(post)
                        .platformPostId(postUri)
                        .platformPostUrl(webUrl)
                        .success(true)
                        .build();
            }

            return PublishResult.builder()
                    .post(post)
                    .success(false)
                    .errorMessage("No URI returned from Bluesky")
                    .build();

        } catch (Exception e) {
            log.error("Bluesky publish failed", e);
            return PublishResult.builder()
                    .post(post)
                    .success(false)
                    .errorMessage(e.getMessage())
                    .build();
        }
    }
}

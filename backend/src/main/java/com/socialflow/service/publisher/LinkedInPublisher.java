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

@Component
@RequiredArgsConstructor
@Slf4j
public class LinkedInPublisher {

    private final WebClient.Builder webClientBuilder;

    /**
     * Publish a post to LinkedIn using the Marketing API.
     * POST https://api.linkedin.com/rest/posts
     * Header: Authorization: Bearer {token}, LinkedIn-Version: 202401
     */
    public PublishResult publish(Post post, SocialPage page) {
        try {
            WebClient client = webClientBuilder.baseUrl("https://api.linkedin.com").build();

            Map<String, Object> body = Map.of(
                    "author", "urn:li:organization:" + page.getPlatformPageId(),
                    "commentary", post.getContent(),
                    "visibility", "PUBLIC",
                    "distribution", Map.of(
                            "feedDistribution", "MAIN_FEED",
                            "targetEntities", java.util.List.of(),
                            "thirdPartyDistributionChannels", java.util.List.of()
                    ),
                    "lifecycleState", "PUBLISHED"
            );

            JsonNode response = client.post()
                    .uri("/rest/posts")
                    .header("Authorization", "Bearer " + page.getPageAccessToken())
                    .header("LinkedIn-Version", "202401")
                    .header("Content-Type", "application/json")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            // LinkedIn returns 201 Created with x-restli-id header
            String postUrn = response != null && response.has("id")
                    ? response.get("id").asText()
                    : "unknown";

            return PublishResult.builder()
                    .post(post)
                    .platformPostId(postUrn)
                    .platformPostUrl("https://www.linkedin.com/feed/update/" + postUrn)
                    .success(true)
                    .build();

        } catch (Exception e) {
            log.error("LinkedIn publish failed", e);
            return PublishResult.builder()
                    .post(post)
                    .success(false)
                    .errorMessage(e.getMessage())
                    .build();
        }
    }
}

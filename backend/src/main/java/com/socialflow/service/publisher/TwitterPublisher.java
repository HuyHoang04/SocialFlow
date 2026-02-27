package com.socialflow.service.publisher;

import com.fasterxml.jackson.databind.JsonNode;
import com.socialflow.model.Post;
import com.socialflow.model.PublishResult;
import com.socialflow.model.SocialPage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
@RequiredArgsConstructor
@Slf4j
public class TwitterPublisher {

    private final WebClient.Builder webClientBuilder;

    /**
     * Publish a tweet using X/Twitter API v2.
     * POST https://api.twitter.com/2/tweets
     * Header: Authorization: Bearer {access_token}
     * Body: { "text": "..." }
     */
    public PublishResult publish(Post post, SocialPage page) {
        try {
            WebClient client = webClientBuilder.baseUrl("https://api.twitter.com").build();

            JsonNode response = client.post()
                    .uri("/2/tweets")
                    .header("Authorization", "Bearer " + page.getPageAccessToken())
                    .header("Content-Type", "application/json")
                    .bodyValue(java.util.Map.of("text", post.getContent()))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (response != null && response.has("data") && response.get("data").has("id")) {
                String tweetId = response.get("data").get("id").asText();
                return PublishResult.builder()
                        .post(post)
                        .platformPostId(tweetId)
                        .platformPostUrl("https://x.com/i/web/status/" + tweetId)
                        .success(true)
                        .build();
            }

            return PublishResult.builder()
                    .post(post)
                    .success(false)
                    .errorMessage("No tweet ID returned from X/Twitter")
                    .build();

        } catch (Exception e) {
            log.error("Twitter publish failed", e);
            return PublishResult.builder()
                    .post(post)
                    .success(false)
                    .errorMessage(e.getMessage())
                    .build();
        }
    }
}

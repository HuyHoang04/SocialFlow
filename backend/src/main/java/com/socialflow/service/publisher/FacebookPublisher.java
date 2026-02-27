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
public class FacebookPublisher {

    private final WebClient.Builder webClientBuilder;

    /**
     * Publish a post to a Facebook Page using Graph API.
     * POST https://graph.facebook.com/v18.0/{page-id}/feed
     * Parameters: message, access_token
     */
    public PublishResult publish(Post post, SocialPage page) {
        try {
            WebClient client = webClientBuilder.baseUrl("https://graph.facebook.com/v18.0").build();

            JsonNode response = client.post()
                    .uri("/{pageId}/feed", page.getPlatformPageId())
                    .bodyValue(java.util.Map.of(
                            "message", post.getContent(),
                            "access_token", page.getPageAccessToken()
                    ))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

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
                    .post(post)
                    .success(false)
                    .errorMessage("No post ID returned from Facebook")
                    .build();

        } catch (Exception e) {
            log.error("Facebook publish failed", e);
            return PublishResult.builder()
                    .post(post)
                    .success(false)
                    .errorMessage(e.getMessage())
                    .build();
        }
    }
}

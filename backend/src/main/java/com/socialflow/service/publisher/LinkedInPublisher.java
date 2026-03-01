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

import java.nio.file.*;
import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class LinkedInPublisher {

    private final WebClient.Builder webClientBuilder;

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    public PublishResult publish(Post post, SocialPage page) {
        try {
            WebClient client = webClientBuilder.baseUrl("https://api.linkedin.com").build();
            String token = page.getPageAccessToken();
            String author = "urn:li:person:" + page.getPlatformPageId();
            List<PostMedia> media = post.getMediaFiles();

            Map<String, Object> body;

            if (media != null && !media.isEmpty() && media.get(0).getContentType().startsWith("image/")) {
                // Step 1: Initialize upload
                Map<String, Object> initBody = Map.of(
                        "initializeUploadRequest", Map.of(
                                "owner", author
                        )
                );

                JsonNode initResp = client.post()
                        .uri("/rest/images?action=initializeUpload")
                        .header("Authorization", "Bearer " + token)
                        .header("LinkedIn-Version", "202401")
                        .bodyValue(initBody)
                        .retrieve()
                        .bodyToMono(JsonNode.class)
                        .block();

                String uploadUrl = initResp.get("value").get("uploadUrl").asText();
                String imageUrn = initResp.get("value").get("image").asText();

                // Step 2: Upload binary
                Path filePath = Paths.get(uploadDir).resolve(media.get(0).getFilename());
                byte[] fileBytes = Files.readAllBytes(filePath);

                webClientBuilder.build().put()
                        .uri(uploadUrl)
                        .header("Authorization", "Bearer " + token)
                        .bodyValue(fileBytes)
                        .retrieve()
                        .toBodilessEntity()
                        .block();

                // Step 3: Create post with image
                body = Map.of(
                        "author", author,
                        "commentary", post.getContent(),
                        "visibility", "PUBLIC",
                        "distribution", Map.of(
                                "feedDistribution", "MAIN_FEED",
                                "targetEntities", List.of(),
                                "thirdPartyDistributionChannels", List.of()
                        ),
                        "content", Map.of(
                                "media", Map.of(
                                        "id", imageUrn
                                )
                        ),
                        "lifecycleState", "PUBLISHED"
                );
            } else {
                // Text-only post  
                body = Map.of(
                        "author", author,
                        "commentary", post.getContent(),
                        "visibility", "PUBLIC",
                        "distribution", Map.of(
                                "feedDistribution", "MAIN_FEED",
                                "targetEntities", List.of(),
                                "thirdPartyDistributionChannels", List.of()
                        ),
                        "lifecycleState", "PUBLISHED"
                );
            }

            JsonNode response = client.post()
                    .uri("/rest/posts")
                    .header("Authorization", "Bearer " + token)
                    .header("LinkedIn-Version", "202401")
                    .header("Content-Type", "application/json")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

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
                    .post(post).success(false)
                    .errorMessage(e.getMessage())
                    .build();
        }
    }
}

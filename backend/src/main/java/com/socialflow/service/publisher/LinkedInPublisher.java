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
            // Personal pages store just the sub ID; company pages store the full urn:li:organization:xxx
            String platformId = page.getPlatformPageId();
            String author = platformId.startsWith("urn:") ? platformId : "urn:li:person:" + platformId;
            List<PostMedia> media = post.getMediaFiles();

            Map<String, Object> body;

            if (media != null && !media.isEmpty() && media.get(0).getContentType().startsWith("image/")) {
                // Upload image via Assets API (v2)
                Map<String, Object> registerBody = Map.of(
                        "registerUploadRequest", Map.of(
                                "recipes", List.of("urn:li:digitalmediaRecipe:feedshare-image"),
                                "owner", author,
                                "serviceRelationships", List.of(Map.of(
                                        "relationshipType", "OWNER",
                                        "identifier", "urn:li:userGeneratedContent"
                                ))
                        )
                );

                JsonNode registerResp = client.post()
                        .uri("/v2/assets?action=registerUpload")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Restli-Protocol-Version", "2.0.0")
                        .bodyValue(registerBody)
                        .retrieve()
                        .bodyToMono(JsonNode.class)
                        .block();

                if (registerResp == null) throw new RuntimeException("LinkedIn registerUpload returned null");
                String uploadUrl = registerResp.get("value").get("uploadMechanism")
                        .get("com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest")
                        .get("uploadUrl").asText();
                String assetUrn = registerResp.get("value").get("asset").asText();

                // Upload binary
                Path filePath = Paths.get(uploadDir).resolve(media.get(0).getFilename());
                byte[] fileBytes = Files.readAllBytes(filePath);

                webClientBuilder.build().put()
                        .uri(uploadUrl)
                        .header("Authorization", "Bearer " + token)
                        .bodyValue(fileBytes)
                        .retrieve()
                        .toBodilessEntity()
                        .block();

                // Post with image via ugcPosts
                body = Map.of(
                        "author", author,
                        "lifecycleState", "PUBLISHED",
                        "specificContent", Map.of(
                                "com.linkedin.ugc.ShareContent", Map.of(
                                        "shareCommentary", Map.of("text", post.getContent()),
                                        "shareMediaCategory", "IMAGE",
                                        "media", List.of(Map.of(
                                                "status", "READY",
                                                "media", assetUrn
                                        ))
                                )
                        ),
                        "visibility", Map.of(
                                "com.linkedin.ugc.MemberNetworkVisibility", "PUBLIC"
                        )
                );
            } else {
                // Text-only post via ugcPosts
                body = Map.of(
                        "author", author,
                        "lifecycleState", "PUBLISHED",
                        "specificContent", Map.of(
                                "com.linkedin.ugc.ShareContent", Map.of(
                                        "shareCommentary", Map.of("text", post.getContent()),
                                        "shareMediaCategory", "NONE"
                                )
                        ),
                        "visibility", Map.of(
                                "com.linkedin.ugc.MemberNetworkVisibility", "PUBLIC"
                        )
                );
            }

            JsonNode response = client.post()
                    .uri("/v2/ugcPosts")
                    .header("Authorization", "Bearer " + token)
                    .header("X-Restli-Protocol-Version", "2.0.0")
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

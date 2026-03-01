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
import java.time.Instant;
import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class BlueskyPublisher {

    private final WebClient.Builder webClientBuilder;

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    public PublishResult publish(Post post, SocialPage page) {
        try {
            WebClient bsky = webClientBuilder.baseUrl("https://bsky.social/xrpc").build();

            // Re-create session
            String appPassword = page.getConnection().getRefreshToken();
            String handle = page.getPageName();

            JsonNode sessionResp = bsky.post()
                    .uri("/com.atproto.server.createSession")
                    .bodyValue(Map.of("identifier", handle, "password", appPassword))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            String accessJwt = sessionResp.get("accessJwt").asText();
            String did = sessionResp.get("did").asText();

            List<PostMedia> media = post.getMediaFiles();

            // Build post record
            Map<String, Object> record = new HashMap<>();
            record.put("$type", "app.bsky.feed.post");
            record.put("text", post.getContent());
            record.put("createdAt", Instant.now().toString());

            // Upload images and create embed
            if (media != null && !media.isEmpty()) {
                List<Map<String, Object>> images = new ArrayList<>();

                for (PostMedia m : media) {
                    if (!m.getContentType().startsWith("image/")) continue;

                    Path filePath = Paths.get(uploadDir).resolve(m.getFilename());
                    byte[] fileBytes = Files.readAllBytes(filePath);

                    JsonNode blobResp = bsky.post()
                            .uri("/com.atproto.repo.uploadBlob")
                            .header("Authorization", "Bearer " + accessJwt)
                            .header("Content-Type", m.getContentType())
                            .bodyValue(fileBytes)
                            .retrieve()
                            .bodyToMono(JsonNode.class)
                            .block();

                    if (blobResp != null && blobResp.has("blob")) {
                        // Convert blob response to image entry
                        Map<String, Object> imageEntry = Map.of(
                                "alt", m.getOriginalName() != null ? m.getOriginalName() : "",
                                "image", Map.of(
                                        "$type", "blob",
                                        "ref", Map.of("$link", blobResp.get("blob").get("ref").get("$link").asText()),
                                        "mimeType", blobResp.get("blob").get("mimeType").asText(),
                                        "size", blobResp.get("blob").get("size").asInt()
                                )
                        );
                        images.add(imageEntry);
                    }
                }

                if (!images.isEmpty()) {
                    record.put("embed", Map.of(
                            "$type", "app.bsky.embed.images",
                            "images", images
                    ));
                }
            }

            // Create post
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
                    .post(post).success(false)
                    .errorMessage("No URI returned from Bluesky")
                    .build();

        } catch (Exception e) {
            log.error("Bluesky publish failed", e);
            return PublishResult.builder()
                    .post(post).success(false)
                    .errorMessage(e.getMessage())
                    .build();
        }
    }
}

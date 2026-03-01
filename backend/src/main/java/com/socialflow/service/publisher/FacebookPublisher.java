package com.socialflow.service.publisher;

import com.fasterxml.jackson.databind.JsonNode;
import com.socialflow.model.Post;
import com.socialflow.model.PostMedia;
import com.socialflow.model.PublishResult;
import com.socialflow.model.SocialPage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class FacebookPublisher {

    private final WebClient.Builder webClientBuilder;

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    public PublishResult publish(Post post, SocialPage page) {
        try {
            WebClient client = webClientBuilder.baseUrl("https://graph.facebook.com/v18.0").build();
            List<PostMedia> media = post.getMediaFiles();

            JsonNode response;

            if (media != null && !media.isEmpty()) {
                PostMedia first = media.get(0);

                if (first.getContentType().startsWith("image/")) {
                    // Two-step: upload unpublished photo → attach to feed post
                    Path imagePath = Paths.get(uploadDir).resolve(first.getFilename()).toAbsolutePath();
                    byte[] imageBytes = java.nio.file.Files.readAllBytes(imagePath);

                    // Step 1: Upload photo as unpublished
                    MultipartBodyBuilder photoBuilder = new MultipartBodyBuilder();
                    photoBuilder.part("source", new FileSystemResource(imagePath.toFile()))
                            .header("Content-Disposition",
                                    "form-data; name=\"source\"; filename=\"" + first.getOriginalName() + "\"");
                    photoBuilder.part("published", "false");
                    photoBuilder.part("access_token", page.getPageAccessToken());

                    JsonNode photoResp = client.post()
                            .uri("/{pageId}/photos", page.getPlatformPageId())
                            .contentType(MediaType.MULTIPART_FORM_DATA)
                            .body(BodyInserters.fromMultipartData(photoBuilder.build()))
                            .exchangeToMono(resp -> {
                                if (resp.statusCode().isError()) {
                                    return resp.bodyToMono(String.class).map(body -> {
                                        log.error("Facebook photo upload error {}: {}", resp.statusCode(), body);
                                        throw new RuntimeException(resp.statusCode() + " " + body);
                                    });
                                }
                                return resp.bodyToMono(JsonNode.class);
                            })
                            .block();

                    if (photoResp != null && photoResp.has("id")) {
                        String photoId = photoResp.get("id").asText();

                        // Step 2: Create feed post with attached photo
                        Map<String, Object> feedBody = new LinkedHashMap<>();
                        feedBody.put("message", post.getContent());
                        feedBody.put("attached_media[0]", "{\"media_fbid\":\"" + photoId + "\"}");
                        feedBody.put("access_token", page.getPageAccessToken());

                        response = client.post()
                                .uri("/{pageId}/feed", page.getPlatformPageId())
                                .bodyValue(feedBody)
                                .retrieve()
                                .bodyToMono(JsonNode.class)
                                .block();
                    } else {
                        log.error("Facebook photo upload failed: {}", photoResp);
                        response = postText(client, post, page);
                    }

                } else if (first.getContentType().startsWith("video/")) {
                    Path videoPath = Paths.get(uploadDir).resolve(first.getFilename());
                    MultipartBodyBuilder builder = new MultipartBodyBuilder();
                    builder.part("source", new FileSystemResource(videoPath.toFile()));
                    builder.part("description", post.getContent());
                    builder.part("access_token", page.getPageAccessToken());

                    response = client.post()
                            .uri("/{pageId}/videos", page.getPlatformPageId())
                            .contentType(MediaType.MULTIPART_FORM_DATA)
                            .body(BodyInserters.fromMultipartData(builder.build()))
                            .retrieve()
                            .bodyToMono(JsonNode.class)
                            .block();
                } else {
                    response = postText(client, post, page);
                }
            } else {
                response = postText(client, post, page);
            }

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
                    .post(post).success(false)
                    .errorMessage("No post ID returned from Facebook")
                    .build();

        } catch (Exception e) {
            log.error("Facebook publish failed: {}", e.getMessage(), e);
            return PublishResult.builder()
                    .post(post).success(false)
                    .errorMessage(e.getMessage())
                    .build();
        }
    }

    private JsonNode postText(WebClient client, Post post, SocialPage page) {
        return client.post()
                .uri("/{pageId}/feed", page.getPlatformPageId())
                .bodyValue(Map.of(
                        "message", post.getContent(),
                        "access_token", page.getPageAccessToken()
                ))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();
    }
}

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
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

import com.socialflow.dto.PlatformCommentDto;

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

    public List<PlatformCommentDto> fetchComments(SocialPage page) {
        List<PlatformCommentDto> results = new ArrayList<>();
        try {
            WebClient client = webClientBuilder.baseUrl("https://graph.facebook.com/v18.0").build();
            
            // 1. Fetch recent posts
            JsonNode feedNode = client.get()
                    .uri(uriBuilder -> uriBuilder.path("/{pageId}/feed")
                            .queryParam("access_token", page.getPageAccessToken())
                            .queryParam("limit", 10)
                            .queryParam("fields", "id")
                            .build(page.getPlatformPageId()))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (feedNode != null && feedNode.has("data")) {
                for (JsonNode postNode : feedNode.get("data")) {
                    String postId = postNode.get("id").asText();
                    
                    // 2. Fetch comments for each post
                    String commentsUrl = String.format(
                            "https://graph.facebook.com/v18.0/%s/comments?access_token=%s&fields=%s",
                            postId,
                            page.getPageAccessToken(),
                            "id,message,from,created_time,comments%7Bid,message,from,created_time%7D"
                    );
                    JsonNode commentsNode = client.get()
                            .uri(java.net.URI.create(commentsUrl))
                            .retrieve()
                            .bodyToMono(JsonNode.class)
                            .block();

                    log.info("FB Comments raw response for post {}: {}", postId, commentsNode);

                    if (commentsNode != null && commentsNode.has("data")) {
                        for (JsonNode commentNode : commentsNode.get("data")) {
                            parseFbComment(commentNode, postId, null, results);
                        }
                    }
                }
            }
        } catch (org.springframework.web.reactive.function.client.WebClientResponseException e) {
            log.error("Failed to fetch Facebook comments (HTTP {}): {}", e.getStatusCode(), e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            log.error("Failed to fetch Facebook comments: {}", e.getMessage(), e);
        }
        return results;
    }

    private void parseFbComment(JsonNode commentNode, String postId, String parentMessageId, List<PlatformCommentDto> results) {
        if (!commentNode.has("message") || !commentNode.has("from")) return;

        String messageId = commentNode.get("id").asText();
        String message = commentNode.get("message").asText();
        String author = commentNode.get("from").get("name").asText();
        String createdTimeObj = commentNode.get("created_time").asText();

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssZ");
        LocalDateTime createdAt = LocalDateTime.parse(createdTimeObj, formatter);

        results.add(PlatformCommentDto.builder()
                .platformMessageId(messageId)
                .platformPostId(postId)
                .parentMessageId(parentMessageId)
                .content(message)
                .authorName(author)
                .createdAt(createdAt)
                .build());

        // Parse nested replies
        if (commentNode.has("comments") && commentNode.get("comments").has("data")) {
            for (JsonNode replyNode : commentNode.get("comments").get("data")) {
                parseFbComment(replyNode, postId, messageId, results);
            }
        }
    }

    public void replyToComment(SocialPage page, String commentId, String message) {
        try {
            WebClient client = webClientBuilder.baseUrl("https://graph.facebook.com/v18.0").build();
            client.post()
                    .uri("/{commentId}/comments", commentId)
                    .bodyValue(Map.of(
                            "message", message,
                            "access_token", page.getPageAccessToken()
                    ))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
        } catch (Exception e) {
            log.error("Failed to post Facebook reply: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to reply on Facebook: " + e.getMessage());
        }
    }
}

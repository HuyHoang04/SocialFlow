package com.socialflow.service.publisher;

import com.fasterxml.jackson.databind.JsonNode;
import com.socialflow.dto.PlatformCommentDto;
import com.socialflow.model.Post;
import com.socialflow.model.PostMedia;
import com.socialflow.model.PublishResult;
import com.socialflow.model.SocialPage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class LinkedInPublisher implements CommentFetcher {

    private final WebClient.Builder webClientBuilder;

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    @Value("${features.linkedin.comments-enabled:false}")
    private boolean commentsEnabled;

    // ────────────────────────────────────────────────────────────
    // Comment Fetching (guarded by feature flag)
    // ────────────────────────────────────────────────────────────

    @Override
    public List<PlatformCommentDto> fetchComments(SocialPage page) {
        if (!commentsEnabled) {
            log.info("LinkedIn comment fetching is disabled (feature flag). " +
                    "Set features.linkedin.comments-enabled=true after API product approval. " +
                    "Page: {}", page.getPageName());
            return Collections.emptyList();
        }

        List<PlatformCommentDto> results = new ArrayList<>();
        try {
            WebClient client = webClientBuilder.baseUrl("https://api.linkedin.com").build();
            String token = page.getPageAccessToken();

            List<Post> posts = page.getPosts();
            for (Post post : posts) {
                for (PublishResult pr : post.getPublishResults()) {
                    if (!Boolean.TRUE.equals(pr.getSuccess()) || pr.getPlatformPostId() == null) continue;
                    String postUrn = pr.getPlatformPostId();

                    fetchLinkedInCommentsForPost(client, token, postUrn, results);
                }
            }
        } catch (Exception e) {
            log.error("LinkedIn comment fetch failed for page {}: {}",
                    page.getPageName(), e.getMessage(), e);
        }
        return results;
    }

    private void fetchLinkedInCommentsForPost(WebClient client, String token,
                                              String postUrn, List<PlatformCommentDto> results) {
        try {
            String encodedUrn = java.net.URLEncoder.encode(postUrn, StandardCharsets.UTF_8);
            String url = String.format(
                    "https://api.linkedin.com/v2/socialActions/%s/comments?count=100",
                    encodedUrn
            );

            JsonNode response = client.get()
                    .uri(java.net.URI.create(url))
                    .header("Authorization", "Bearer " + token)
                    .header("X-Restli-Protocol-Version", "2.0.0")
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (response == null || !response.has("elements")) return;

            for (JsonNode comment : response.get("elements")) {
                String commentUrn = comment.has("$URN")
                        ? comment.get("$URN").asText()
                        : UUID.randomUUID().toString();

                String message = "";
                if (comment.has("message") && comment.get("message").has("text")) {
                    message = comment.get("message").get("text").asText();
                }
                if (message.isBlank()) continue;

                String actorUrn = comment.has("actor")
                        ? comment.get("actor").asText() : null;

                long createdMs = comment.has("created")
                        && comment.get("created").has("time")
                        ? comment.get("created").get("time").asLong()
                        : System.currentTimeMillis();

                int likeCount = comment.has("likeCount")
                        ? comment.get("likeCount").asInt() : 0;

                String authorName = actorUrn != null
                        ? resolveLinkedInActorName(client, token, actorUrn)
                        : "LinkedIn User";

                results.add(PlatformCommentDto.builder()
                        .platformMessageId(commentUrn)
                        .platformPostId(postUrn)
                        .content(message)
                        .authorName(authorName)
                        .authorId(actorUrn)
                        .likeCount(likeCount)
                        .createdAt(LocalDateTime.ofInstant(
                                Instant.ofEpochMilli(createdMs), ZoneId.systemDefault()))
                        .build());
            }
        } catch (WebClientResponseException e) {
            log.warn("LinkedIn comments fetch skipped for post {} (HTTP {}): {}",
                    postUrn, e.getStatusCode(), e.getResponseBodyAsString());
        } catch (Exception e) {
            log.warn("LinkedIn comments fetch failed for post {}: {}",
                    postUrn, e.getMessage());
        }
    }

    private String resolveLinkedInActorName(WebClient client, String token, String actorUrn) {
        try {
            // Extract actor ID from URN like "urn:li:person:abc123"
            String actorId = actorUrn.substring(actorUrn.lastIndexOf(':') + 1);
            JsonNode profile = client.get()
                    .uri("/v2/people/(id:{actorId})?projection=(firstName,lastName)", actorId)
                    .header("Authorization", "Bearer " + token)
                    .header("X-Restli-Protocol-Version", "2.0.0")
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (profile != null) {
                String first = "";
                String last = "";
                if (profile.has("firstName") && profile.get("firstName").has("localized")) {
                    first = profile.get("firstName").get("localized").elements().next().asText();
                }
                if (profile.has("lastName") && profile.get("lastName").has("localized")) {
                    last = profile.get("lastName").get("localized").elements().next().asText();
                }
                String fullName = (first + " " + last).trim();
                return fullName.isBlank() ? "LinkedIn User" : fullName;
            }
        } catch (Exception e) {
            log.debug("Could not resolve LinkedIn actor name for {}: {}", actorUrn, e.getMessage());
        }
        return "LinkedIn User";
    }

    // ────────────────────────────────────────────────────────────
    // Publishing (existing, unchanged)
    // ────────────────────────────────────────────────────────────

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
                byte[] fileBytes;
                PostMedia firstMedia = media.get(0);
                if (firstMedia.getUrl() != null && firstMedia.getUrl().startsWith("http")) {
                    fileBytes = new org.springframework.web.client.RestTemplate().getForObject(firstMedia.getUrl(), byte[].class);
                } else {
                    Path filePath = Paths.get(uploadDir).resolve(firstMedia.getFilename());
                    fileBytes = java.nio.file.Files.readAllBytes(filePath);
                }

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


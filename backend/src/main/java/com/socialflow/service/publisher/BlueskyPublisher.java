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

import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.*;

import com.socialflow.model.enums.MessageType;

@Component
@RequiredArgsConstructor
@Slf4j
public class BlueskyPublisher implements CommentFetcher {

    private final WebClient.Builder webClientBuilder;

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    // ────────────────────────────────────────────────────────────
    // Comment Fetching
    // ────────────────────────────────────────────────────────────

    @Override
    public List<PlatformCommentDto> fetchComments(SocialPage page) {
        List<PlatformCommentDto> results = new ArrayList<>();
        try {
            WebClient bsky = webClientBuilder.baseUrl("https://bsky.social/xrpc").build();

            // Re-authenticate (same pattern as publish)
            String appPassword = page.getConnection().getRefreshToken();
            String handle = page.getPageName();

            JsonNode sessionResp = bsky.post()
                    .uri("/com.atproto.server.createSession")
                    .bodyValue(Map.of("identifier", handle, "password", appPassword))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (sessionResp == null || !sessionResp.has("accessJwt")) {
                log.warn("Bluesky session creation failed for page {}", page.getPageName());
                return results;
            }

            String accessJwt = sessionResp.get("accessJwt").asText();
            String myDid = sessionResp.get("did").asText();

            // Get all published posts to find their AT URIs
            List<Post> posts = page.getPosts();
            for (Post post : posts) {
                for (PublishResult pr : post.getPublishResults()) {
                    if (!Boolean.TRUE.equals(pr.getSuccess()) || pr.getPlatformPostId() == null) continue;
                    String postUri = pr.getPlatformPostId(); // at://did:plc:xxx/app.bsky.feed.post/rkey

                    fetchBlueskyThread(bsky, accessJwt, postUri, myDid, results);
                }
            }
        } catch (Exception e) {
            log.error("Bluesky comment fetch failed for page {}: {}",
                    page.getPageName(), e.getMessage(), e);
        }
        return results;
    }

    private void fetchBlueskyThread(WebClient bsky, String accessJwt,
                                    String postUri, String myDid,
                                    List<PlatformCommentDto> results) {
        try {
            String encodedUri = java.net.URLEncoder.encode(postUri, StandardCharsets.UTF_8);
            String url = String.format(
                    "https://bsky.social/xrpc/app.bsky.feed.getPostThread?uri=%s&depth=6",
                    encodedUri
            );

            JsonNode threadResp = bsky.get()
                    .uri(java.net.URI.create(url))
                    .header("Authorization", "Bearer " + accessJwt)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (threadResp != null && threadResp.has("thread")) {
                parseBskyReplies(threadResp.get("thread"), postUri, null, results);
            }
        } catch (Exception e) {
            log.warn("Bluesky thread fetch failed for post {}: {}", postUri, e.getMessage());
        }
    }

    private void parseBskyReplies(JsonNode thread, String rootPostUri,
                                  String parentUri, List<PlatformCommentDto> results) {
        if (!thread.has("replies")) return;

        for (JsonNode replyThread : thread.get("replies")) {
            if (!replyThread.has("post")) continue;
            JsonNode replyPost = replyThread.get("post");

            String replyUri = replyPost.has("uri") ? replyPost.get("uri").asText() : UUID.randomUUID().toString();

            // Extract author info
            String authorDid = null;
            String authorName = "Bluesky User";
            if (replyPost.has("author")) {
                JsonNode author = replyPost.get("author");
                authorDid = author.has("did") ? author.get("did").asText() : null;
                if (author.has("displayName") && !author.get("displayName").asText().isBlank()) {
                    authorName = author.get("displayName").asText();
                } else if (author.has("handle")) {
                    authorName = author.get("handle").asText();
                }
            }

            // Extract text and createdAt from record
            String text = "";
            LocalDateTime createdAt = LocalDateTime.now();
            if (replyPost.has("record")) {
                JsonNode record = replyPost.get("record");
                text = record.has("text") ? record.get("text").asText() : "";
                if (record.has("createdAt")) {
                    createdAt = parseIsoDateTime(record.get("createdAt").asText());
                }
            }

            // Extract like count
            int likeCount = 0;
            if (replyPost.has("likeCount")) {
                likeCount = replyPost.get("likeCount").asInt();
            }

            if (!text.isBlank()) {
                results.add(PlatformCommentDto.builder()
                        .platformMessageId(replyUri)
                        .platformPostId(rootPostUri)
                        .parentMessageId(parentUri)
                        .content(text)
                        .authorName(authorName)
                        .authorId(authorDid)
                        .likeCount(likeCount)
                        .createdAt(createdAt)
                        .build());
            }

            // Recurse into nested replies
            parseBskyReplies(replyThread, rootPostUri, replyUri, results);
        }
    }

    private LocalDateTime parseIsoDateTime(String iso) {
        if (iso == null) return LocalDateTime.now();
        try {
            return OffsetDateTime.parse(iso).toLocalDateTime();
        } catch (Exception e) {
            try {
                return LocalDateTime.parse(iso);
            } catch (Exception e2) {
                return LocalDateTime.now();
            }
        }
    }

    // ────────────────────────────────────────────────────────────
    // Direct Messages
    // ────────────────────────────────────────────────────────────

    public List<PlatformCommentDto> fetchDirectMessages(SocialPage page) {
        List<PlatformCommentDto> results = new ArrayList<>();
        try {
            log.info("[Bluesky-DM] Starting DM fetch for page '{}'", page.getPageName());

            WebClient bsky = webClientBuilder.baseUrl("https://bsky.social/xrpc").build();
            String appPassword = page.getConnection().getRefreshToken();
            String handle = page.getPageName();

            JsonNode sessionResp = bsky.post()
                    .uri("/com.atproto.server.createSession")
                    .bodyValue(Map.of("identifier", handle, "password", appPassword))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (sessionResp == null || !sessionResp.has("accessJwt")) {
                log.warn("[Bluesky-DM] ❌ Session creation failed");
                return results;
            }

            String accessJwt = sessionResp.get("accessJwt").asText();
            String myDid = sessionResp.get("did").asText();

            // Extract PDS URL from didDoc
            String pdsUrl = "https://bsky.social";
            if (sessionResp.has("didDoc") && sessionResp.get("didDoc").has("service")) {
                for (JsonNode svc : sessionResp.get("didDoc").get("service")) {
                    if (svc.has("type") && "AtprotoPersonalDataServer".equals(svc.get("type").asText())) {
                        pdsUrl = svc.get("serviceEndpoint").asText();
                        break;
                    }
                }
            }

            WebClient pdsClient = webClientBuilder.baseUrl(pdsUrl + "/xrpc").build();

            JsonNode convosResp = pdsClient.get()
                    .uri("/chat.bsky.convo.listConvos")
                    .header("Authorization", "Bearer " + accessJwt)
                    .header("atproto-proxy", "did:web:api.bsky.chat#bsky_chat")
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (convosResp == null || !convosResp.has("convos")) {
                log.warn("[Bluesky-DM] ❌ No conversations found");
                return results;
            }

            int convCount = convosResp.get("convos").size();
            log.info("[Bluesky-DM] ✓ Found {} conversations", convCount);

            for (JsonNode convo : convosResp.get("convos")) {
                String convoId = convo.get("id").asText();

                String senderName = "Bluesky User";
                String senderDid = null;
                if (convo.has("members")) {
                    for (JsonNode member : convo.get("members")) {
                        String memberDid = member.get("did").asText();
                        if (!memberDid.equals(myDid)) {
                            senderDid = memberDid;
                            if (member.has("displayName") && !member.get("displayName").asText().isBlank()) {
                                senderName = member.get("displayName").asText();
                            } else if (member.has("handle")) {
                                senderName = member.get("handle").asText();
                            }
                            break;
                        }
                    }
                }

                String messagesUrl = String.format("/chat.bsky.convo.getMessages?convoId=%s", convoId);
                JsonNode messagesResp = pdsClient.get()
                        .uri(messagesUrl)
                        .header("Authorization", "Bearer " + accessJwt)
                        .header("atproto-proxy", "did:web:api.bsky.chat#bsky_chat")
                        .retrieve()
                        .bodyToMono(JsonNode.class)
                        .block();

                if (messagesResp == null || !messagesResp.has("messages")) continue;

                int msgCount = messagesResp.get("messages").size();
                log.info("[Bluesky-DM]   Conversation {} with '{}': {} messages", convoId, senderName, msgCount);

                for (JsonNode msgNode : messagesResp.get("messages")) {
                    String type = msgNode.has("$type") ? msgNode.get("$type").asText() : "";
                    if (!"chat.bsky.convo.defs#messageView".equals(type)) continue;
                    if (!msgNode.has("text")) continue;

                    String msgId = msgNode.get("id").asText();
                    String content = msgNode.get("text").asText();

                    String authorName = senderName;
                    String authorId = senderDid;

                    if (msgNode.has("sender")) {
                        JsonNode sender = msgNode.get("sender");
                        String sDid = sender.has("did") ? sender.get("did").asText() : "";
                        if (myDid.equals(sDid)) {
                            authorName = page.getPageName();
                            authorId = myDid;
                        } else {
                            if (sender.has("displayName") && !sender.get("displayName").asText().isBlank()) {
                                authorName = sender.get("displayName").asText();
                            } else if (sender.has("handle")) {
                                authorName = sender.get("handle").asText();
                            }
                            authorId = sDid;
                        }
                    }

                    String sentAt = msgNode.has("sentAt") ? msgNode.get("sentAt").asText() : null;
                    LocalDateTime createdAt = parseIsoDateTime(sentAt);

                    results.add(PlatformCommentDto.builder()
                            .platformMessageId(msgId)
                            .platformPostId(convoId)
                            .parentMessageId(null)
                            .content(content)
                            .authorName(authorName)
                            .authorId(authorId)
                            .conversationId(convoId)
                            .messageType(MessageType.DIRECT_MESSAGE)
                            .createdAt(createdAt)
                            .build());
                }
            }
            log.info("[Bluesky-DM] ✓ Fetched {} total DM messages", results.size());
        } catch (Exception e) {
            log.error("Failed to fetch Bluesky DMs for page {}: {}", page.getPageName(), e.getMessage(), e);
        }
        return results;
    }

    public void replyToDM(SocialPage page, String conversationId, String message) {
        try {
            WebClient bsky = webClientBuilder.baseUrl("https://bsky.social/xrpc").build();
            String appPassword = page.getConnection().getRefreshToken();
            String handle = page.getPageName();

            JsonNode sessionResp = bsky.post()
                    .uri("/com.atproto.server.createSession")
                    .bodyValue(Map.of("identifier", handle, "password", appPassword))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            String accessJwt = sessionResp.get("accessJwt").asText();

            // Extract PDS URL from didDoc
            String pdsUrl = "https://bsky.social";
            if (sessionResp.has("didDoc") && sessionResp.get("didDoc").has("service")) {
                for (JsonNode svc : sessionResp.get("didDoc").get("service")) {
                    if (svc.has("type") && "AtprotoPersonalDataServer".equals(svc.get("type").asText())) {
                        pdsUrl = svc.get("serviceEndpoint").asText();
                        break;
                    }
                }
            }

            WebClient pdsClient = webClientBuilder.baseUrl(pdsUrl + "/xrpc").build();

            Map<String, Object> body = Map.of(
                    "convoId", conversationId,
                    "message", Map.of("text", message)
            );

            pdsClient.post()
                    .uri("/chat.bsky.convo.sendMessage")
                    .header("Authorization", "Bearer " + accessJwt)
                    .header("atproto-proxy", "did:web:api.bsky.chat#bsky_chat")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            log.info("Replied to Bluesky DM in conversation {}", conversationId);
        } catch (Exception e) {
            log.error("Failed to reply to Bluesky DM: {}", e.getMessage(), e);
            throw new RuntimeException("Bluesky DM reply failed: " + e.getMessage());
        }
    }

    // ────────────────────────────────────────────────────────────
    // Publishing (existing, unchanged)
    // ────────────────────────────────────────────────────────────

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

                    byte[] fileBytes;
                    if (m.getUrl() != null && m.getUrl().startsWith("http")) {
                        fileBytes = new org.springframework.web.client.RestTemplate().getForObject(m.getUrl(), byte[].class);
                    } else {
                        Path filePath = Paths.get(uploadDir).resolve(m.getFilename());
                        fileBytes = java.nio.file.Files.readAllBytes(filePath);
                    }

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


package com.socialflow.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.socialflow.dto.ProfileUpdateRequest;
import com.socialflow.model.SocialPage;
import com.socialflow.model.enums.PlatformType;
import com.socialflow.repository.SocialPageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SocialPageProfileService {

    private final SocialPageRepository pageRepository;
    private final WebClient.Builder webClientBuilder;

    public Map<String, Object> updateProfile(UUID pageId, ProfileUpdateRequest req) {
        SocialPage page = pageRepository.findById(pageId)
                .orElseThrow(() -> new RuntimeException("Page not found: " + pageId));

        PlatformType platform = page.getPlatform();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("platform", platform.name());
        result.put("pageName", page.getPageName());

        switch (platform) {
            case FACEBOOK -> updateFacebook(page, req, result);
            case LINKEDIN -> updateLinkedIn(page, req, result);
            case BLUESKY  -> updateBluesky(page, req, result);
            case TWITTER  -> result.put("note", "Twitter profile update requires OAuth1 user context — use the Twitter app.");
            case THREADS  -> result.put("note", "Threads profile updates are managed through the Instagram Professional Account settings.");
            default       -> result.put("note", "Profile update not supported for " + platform.name());
        }

        return result;
    }

    // ─── Facebook ──────────────────────────────────────────────────────────────

    private void updateFacebook(SocialPage page, ProfileUpdateRequest req, Map<String, Object> result) {
        WebClient client = webClientBuilder.baseUrl("https://graph.facebook.com/v18.0").build();
        String token = page.getPageAccessToken();
        String pageId = page.getPlatformPageId();

        // Update bio / description
        if (req.getBio() != null && !req.getBio().isBlank()) {
            try {
                JsonNode resp = client.post()
                        .uri("/{pageId}", pageId)
                        .bodyValue(Map.of("about", req.getBio(), "access_token", token))
                        .retrieve()
                        .bodyToMono(JsonNode.class)
                        .block();
                result.put("bio", resp != null && resp.path("success").asBoolean() ? "updated" : "failed");
            } catch (Exception e) {
                log.warn("FB bio update failed: {}", e.getMessage());
                result.put("bio", "error: " + e.getMessage());
            }
        }

        // Update cover photo via URL
        if (req.getCoverImageUrl() != null && !req.getCoverImageUrl().isBlank()) {
            try {
                JsonNode resp = client.post()
                        .uri("/{pageId}/photos", pageId)
                        .bodyValue(Map.of(
                                "url", req.getCoverImageUrl(),
                                "type", "page_cover",
                                "published", true,
                                "access_token", token
                        ))
                        .retrieve()
                        .bodyToMono(JsonNode.class)
                        .block();
                result.put("cover", resp != null && resp.has("id") ? "updated" : "failed");
            } catch (Exception e) {
                log.warn("FB cover update failed: {}", e.getMessage());
                result.put("cover", "error: " + e.getMessage());
            }
        }

        // Update profile picture via URL
        if (req.getAvatarUrl() != null && !req.getAvatarUrl().isBlank()) {
            try {
                JsonNode resp = client.post()
                        .uri("/{pageId}/photos", pageId)
                        .bodyValue(Map.of(
                                "url", req.getAvatarUrl(),
                                "type", "profile",
                                "published", true,
                                "access_token", token
                        ))
                        .retrieve()
                        .bodyToMono(JsonNode.class)
                        .block();
                result.put("avatar", resp != null && resp.has("id") ? "updated" : "failed");
            } catch (Exception e) {
                log.warn("FB avatar update failed: {}", e.getMessage());
                result.put("avatar", "error: " + e.getMessage());
            }
        }
    }

    // ─── LinkedIn ──────────────────────────────────────────────────────────────

    private void updateLinkedIn(SocialPage page, ProfileUpdateRequest req, Map<String, Object> result) {
        // LinkedIn Company Page update requires w_organization_social scope
        // Bio update: PATCH /v2/organizations/{id} with localizedDescription
        String token = page.getConnection().getAccessToken();
        String orgId = page.getPlatformPageId(); // LinkedIn organization URN id

        if (req.getBio() != null && !req.getBio().isBlank()) {
            try {
                WebClient client = webClientBuilder.baseUrl("https://api.linkedin.com/v2").build();
                Map<String, Object> body = Map.of(
                        "patch", Map.of("$set", Map.of(
                                "localizedDescription", req.getBio()
                        ))
                );
                client.post()
                        .uri("/organizations/" + orgId)
                        .header("Authorization", "Bearer " + token)
                        .header("X-Restli-Method", "PARTIAL_UPDATE")
                        .contentType(MediaType.APPLICATION_JSON)
                        .bodyValue(body)
                        .retrieve()
                        .bodyToMono(String.class)
                        .block();
                result.put("bio", "updated");
            } catch (Exception e) {
                log.warn("LinkedIn bio update failed: {}", e.getMessage());
                result.put("bio", "error: " + e.getMessage());
            }
        }

        if (req.getCoverImageUrl() != null || req.getAvatarUrl() != null) {
            result.put("note", "LinkedIn cover/avatar upload requires multi-step asset upload — use LinkedIn Campaign Manager for now.");
        }
    }

    // ─── Bluesky ──────────────────────────────────────────────────────────────

    private void updateBluesky(SocialPage page, ProfileUpdateRequest req, Map<String, Object> result) {
        // Bluesky uses AT Protocol. refreshToken field stores the app password.
        // We do a com.atproto.repo.putRecord to update app.bsky.actor.profile
        String handle = page.getPageName();
        String appPassword = page.getConnection().getRefreshToken(); // stored as refreshToken

        try {
            WebClient client = webClientBuilder.baseUrl("https://bsky.social/xrpc").build();

            // Step 1: create session
            JsonNode session = client.post()
                    .uri("/com.atproto.server.createSession")
                    .bodyValue(Map.of("identifier", handle, "password", appPassword))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (session == null || !session.has("accessJwt")) {
                result.put("error", "Bluesky authentication failed");
                return;
            }

            String jwt = session.get("accessJwt").asText();
            String did = session.get("did").asText();

            // Step 2: get current profile record
            JsonNode current = client.get()
                    .uri(u -> u.path("/com.atproto.repo.getRecord")
                            .queryParam("repo", did)
                            .queryParam("collection", "app.bsky.actor.profile")
                            .queryParam("rkey", "self")
                            .build())
                    .header("Authorization", "Bearer " + jwt)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            // Step 3: put updated record
            com.fasterxml.jackson.databind.node.ObjectNode record =
                    (current != null && current.has("value"))
                    ? (com.fasterxml.jackson.databind.node.ObjectNode) current.get("value").deepCopy()
                    : new com.fasterxml.jackson.databind.ObjectMapper().createObjectNode();

            record.put("$type", "app.bsky.actor.profile");
            if (req.getBio() != null && !req.getBio().isBlank()) {
                record.put("description", req.getBio());
            }

            Map<String, Object> putBody = new LinkedHashMap<>();
            putBody.put("repo", did);
            putBody.put("collection", "app.bsky.actor.profile");
            putBody.put("rkey", "self");
            putBody.put("record", record);

            client.post()
                    .uri("/com.atproto.repo.putRecord")
                    .header("Authorization", "Bearer " + jwt)
                    .bodyValue(putBody)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            result.put("bio", "updated");
            if (req.getAvatarUrl() != null || req.getCoverImageUrl() != null) {
                result.put("note", "Bluesky avatar/banner update requires uploading blobs via uploadBlob — not yet supported via URL.");
            }
        } catch (Exception e) {
            log.warn("Bluesky profile update failed: {}", e.getMessage());
            result.put("error", e.getMessage());
        }
    }
}

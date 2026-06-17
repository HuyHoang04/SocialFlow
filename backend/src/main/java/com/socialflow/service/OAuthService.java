package com.socialflow.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.socialflow.constants.ErrorMessages;
import com.socialflow.model.*;
import com.socialflow.model.enums.PlatformType;
import com.socialflow.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class OAuthService {

    private final SocialConnectionRepository connectionRepository;
    private final SocialPageRepository pageRepository;
    private final BrandRepository brandRepository;
    private final AppConfigRepository appConfigRepository;
    private final WebClient.Builder webClientBuilder;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    // Facebook
    @Value("${oauth.facebook.client-id:}")
    private String fbClientId;
    @Value("${oauth.facebook.client-secret:}")
    private String fbClientSecret;
    @Value("${oauth.facebook.redirect-uri:}")
    private String fbRedirectUri;

    // Twitter
    @Value("${oauth.twitter.client-id:}")
    private String twClientId;
    @Value("${oauth.twitter.client-secret:}")
    private String twClientSecret;
    @Value("${oauth.twitter.redirect-uri:}")
    private String twRedirectUri;

    // LinkedIn
    @Value("${oauth.linkedin.client-id:}")
    private String liClientId;
    @Value("${oauth.linkedin.client-secret:}")
    private String liClientSecret;
    @Value("${oauth.linkedin.redirect-uri:}")
    private String liRedirectUri;

    // Threads
    @Value("${oauth.threads.client-id:${oauth.facebook.client-id:}}")
    private String threadsClientId;
    @Value("${oauth.threads.client-secret:${oauth.facebook.client-secret:}}")
    private String threadsClientSecret;
    @Value("${oauth.threads.redirect-uri:${app.base-url}/api/oauth/threads/callback}")
    private String threadsRedirectUri;

    // Instagram (uses Meta OAuth, similar to Facebook)
    @Value("${oauth.instagram.client-id:${oauth.facebook.client-id:}}")
    private String igClientId;
    @Value("${oauth.instagram.client-secret:${oauth.facebook.client-secret:}}")
    private String igClientSecret;
    @Value("${oauth.instagram.redirect-uri:}")
    private String igRedirectUri;

    public String getFrontendUrl() { return frontendUrl; }

    // ==================== Get Credentials with Fallback ====================

    /**
     * Get app ID for platform, checking brand config first, then default config
     */
    public String getClientId(PlatformType platform, UUID brandId) {
        AppConfig config = appConfigRepository.findByBrandIdAndPlatform(brandId, platform).orElse(null);
        if (config != null && config.getAppId() != null && !config.getAppId().isEmpty()) {
            return config.getAppId();
        }
        return switch (platform) {
            case FACEBOOK -> fbClientId;
            case TWITTER -> twClientId;
            case LINKEDIN -> liClientId;
            case THREADS -> threadsClientId;
            case INSTAGRAM -> igClientId;
            default -> "";
        };
    }

    /**
     * Get app secret for platform, checking brand config first, then default config
     */
    private String getClientSecret(PlatformType platform, UUID brandId) {
        AppConfig config = appConfigRepository.findByBrandIdAndPlatform(brandId, platform).orElse(null);
        if (config != null && config.getAppSecret() != null && !config.getAppSecret().isEmpty()) {
            return config.getAppSecret();
        }
        return switch (platform) {
            case FACEBOOK -> fbClientSecret;
            case TWITTER -> twClientSecret;
            case LINKEDIN -> liClientSecret;
            case THREADS -> threadsClientSecret;
            case INSTAGRAM -> igClientSecret;
            default -> "";
        };
    }

    /**
     * Get redirect URI for platform, checking brand config first, then default config
     */
    private String getRedirectUri(PlatformType platform, UUID brandId) {
        AppConfig config = appConfigRepository.findByBrandIdAndPlatform(brandId, platform).orElse(null);
        if (config != null && config.getRedirectUri() != null && !config.getRedirectUri().isEmpty()) {
            return config.getRedirectUri();
        }
        return switch (platform) {
            case FACEBOOK -> fbRedirectUri;
            case TWITTER -> twRedirectUri;
            case LINKEDIN -> liRedirectUri;
            case THREADS -> threadsRedirectUri;
            case INSTAGRAM -> igRedirectUri;
            default -> "";
        };
    }

    // ==================== Get OAuth URL ====================

    public String getOAuthUrl(PlatformType platform, UUID brandId) {
        String state = brandId.toString();
        String clientId = getClientId(platform, brandId);
        String redirectUri = getRedirectUri(platform, brandId);

        if (platform == PlatformType.INSTAGRAM) {
            log.info("[IG OAuth URL] clientId={}, redirectUri={}, encodedRedirectUri={}",
                    clientId, redirectUri, encode(redirectUri));
        }

        return switch (platform) {
            case FACEBOOK -> "https://www.facebook.com/v18.0/dialog/oauth?"
                    + "client_id=" + clientId
                    + "&redirect_uri=" + encode(redirectUri)
                    + "&scope=pages_manage_posts,pages_read_engagement,pages_show_list,pages_messaging"
                    + "&state=" + state
                    + "&response_type=code";
            case TWITTER -> "https://twitter.com/i/oauth2/authorize?"
                    + "response_type=code"
                    + "&client_id=" + clientId
                    + "&redirect_uri=" + encode(redirectUri)
                    + "&scope=tweet.read%20tweet.write%20users.read%20offline.access"
                    + "&state=" + state
                    + "&code_challenge=challenge&code_challenge_method=plain";
            case LINKEDIN -> "https://www.linkedin.com/oauth/v2/authorization?"
                    + "response_type=code"
                    + "&client_id=" + clientId
                    + "&redirect_uri=" + encode(redirectUri)
                    + "&scope=openid%20profile%20email%20w_member_social"
                    + "&state=" + state;
            case THREADS -> "https://www.threads.com/oauth/authorize?"
                    + "client_id=" + clientId
                    + "&redirect_uri=" + encode(redirectUri)
                    + "&scope=threads_basic,threads_content_publish,threads_manage_insights,threads_manage_replies,threads_read_replies"
                    + "&response_type=code"
                    + "&state=" + state;
            case INSTAGRAM -> "https://www.instagram.com/oauth/authorize?"
                    + "client_id=" + clientId
                    + "&redirect_uri=" + encode(redirectUri)
                    + "&scope=instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish,instagram_business_manage_insights"
                    + "&response_type=code"
                    + "&state=" + state;
            case BLUESKY -> "";
        };
    }

    // ==================== Handle Callbacks ====================

    public String handleFacebookCallback(String code, String state) {
        UUID brandId = UUID.fromString(state);
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new RuntimeException(ErrorMessages.BRAND_NOT_FOUND));

        String clientId = getClientId(PlatformType.FACEBOOK, brandId);
        String clientSecret = getClientSecret(PlatformType.FACEBOOK, brandId);
        String redirectUri = getRedirectUri(PlatformType.FACEBOOK, brandId);

        WebClient fb = webClientBuilder.baseUrl("https://graph.facebook.com/v18.0").build();

        JsonNode tokenResp = fb.get()
                .uri(uri -> uri.path("/oauth/access_token")
                        .queryParam("client_id", clientId)
                        .queryParam("client_secret", clientSecret)
                        .queryParam("redirect_uri", redirectUri)
                        .queryParam("code", code)
                        .build())
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();

        String shortLivedToken = tokenResp.get("access_token").asText();

        // Exchange for long-lived token to ensure Page Access Tokens are permanent
        JsonNode longLivedResp = null;
        try {
            longLivedResp = fb.get()
                    .uri(uri -> uri.path("/oauth/access_token")
                            .queryParam("grant_type", "fb_exchange_token")
                            .queryParam("client_id", clientId)
                            .queryParam("client_secret", clientSecret)
                            .queryParam("fb_exchange_token", shortLivedToken)
                            .build())
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
        } catch (Exception e) {
            log.warn("Could not exchange FB short-lived token for long-lived: {}", e.getMessage());
        }

        String userAccessToken = (longLivedResp != null && longLivedResp.has("access_token"))
                ? longLivedResp.get("access_token").asText()
                : shortLivedToken;
        long expiresIn = (longLivedResp != null && longLivedResp.has("expires_in"))
                ? longLivedResp.get("expires_in").asLong()
                : 0;

        upsertFacebookConnection(brand, userAccessToken, expiresIn);

        return frontendUrl + "/accounts?connected=facebook";
    }

    public String handleTwitterCallback(String code, String state) {
        UUID brandId = UUID.fromString(state);
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new RuntimeException(ErrorMessages.BRAND_NOT_FOUND));

        String clientId = getClientId(PlatformType.TWITTER, brandId);
        String clientSecret = getClientSecret(PlatformType.TWITTER, brandId);
        String redirectUri = getRedirectUri(PlatformType.TWITTER, brandId);

        WebClient tw = webClientBuilder.baseUrl("https://api.twitter.com").build();

        JsonNode tokenResp = tw.post()
                .uri("/2/oauth2/token")
                .headers(h -> h.setBasicAuth(clientId, clientSecret))
                .body(BodyInserters.fromFormData("code", code)
                        .with("grant_type", "authorization_code")
                        .with("redirect_uri", redirectUri)
                        .with("code_verifier", "challenge"))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();

        String accessToken = tokenResp.get("access_token").asText();
        String refreshToken = tokenResp.has("refresh_token") ? tokenResp.get("refresh_token").asText() : null;

        JsonNode userResp = tw.get()
                .uri("/2/users/me")
                .header("Authorization", "Bearer " + accessToken)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();

        String username = userResp.get("data").get("username").asText();
        String userId = userResp.get("data").get("id").asText();

        SocialConnection connection = connectionRepository
                .findByBrandIdAndPlatformAndAccountId(brand.getId(), PlatformType.TWITTER, userId)
                .orElse(SocialConnection.builder()
                        .platform(PlatformType.TWITTER)
                        .accountId(userId)
                        .brand(brand)
                        .build());
        connection.setAccountName("@" + username);
        connection.setAccessToken(accessToken);
        connection.setRefreshToken(refreshToken);
        connection.setScopes("tweet.read, tweet.write, users.read");
        long twExpiresIn = tokenResp.has("expires_in") ? tokenResp.get("expires_in").asLong() : 7200;
        connection.setTokenExpiresAt(LocalDateTime.now().plusSeconds(twExpiresIn));
        connection = connectionRepository.save(connection);

        final SocialConnection savedConn = connection;
        SocialPage page = pageRepository
                .findByConnectionIdAndPlatformPageId(savedConn.getId(), userId)
                .orElse(SocialPage.builder()
                        .platformPageId(userId)
                        .platform(PlatformType.TWITTER)
                        .connection(savedConn)
                        .build());
        page.setPageName("@" + username);
        page.setPageAccessToken(accessToken);
        pageRepository.save(page);

        log.info("Twitter upserted: @{} ({})", username, userId);
        return frontendUrl + "/accounts?connected=twitter";
    }

    public String handleLinkedInCallback(String code, String state) {
        UUID brandId = UUID.fromString(state);
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new RuntimeException(ErrorMessages.BRAND_NOT_FOUND));

        String clientId = getClientId(PlatformType.LINKEDIN, brandId);
        String clientSecret = getClientSecret(PlatformType.LINKEDIN, brandId);
        String redirectUri = getRedirectUri(PlatformType.LINKEDIN, brandId);

        WebClient li = webClientBuilder.baseUrl("https://www.linkedin.com").build();

        JsonNode tokenResp = li.post()
                .uri("/oauth/v2/accessToken")
                .body(BodyInserters.fromFormData("grant_type", "authorization_code")
                        .with("code", code)
                        .with("client_id", clientId)
                        .with("client_secret", clientSecret)
                        .with("redirect_uri", redirectUri))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();

        String accessToken = tokenResp.get("access_token").asText();

        WebClient liApi = webClientBuilder.baseUrl("https://api.linkedin.com").build();

        JsonNode userResp = liApi.get()
                .uri("/v2/userinfo")
                .header("Authorization", "Bearer " + accessToken)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();

        String name = userResp.has("name") ? userResp.get("name").asText() : "LinkedIn User";
        String sub = userResp.get("sub").asText();

        SocialConnection connection = connectionRepository
                .findByBrandIdAndPlatformAndAccountId(brand.getId(), PlatformType.LINKEDIN, sub)
                .orElse(SocialConnection.builder()
                        .platform(PlatformType.LINKEDIN)
                        .accountId(sub)
                        .brand(brand)
                        .build());
        connection.setAccountName(name);
        connection.setAccessToken(accessToken);
        connection.setScopes("openid, profile, email, w_member_social");
        long liExpiresIn = tokenResp.has("expires_in") ? tokenResp.get("expires_in").asLong() : 5184000;
        connection.setTokenExpiresAt(LocalDateTime.now().plusSeconds(liExpiresIn));
        connection = connectionRepository.save(connection);

        final SocialConnection savedConn = connection;
        SocialPage personalPage = pageRepository
                .findByConnectionIdAndPlatformPageId(savedConn.getId(), sub)
                .orElse(SocialPage.builder()
                        .platformPageId(sub)
                        .platform(PlatformType.LINKEDIN)
                        .connection(savedConn)
                        .build());
        personalPage.setPageName(name + " (Personal)");
        personalPage.setPageAccessToken(accessToken);
        pageRepository.save(personalPage);

        // Fetch organization pages the user admins (requires w_organization_social)
        try {
            JsonNode orgAcls = liApi.get()
                    .uri("/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&count=10")
                    .header("Authorization", "Bearer " + accessToken)
                    .header("X-Restli-Protocol-Version", "2.0.0")
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (orgAcls != null && orgAcls.has("elements")) {
                for (JsonNode element : orgAcls.get("elements")) {
                    String orgTarget = element.get("organizationTarget").asText();
                    // orgTarget = "urn:li:organization:12345"
                    String orgId = orgTarget.replace("urn:li:organization:", "");

                    JsonNode orgResp = liApi.get()
                            .uri("/v2/organizations/" + orgId + "?projection=(id,localizedName,logoV2)")
                            .header("Authorization", "Bearer " + accessToken)
                            .header("X-Restli-Protocol-Version", "2.0.0")
                            .retrieve()
                            .bodyToMono(JsonNode.class)
                            .block();

                    String orgName = orgResp != null && orgResp.has("localizedName")
                            ? orgResp.get("localizedName").asText() : "Company Page";

                    SocialPage orgPage = pageRepository
                            .findByConnectionIdAndPlatformPageId(savedConn.getId(), orgTarget)
                            .orElse(SocialPage.builder()
                                    .platformPageId(orgTarget)
                                    .platform(PlatformType.LINKEDIN)
                                    .connection(savedConn)
                                    .build());
                    orgPage.setPageName(orgName + " (Company)");
                    orgPage.setPageAccessToken(accessToken);
                    pageRepository.save(orgPage);
                    log.info("LinkedIn org page upserted: {} ({})", orgName, orgTarget);
                }
            }
        } catch (Exception e) {
            log.warn("Could not fetch LinkedIn org pages: {}", e.getMessage());
        }

        log.info("LinkedIn upserted: {} ({})", name, sub);
        return frontendUrl + "/accounts?connected=linkedin";
    }

    public String handleThreadsCallback(String code, String state) {
        UUID brandId = UUID.fromString(state);
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new RuntimeException(ErrorMessages.BRAND_NOT_FOUND));

        String clientId = getClientId(PlatformType.THREADS, brandId);
        String clientSecret = getClientSecret(PlatformType.THREADS, brandId);
        String redirectUri = getRedirectUri(PlatformType.THREADS, brandId);

        WebClient threads = webClientBuilder.baseUrl("https://graph.threads.com").build();

        JsonNode tokenResp = threads.post()
                .uri("/oauth/access_token")
                .body(BodyInserters.fromFormData("client_id", clientId)
                        .with("client_secret", clientSecret)
                        .with("grant_type", "authorization_code")
                        .with("redirect_uri", redirectUri)
                        .with("code", code))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();

        String shortLivedToken = tokenResp.get("access_token").asText();
        String threadsUserId = tokenResp.get("user_id").asText();

        // Exchange for long-lived token
        JsonNode longLivedResp = threads.get()
                .uri(uri -> uri.path("/access_token")
                        .queryParam("grant_type", "th_exchange_token")
                        .queryParam("client_secret", clientSecret)
                        .queryParam("access_token", shortLivedToken)
                        .build())
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();

        String longLivedToken = longLivedResp.get("access_token").asText();

        // Get user profile
        JsonNode profileResp = threads.get()
                .uri(uri -> uri.path("/me")
                        .queryParam("fields", "id,username,name,threads_profile_picture_url")
                        .queryParam("access_token", longLivedToken)
                        .build())
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();

        String username = profileResp.has("username") ? profileResp.get("username").asText() : "threads_user";

        SocialConnection connection = connectionRepository
                .findByBrandIdAndPlatformAndAccountId(brand.getId(), PlatformType.THREADS, threadsUserId)
                .orElse(SocialConnection.builder()
                        .platform(PlatformType.THREADS)
                        .accountId(threadsUserId)
                        .brand(brand)
                        .build());
        connection.setAccountName("@" + username);
        connection.setAccessToken(longLivedToken);
        connection.setScopes("threads_basic, threads_content_publish, threads_manage_insights, threads_manage_replies, threads_read_replies");
        long thExpiresIn = longLivedResp.has("expires_in") ? longLivedResp.get("expires_in").asLong() : 5184000;
        connection.setTokenExpiresAt(LocalDateTime.now().plusSeconds(thExpiresIn));
        connection = connectionRepository.save(connection);

        final SocialConnection savedConn = connection;
        SocialPage page = pageRepository
                .findByConnectionIdAndPlatformPageId(savedConn.getId(), threadsUserId)
                .orElse(SocialPage.builder()
                        .platformPageId(threadsUserId)
                        .platform(PlatformType.THREADS)
                        .connection(savedConn)
                        .build());
        page.setPageName(username);
        page.setPageAccessToken(longLivedToken);
        pageRepository.save(page);

        log.info("Threads upserted: @{} ({})", username, threadsUserId);
        return frontendUrl + "/accounts?connected=threads";
    }

    public String handleInstagramCallback(String code, String state) {
        UUID brandId = UUID.fromString(state);
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new RuntimeException(ErrorMessages.BRAND_NOT_FOUND));

        String clientId = getClientId(PlatformType.INSTAGRAM, brandId);
        String clientSecret = getClientSecret(PlatformType.INSTAGRAM, brandId);
        String redirectUri = getRedirectUri(PlatformType.INSTAGRAM, brandId);

        WebClient igAuth = webClientBuilder.baseUrl("https://api.instagram.com").build();
        WebClient igGraph = webClientBuilder.baseUrl("https://graph.instagram.com").build();

        log.info("Instagram callback - clientId: {}, redirectUri: {}, codeLength: {}",
                clientId, redirectUri, code != null ? code.length() : 0);

        // Build raw form body
        // Auth URL sent redirect_uri encoded → Instagram decoded and stored as raw URI
        // Token exchange must send redirect_uri RAW (not percent-encoded) so Instagram can compare directly
        String rawFormBody = "client_id=" + clientId
                + "&client_secret=" + clientSecret
                + "&grant_type=authorization_code"
                + "&redirect_uri=" + redirectUri
                + "&code=" + code;

        log.info("[IG token exchange] redirect_uri (raw, unencoded): {}", redirectUri);

        // Exchange code for short-lived access token
        JsonNode tokenResp;
        try {
            tokenResp = igAuth.post()
                    .uri("/oauth/access_token")
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .bodyValue(rawFormBody)
                    .exchangeToMono(resp -> {
                        if (resp.statusCode().isError()) {
                            return resp.bodyToMono(String.class).flatMap(body -> {
                                log.error("Instagram token exchange HTTP {}: {}", resp.statusCode(), body);
                                return reactor.core.publisher.Mono.error(
                                        new RuntimeException("Instagram token exchange failed [" + resp.statusCode() + "]: " + body));
                            });
                        }
                        return resp.bodyToMono(JsonNode.class);
                    })
                    .block();
        } catch (Exception e) {
            log.error("Instagram token exchange exception: {}", e.getMessage());
            throw new RuntimeException(e.getMessage());
        }

        if (tokenResp == null || !tokenResp.has("access_token")) {
            log.error("Instagram token exchange failed: {}", tokenResp);
            throw new RuntimeException("Instagram token exchange failed: " + tokenResp);
        }

        String shortLivedToken = tokenResp.get("access_token").asText();
        String instagramUserId = tokenResp.get("user_id").asText();
        log.info("Instagram short-lived token obtained for user: {}", instagramUserId);

        // Exchange short-lived for long-lived token — grant_type = ig_exchange_token
        JsonNode longLivedResp = igGraph.get()
                .uri(uri -> uri.path("/access_token")
                        .queryParam("grant_type", "ig_exchange_token")
                        .queryParam("client_secret", clientSecret)
                        .queryParam("access_token", shortLivedToken)
                        .build())
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();

        String longLivedToken = (longLivedResp != null && longLivedResp.has("access_token"))
                ? longLivedResp.get("access_token").asText()
                : shortLivedToken;

        // Get user profile
        JsonNode profileResp = igGraph.get()
                .uri(uri -> uri.path("/me")
                        .queryParam("fields", "id,username,name,profile_picture_url")
                        .queryParam("access_token", longLivedToken)
                        .build())
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();

        String username = (profileResp != null && profileResp.has("username"))
                ? profileResp.get("username").asText()
                : "instagram_user";

        SocialConnection connection = connectionRepository
                .findByBrandIdAndPlatformAndAccountId(brand.getId(), PlatformType.INSTAGRAM, instagramUserId)
                .orElse(SocialConnection.builder()
                        .platform(PlatformType.INSTAGRAM)
                        .accountId(instagramUserId)
                        .brand(brand)
                        .build());
        connection.setAccountName("@" + username);
        connection.setAccessToken(longLivedToken);
        connection.setScopes("instagram_business_basic, instagram_business_content_publish, instagram_business_manage_messages, instagram_business_manage_comments, instagram_business_manage_insights");
        long igExpiresIn = (longLivedResp != null && longLivedResp.has("expires_in"))
                ? longLivedResp.get("expires_in").asLong()
                : 5184000;
        connection.setTokenExpiresAt(LocalDateTime.now().plusSeconds(igExpiresIn));
        connection = connectionRepository.save(connection);

        final SocialConnection savedConn = connection;
        SocialPage page = pageRepository
                .findByConnectionIdAndPlatformPageId(savedConn.getId(), instagramUserId)
                .orElse(SocialPage.builder()
                        .platformPageId(instagramUserId)
                        .platform(PlatformType.INSTAGRAM)
                        .connection(savedConn)
                        .build());
        page.setPageName("@" + username);
        page.setPageAccessToken(longLivedToken);
        if (profileResp != null && profileResp.has("profile_picture_url")) {
            page.setPageImageUrl(profileResp.get("profile_picture_url").asText());
        }
        pageRepository.save(page);

        log.info("Instagram upserted: @{} ({})", username, instagramUserId);
        return frontendUrl + "/accounts?connected=instagram";
    }

    // ==================== Token Connect (no OAuth redirect) ====================

    public Map<String, Object> handleFacebookToken(String accessToken, UUID brandId) {
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new RuntimeException(ErrorMessages.BRAND_NOT_FOUND));

        // Exchange short-lived JS SDK token for long-lived token (~60 days)
        String longLivedToken = accessToken;
        long expiresIn = 0;
        try {
            WebClient fb = webClientBuilder.baseUrl("https://graph.facebook.com/v18.0").build();
            JsonNode resp = fb.get()
                    .uri(uri -> uri.path("/oauth/access_token")
                            .queryParam("grant_type", "fb_exchange_token")
                            .queryParam("client_id", fbClientId)
                            .queryParam("client_secret", fbClientSecret)
                            .queryParam("fb_exchange_token", accessToken)
                            .build())
                    .retrieve().bodyToMono(JsonNode.class).block();
            if (resp != null && resp.has("access_token")) {
                longLivedToken = resp.get("access_token").asText();
                expiresIn = resp.has("expires_in") ? resp.get("expires_in").asLong() : 5183944;
                log.info("Exchanged FB short-lived token for long-lived token (expires in {}s)", expiresIn);
            }
        } catch (Exception e) {
            log.warn("Could not exchange FB long-lived token: {}", e.getMessage());
        }

        return upsertFacebookConnection(brand, longLivedToken, expiresIn);
    }

    public Map<String, Object> handleBlueskyConnect(String handle, String appPassword, UUID brandId) {
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new RuntimeException(ErrorMessages.BRAND_NOT_FOUND));

        WebClient bsky = webClientBuilder.baseUrl("https://bsky.social/xrpc").build();

        JsonNode sessionResp = bsky.post()
                .uri("/com.atproto.server.createSession")
                .bodyValue(Map.of("identifier", handle, "password", appPassword))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();

        String did = sessionResp.get("did").asText();
        String resolvedHandle = sessionResp.get("handle").asText();
        String accessJwt = sessionResp.get("accessJwt").asText();

        SocialConnection connection = connectionRepository
                .findByBrandIdAndPlatformAndAccountId(brand.getId(), PlatformType.BLUESKY, did)
                .orElse(SocialConnection.builder()
                        .platform(PlatformType.BLUESKY)
                        .accountId(did)
                        .brand(brand)
                        .build());
        connection.setAccountName(resolvedHandle);
        connection.setAccessToken(accessJwt);
        connection.setRefreshToken(appPassword);
        connection.setScopes("atproto (full access)");
        // Bluesky session tokens expire in ~2h but re-created on each publish
        connection = connectionRepository.save(connection);

        final SocialConnection savedConn = connection;
        SocialPage page = pageRepository
                .findByConnectionIdAndPlatformPageId(savedConn.getId(), did)
                .orElse(SocialPage.builder()
                        .platformPageId(did)
                        .platform(PlatformType.BLUESKY)
                        .connection(savedConn)
                        .build());
        page.setPageName(resolvedHandle);
        page.setPageAccessToken(accessJwt);
        pageRepository.save(page);

        log.info("Bluesky upserted: {} ({})", resolvedHandle, did);
        return Map.of("accountName", resolvedHandle, "accountId", did, "pageCount", 1);
    }

    // ==================== Shared Facebook upsert ====================

    private Map<String, Object> upsertFacebookConnection(Brand brand, String accessToken, long expiresIn) {
        WebClient fb = webClientBuilder.baseUrl("https://graph.facebook.com/v18.0").build();

        JsonNode meResp = fb.get()
                .uri(uri -> uri.path("/me").queryParam("access_token", accessToken).build())
                .retrieve().bodyToMono(JsonNode.class).block();

        String accountName = meResp.has("name") ? meResp.get("name").asText() : "Facebook User";
        String accountId = meResp.get("id").asText();

        SocialConnection connection = connectionRepository
                .findByBrandIdAndPlatformAndAccountId(brand.getId(), PlatformType.FACEBOOK, accountId)
                .orElse(SocialConnection.builder()
                        .platform(PlatformType.FACEBOOK).accountId(accountId).brand(brand).build());
        connection.setAccountName(accountName);
        connection.setAccessToken(accessToken);

        // Get granted permissions
        try {
            JsonNode permsResp = fb.get()
                    .uri(uri -> uri.path("/me/permissions").queryParam("access_token", accessToken).build())
                    .retrieve().bodyToMono(JsonNode.class).block();
            if (permsResp != null && permsResp.has("data")) {
                List<String> granted = new ArrayList<>();
                for (JsonNode perm : permsResp.get("data")) {
                    if ("granted".equals(perm.get("status").asText())) {
                        granted.add(perm.get("permission").asText());
                    }
                }
                connection.setScopes(String.join(", ", granted));
            }
        } catch (Exception e) {
            log.warn("Could not fetch FB permissions: {}", e.getMessage());
            connection.setScopes("pages_manage_posts, pages_read_engagement, pages_show_list");
        }

        // Token expiry
        if (expiresIn > 0) {
            connection.setTokenExpiresAt(LocalDateTime.now().plusSeconds(expiresIn));
        } else {
            // Short-lived tokens expire in ~1h, try debug_token
            try {
                JsonNode debugResp = fb.get()
                        .uri(uri -> uri.path("/debug_token")
                                .queryParam("input_token", accessToken)
                                .queryParam("access_token", fbClientId + "|" + fbClientSecret)
                                .build())
                        .exchangeToMono(resp -> {
                            if (resp.statusCode().isError()) {
                                return resp.bodyToMono(String.class).handle((body, sink) -> 
                                    sink.error(new RuntimeException(ErrorMessages.FB_DEBUG_TOKEN_ERROR + body)));
                            }
                            return resp.bodyToMono(JsonNode.class);
                        }).block();
                if (debugResp != null && debugResp.has("data") && debugResp.get("data").has("expires_at")) {
                    long expiresAt = debugResp.get("data").get("expires_at").asLong();
                    if (expiresAt > 0) {
                        connection.setTokenExpiresAt(
                                LocalDateTime.ofEpochSecond(expiresAt, 0, java.time.ZoneOffset.UTC));
                    }
                }
            } catch (Exception e) {
                log.warn("Could not debug FB token: {}", e.getMessage());
                connection.setTokenExpiresAt(LocalDateTime.now().plusHours(1));
            }
        }

        connection = connectionRepository.save(connection);

        int pageCount = 0;
        final SocialConnection savedConn = connection;
        JsonNode pagesResp = fb.get()
                .uri(uri -> uri.path("/me/accounts").queryParam("access_token", accessToken).build())
                .exchangeToMono(resp -> {
                    if (resp.statusCode().isError()) {
                        return resp.bodyToMono(String.class).handle((body, sink) -> 
                            sink.error(new RuntimeException(ErrorMessages.FB_ACCOUNTS_ERROR + body)));
                    }
                    return resp.bodyToMono(JsonNode.class);
                }).block();

        log.info("Facebook /me/accounts raw response: {}", pagesResp);
        if (pagesResp != null && pagesResp.has("data")) {
            log.info("Facebook returned {} pages from /me/accounts", pagesResp.get("data").size());
            for (JsonNode pageNode : pagesResp.get("data")) {
                log.info("  -> Page found: name='{}', id='{}'", 
                    pageNode.has("name") ? pageNode.get("name").asText() : "N/A",
                    pageNode.has("id") ? pageNode.get("id").asText() : "N/A");
                String platformPageId = pageNode.get("id").asText();
                SocialPage socialPage = pageRepository
                        .findByConnectionIdAndPlatformPageId(savedConn.getId(), platformPageId)
                        .orElse(SocialPage.builder()
                                .platformPageId(platformPageId).platform(PlatformType.FACEBOOK)
                                .connection(savedConn).build());
                socialPage.setPageName(pageNode.get("name").asText());
                String pageAccessToken = pageNode.get("access_token").asText();
                socialPage.setPageAccessToken(pageAccessToken);
                pageRepository.save(socialPage);
                pageCount++;

                // Auto-subscribe page to webhook so realtime events are delivered immediately
                try {
                    fb.post()
                        .uri(uri -> uri.path("/" + platformPageId + "/subscribed_apps")
                            .queryParam("subscribed_fields", "messages,messaging_postbacks,feed,mention")
                            .queryParam("access_token", pageAccessToken)
                            .build())
                        .retrieve()
                        .bodyToMono(String.class)
                        .subscribe(result -> log.info("Webhook subscribed for page {}: {}", platformPageId, result),
                                   err -> log.warn("Webhook subscription failed for page {}: {}", platformPageId, err.getMessage()));
                } catch (Exception e) {
                    log.warn("Could not subscribe page {} to webhook: {}", platformPageId, e.getMessage());
                }
            }
        }

        log.info("Facebook upserted: {} ({}) with {} pages", accountName, accountId, pageCount);
        return Map.of("accountName", accountName, "accountId", accountId, "pageCount", pageCount);
    }

    // ==================== Helpers ====================

    public List<SocialConnection> getConnectionsByBrand(UUID brandId) {
        return connectionRepository.findByBrandId(brandId);
    }

    public List<SocialPage> getPagesByConnection(UUID connectionId) {
        return pageRepository.findByConnectionId(connectionId);
    }

    public void deleteConnection(UUID connectionId) {
        connectionRepository.deleteById(connectionId);
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}

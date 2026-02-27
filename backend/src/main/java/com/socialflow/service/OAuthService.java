package com.socialflow.service;

import com.fasterxml.jackson.databind.JsonNode;
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

    // ==================== Get OAuth URL ====================

    public String getOAuthUrl(PlatformType platform, UUID brandId) {
        String state = brandId.toString();
        return switch (platform) {
            case FACEBOOK -> "https://www.facebook.com/v18.0/dialog/oauth?"
                    + "client_id=" + fbClientId
                    + "&redirect_uri=" + encode(fbRedirectUri)
                    + "&scope=pages_manage_posts,pages_read_engagement,pages_show_list"
                    + "&state=" + state
                    + "&response_type=code";
            case TWITTER -> "https://twitter.com/i/oauth2/authorize?"
                    + "response_type=code"
                    + "&client_id=" + twClientId
                    + "&redirect_uri=" + encode(twRedirectUri)
                    + "&scope=tweet.read%20tweet.write%20users.read%20offline.access"
                    + "&state=" + state
                    + "&code_challenge=challenge&code_challenge_method=plain";
            case LINKEDIN -> "https://www.linkedin.com/oauth/v2/authorization?"
                    + "response_type=code"
                    + "&client_id=" + liClientId
                    + "&redirect_uri=" + encode(liRedirectUri)
                    + "&scope=w_member_social%20r_organization_admin%20w_organization_social"
                    + "&state=" + state;
        };
    }

    // ==================== Handle Callbacks ====================

    public String handleFacebookCallback(String code, String state) {
        UUID brandId = UUID.fromString(state);
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new RuntimeException("Brand not found"));

        WebClient fb = webClientBuilder.baseUrl("https://graph.facebook.com/v18.0").build();

        JsonNode tokenResp = fb.get()
                .uri(uri -> uri.path("/oauth/access_token")
                        .queryParam("client_id", fbClientId)
                        .queryParam("client_secret", fbClientSecret)
                        .queryParam("redirect_uri", fbRedirectUri)
                        .queryParam("code", code)
                        .build())
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();

        String userAccessToken = tokenResp.get("access_token").asText();
        upsertFacebookConnection(brand, userAccessToken);

        return frontendUrl + "/accounts?connected=facebook";
    }

    public String handleTwitterCallback(String code, String state) {
        UUID brandId = UUID.fromString(state);
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new RuntimeException("Brand not found"));

        WebClient tw = webClientBuilder.baseUrl("https://api.twitter.com").build();

        JsonNode tokenResp = tw.post()
                .uri("/2/oauth2/token")
                .headers(h -> h.setBasicAuth(twClientId, twClientSecret))
                .body(BodyInserters.fromFormData("code", code)
                        .with("grant_type", "authorization_code")
                        .with("redirect_uri", twRedirectUri)
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

        // Upsert connection
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
        connection = connectionRepository.save(connection);

        // Upsert page
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
                .orElseThrow(() -> new RuntimeException("Brand not found"));

        WebClient li = webClientBuilder.baseUrl("https://www.linkedin.com").build();

        JsonNode tokenResp = li.post()
                .uri("/oauth/v2/accessToken")
                .body(BodyInserters.fromFormData("grant_type", "authorization_code")
                        .with("code", code)
                        .with("client_id", liClientId)
                        .with("client_secret", liClientSecret)
                        .with("redirect_uri", liRedirectUri))
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

        // Upsert connection
        SocialConnection connection = connectionRepository
                .findByBrandIdAndPlatformAndAccountId(brand.getId(), PlatformType.LINKEDIN, sub)
                .orElse(SocialConnection.builder()
                        .platform(PlatformType.LINKEDIN)
                        .accountId(sub)
                        .brand(brand)
                        .build());
        connection.setAccountName(name);
        connection.setAccessToken(accessToken);
        connection = connectionRepository.save(connection);

        // Upsert page
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

        log.info("LinkedIn upserted: {} ({})", name, sub);
        return frontendUrl + "/accounts?connected=linkedin";
    }

    // ==================== Facebook SDK Token Connect ====================

    public Map<String, Object> handleFacebookToken(String accessToken, UUID brandId) {
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new RuntimeException("Brand not found"));
        return upsertFacebookConnection(brand, accessToken);
    }

    // ==================== Shared Facebook upsert logic ====================

    private Map<String, Object> upsertFacebookConnection(Brand brand, String accessToken) {
        WebClient fb = webClientBuilder.baseUrl("https://graph.facebook.com/v18.0").build();

        // Get user info
        JsonNode meResp = fb.get()
                .uri(uri -> uri.path("/me")
                        .queryParam("access_token", accessToken)
                        .build())
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();

        String accountName = meResp.has("name") ? meResp.get("name").asText() : "Facebook User";
        String accountId = meResp.get("id").asText();

        // Upsert connection (find by brand + platform + accountId, or create new)
        SocialConnection connection = connectionRepository
                .findByBrandIdAndPlatformAndAccountId(brand.getId(), PlatformType.FACEBOOK, accountId)
                .orElse(SocialConnection.builder()
                        .platform(PlatformType.FACEBOOK)
                        .accountId(accountId)
                        .brand(brand)
                        .build());

        connection.setAccountName(accountName);
        connection.setAccessToken(accessToken);
        connection = connectionRepository.save(connection);

        // Get pages & upsert each
        int pageCount = 0;
        final SocialConnection savedConn = connection;
        JsonNode pagesResp = fb.get()
                .uri(uri -> uri.path("/me/accounts")
                        .queryParam("access_token", accessToken)
                        .build())
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();

        if (pagesResp != null && pagesResp.has("data")) {
            for (JsonNode pageNode : pagesResp.get("data")) {
                String platformPageId = pageNode.get("id").asText();

                // Upsert page (find by connection + platformPageId, or create new)
                SocialPage socialPage = pageRepository
                        .findByConnectionIdAndPlatformPageId(savedConn.getId(), platformPageId)
                        .orElse(SocialPage.builder()
                                .platformPageId(platformPageId)
                                .platform(PlatformType.FACEBOOK)
                                .connection(savedConn)
                                .build());

                socialPage.setPageName(pageNode.get("name").asText());
                socialPage.setPageAccessToken(pageNode.get("access_token").asText());
                pageRepository.save(socialPage);
                pageCount++;
            }
        }

        log.info("Facebook upserted: {} ({}) with {} pages", accountName, accountId, pageCount);
        return Map.of(
                "accountName", accountName,
                "accountId", accountId,
                "pageCount", pageCount
        );
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

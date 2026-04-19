package com.socialflow.controller;

import com.socialflow.model.enums.PlatformType;
import com.socialflow.service.OAuthService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/oauth")
@RequiredArgsConstructor
public class OAuthController {

    private final OAuthService oauthService;

    @GetMapping("/{platform}/url")
    public Map<String, String> getOAuthUrl(
            @PathVariable String platform,
            @RequestParam UUID brandId) {
        PlatformType type = PlatformType.valueOf(platform.toUpperCase());
        String url = oauthService.getOAuthUrl(type, brandId);
        return Map.of("url", url);
    }

    @GetMapping("/facebook/callback")
    public void facebookCallback(
            @RequestParam String code,
            @RequestParam String state,
            HttpServletResponse response) throws IOException {
        String redirectUrl = oauthService.handleFacebookCallback(code, state);
        response.sendRedirect(redirectUrl);
    }

    @GetMapping("/twitter/callback")
    public void twitterCallback(
            @RequestParam String code,
            @RequestParam String state,
            HttpServletResponse response) throws IOException {
        String redirectUrl = oauthService.handleTwitterCallback(code, state);
        response.sendRedirect(redirectUrl);
    }

    @GetMapping("/linkedin/callback")
    public void linkedinCallback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error,
            @RequestParam(name = "error_description", required = false) String errorDescription,
            HttpServletResponse response) throws IOException {
        if (error != null) {
            String redirectUrl = oauthService.getFrontendUrl() + "/accounts?error=" + error
                    + (errorDescription != null ? "&error_description=" + java.net.URLEncoder.encode(errorDescription, "UTF-8") : "");
            response.sendRedirect(redirectUrl);
            return;
        }
        String redirectUrl = oauthService.handleLinkedInCallback(code, state);
        response.sendRedirect(redirectUrl);
    }

    @GetMapping("/threads/callback")
    public void threadsCallback(
            @RequestParam String code,
            @RequestParam String state,
            HttpServletResponse response) throws IOException {
        String redirectUrl = oauthService.handleThreadsCallback(code, state);
        response.sendRedirect(redirectUrl);
    }

    /** Facebook JS SDK connect */
    @PostMapping("/facebook/connect")
    public org.springframework.http.ResponseEntity<?> facebookConnect(@RequestBody Map<String, Object> body) {
        try {
            String accessToken = (String) body.get("accessToken");
            UUID brandId = UUID.fromString(body.get("brandId").toString());
            return org.springframework.http.ResponseEntity.ok(oauthService.handleFacebookToken(accessToken, brandId));
        } catch (Exception e) {
            return org.springframework.http.ResponseEntity.badRequest().body(Map.of("error", e.getMessage() != null ? e.getMessage() : e.toString()));
        }
    }

    /** Bluesky connect — handle + app password, no OAuth */
    @PostMapping("/bluesky/connect")
    public Map<String, Object> blueskyConnect(@RequestBody Map<String, Object> body) {
        String handle = (String) body.get("handle");
        String appPassword = (String) body.get("appPassword");
        UUID brandId = UUID.fromString(body.get("brandId").toString());
        return oauthService.handleBlueskyConnect(handle, appPassword, brandId);
    }
}

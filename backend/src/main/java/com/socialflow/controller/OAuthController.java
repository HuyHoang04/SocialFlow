package com.socialflow.controller;

import com.socialflow.model.enums.PlatformType;
import com.socialflow.service.OAuthService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/oauth")
@RequiredArgsConstructor
@Slf4j
public class OAuthController {

    private final OAuthService oauthService;

    @GetMapping("/{platform}/url")
    public Map<String, String> getOAuthUrl(
            @PathVariable String platform,
            @RequestParam UUID brandId) {
        PlatformType type = PlatformType.valueOf(platform.toUpperCase());
        String url = oauthService.getOAuthUrl(type, brandId);
        String clientId = oauthService.getClientId(type, brandId);
        return Map.of("url", url, "clientId", clientId);
    }

    /**
     * Helper: Return HTML response that closes popup and updates parent window
     */
    private void sendClosePopupResponse(HttpServletResponse response, String query) throws IOException {
        response.setContentType("text/html; charset=UTF-8");
        String html = "<!DOCTYPE html>" +
                "<html>" +
                "<head><meta charset='UTF-8'><title>Authenticating...</title></head>" +
                "<body style='background:#f5f5f5;display:flex;align-items:center;justify-content:center;height:100vh;margin:0'>" +
                "<div style='text-align:center'>" +
                "<h2>Authentication successful!</h2>" +
                "<p>Closing window...</p>" +
                "</div>" +
                "<script>" +
                "setTimeout(() => {" +
                "  try {" +
                "    if (window.opener) {" +
                "      window.opener.postMessage({ type: 'oauth_success', query: '" + query + "' }, '*');" +
                "    }" +
                "  } catch (e) { }" +
                "  try { window.close(); } catch (e) { }" +
                "}, 800);" +
                "</script>" +
                "</body></html>";
        response.getWriter().write(html);
    }

    private void sendErrorPopupResponse(HttpServletResponse response, String errorMsg) throws IOException {
        response.setContentType("text/html; charset=UTF-8");
        String safeMsg = errorMsg != null ? errorMsg.replace("'", "\\'").replace("<", "&lt;").replace(">", "&gt;") : "Unknown error";
        String html = "<!DOCTYPE html>" +
                "<html>" +
                "<head><meta charset='UTF-8'><title>Auth Error</title></head>" +
                "<body style='background:#fff0f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif'>" +
                "<div style='text-align:center;max-width:600px;padding:20px'>" +
                "<h2 style='color:#e53e3e'>Authentication Failed</h2>" +
                "<p style='color:#666;font-size:13px;word-break:break-all'>" + safeMsg + "</p>" +
                "<button onclick='window.close()' style='margin-top:16px;padding:8px 24px;background:#e53e3e;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px'>Close</button>" +
                "</div>" +
                "<script>" +
                "try { if (window.opener) window.opener.postMessage({ type: 'oauth_error', message: '" + safeMsg + "' }, '*'); } catch(e){}" +
                "</script>" +
                "</body></html>";
        response.getWriter().write(html);
    }

    @GetMapping("/facebook/callback")
    public void facebookCallback(
            @RequestParam String code,
            @RequestParam String state,
            HttpServletResponse response) throws IOException {
        String redirectUrl = oauthService.handleFacebookCallback(code, state);
        sendClosePopupResponse(response, "connected=facebook");
    }

    @GetMapping("/twitter/callback")
    public void twitterCallback(
            @RequestParam String code,
            @RequestParam String state,
            HttpServletResponse response) throws IOException {
        String redirectUrl = oauthService.handleTwitterCallback(code, state);
        sendClosePopupResponse(response, "connected=twitter");
    }

    @GetMapping("/linkedin/callback")
    public void linkedinCallback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error,
            @RequestParam(name = "error_description", required = false) String errorDescription,
            HttpServletResponse response) throws IOException {
        if (error != null) {
            sendClosePopupResponse(response, "error=" + error +
                    (errorDescription != null ? "&error_description=" + java.net.URLEncoder.encode(errorDescription, "UTF-8") : ""));
            return;
        }
        String redirectUrl = oauthService.handleLinkedInCallback(code, state);
        sendClosePopupResponse(response, "connected=linkedin");
    }

    @GetMapping("/threads/callback")
    public void threadsCallback(
            @RequestParam String code,
            @RequestParam String state,
            HttpServletResponse response) throws IOException {
        String redirectUrl = oauthService.handleThreadsCallback(code, state);
        sendClosePopupResponse(response, "connected=threads");
    }

    @GetMapping("/instagram/callback")
    public void instagramCallback(
            @RequestParam String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error,
            @RequestParam(name = "error_description", required = false) String errorDescription,
            HttpServletResponse response) throws IOException {
        if (error != null) {
            log.error("Instagram OAuth error from redirect: {} - {}", error, errorDescription);
            sendErrorPopupResponse(response, "Instagram auth error: " + error + " - " + errorDescription);
            return;
        }
        try {
            oauthService.handleInstagramCallback(code, state);
            sendClosePopupResponse(response, "connected=instagram");
        } catch (Exception e) {
            log.error("Instagram callback failed: {}", e.getMessage());
            sendErrorPopupResponse(response, e.getMessage());
        }
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

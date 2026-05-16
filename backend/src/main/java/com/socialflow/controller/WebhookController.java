package com.socialflow.controller;

import com.socialflow.constants.ErrorMessages;
import com.socialflow.service.WebhookEventService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * Webhook verification & event receivers for Facebook and LinkedIn.
 */
@RestController
@RequestMapping("/api/webhook")
@RequiredArgsConstructor
@Slf4j
public class WebhookController {

    @Value("${webhook.verify-token:socialflow_webhook_verify_2026}")
    private String verifyToken;

    @Value("${oauth.facebook.client-secret:}")
    private String facebookAppSecret;

    @Value("${oauth.linkedin.client-secret:}")
    private String linkedinClientSecret;

    @Value("${oauth.instagram.app-secret:}")
    private String instagramAppSecret;

    @Value("${webhook.instagram.verify-token:socialflow_instagram_verify_2026}")
    private String instagramVerifyToken;

    @Value("${oauth.threads.app-secret:}")
    private String threadsAppSecret;

    @Value("${webhook.threads.verify-token:socialflow_threads_verify_2026}")
    private String threadsVerifyToken;

    private final WebhookEventService webhookEventService;

    // ==================== FACEBOOK ====================

    /**
     * Facebook Webhook Verification (GET)
     * Facebook sends: GET ?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=CHALLENGE
     * We return hub.challenge if verify_token matches.
     */
    @GetMapping("/facebook")
    public ResponseEntity<String> verifyFacebookWebhook(
            @RequestParam("hub.mode") String mode,
            @RequestParam("hub.verify_token") String token,
            @RequestParam("hub.challenge") String challenge) {

        log.info("Facebook webhook verification: mode={}, token={}", mode, token);

        if ("subscribe".equals(mode) && verifyToken.equals(token)) {
            log.info("Facebook webhook verified successfully!");
            return ResponseEntity.ok(challenge);
        }

        log.warn("Facebook webhook verification failed! Expected: {}, got: {}", verifyToken, token);
        return ResponseEntity.status(403).body(ErrorMessages.WEBHOOK_VERIFICATION_FAILED);
    }

    /**
     * Facebook Webhook Events (POST)
     * Verifies X-Hub-Signature-256 then delegates to WebhookEventService.
     */
    @PostMapping("/facebook")
    public ResponseEntity<String> handleFacebookEvent(
            @RequestBody String payload,
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String signature) {

        log.info("[Webhook] Facebook event received, payload size={} bytes", payload.length());

        // Verify HMAC-SHA256 signature if secret is configured
        if (facebookAppSecret != null && !facebookAppSecret.isBlank() && signature != null) {
            try {
                String expected = "sha256=" + hmacSha256(payload, facebookAppSecret);
                if (!expected.equals(signature)) {
                    log.warn("[Webhook] Invalid Facebook signature! Expected={}", expected);
                    return ResponseEntity.status(403).body("Invalid signature");
                }
            } catch (Exception e) {
                log.error("[Webhook] Signature verification failed", e);
            }
        }

        // Process asynchronously to return 200 to Facebook immediately
        // (Facebook retries if we don't respond within 20 seconds)
        try {
            webhookEventService.processFacebookPayload(payload);
        } catch (Exception e) {
            log.error("[Webhook] Error processing Facebook payload", e);
        }

        return ResponseEntity.ok("EVENT_RECEIVED");
    }

    // ==================== LINKEDIN ====================

    /**
     * LinkedIn Webhook Verification (GET)
     * 
     * LinkedIn sends: GET ?challengeCode=RANDOM_UUID
     * We must return JSON: { "challengeCode": "...", "challengeResponse": "HMAC-SHA256(challengeCode, clientSecret)" }
     * Response must come within 3 seconds.
     * 
     * LinkedIn re-validates every 2 hours. 3 consecutive failures = blocked.
     */
    @GetMapping("/linkedin")
    public ResponseEntity<Map<String, String>> verifyLinkedInWebhook(
            @RequestParam("challengeCode") String challengeCode) {

        log.info("LinkedIn webhook verification: challengeCode={}", challengeCode);

        try {
            String challengeResponse = hmacSha256(challengeCode, linkedinClientSecret);

            log.info("LinkedIn webhook verified! challengeResponse={}", challengeResponse);

            return ResponseEntity.ok(Map.of(
                    "challengeCode", challengeCode,
                    "challengeResponse", challengeResponse
            ));
        } catch (Exception e) {
            log.error("LinkedIn webhook verification failed", e);
            return ResponseEntity.status(500).body(Map.of("error", ErrorMessages.WEBHOOK_VERIFICATION_FAILED));
        }
    }

    /**
     * LinkedIn Webhook Events (POST)
     * 
     * LinkedIn sends events with X-LI-Signature header (HMAC-SHA256 of body using clientSecret).
     * We should verify the signature for security.
     */
    @PostMapping("/linkedin")
    public ResponseEntity<String> handleLinkedInEvent(
            @RequestBody String payload,
            @RequestHeader(value = "X-LI-Signature", required = false) String signature) {

        log.info("LinkedIn webhook event received: {}", payload);

        // Verify signature if present
        if (signature != null && !signature.isEmpty()) {
            try {
                String expectedSig = "hmac-sha256=" + hmacSha256(payload, linkedinClientSecret);
                if (!expectedSig.equals(signature)) {
                    log.warn("LinkedIn webhook signature mismatch! Expected: {}, Got: {}", expectedSig, signature);
                    return ResponseEntity.status(403).body(ErrorMessages.WEBHOOK_INVALID_SIGNATURE);
                }
                log.info("LinkedIn webhook signature verified");
            } catch (Exception e) {
                log.error("LinkedIn signature verification failed", e);
            }
        }

        // TODO: Process LinkedIn webhook events (shares, comments, etc.)
        return ResponseEntity.ok("EVENT_RECEIVED");
    }

    // ==================== META (Instagram/Threads) ====================

    /**
     * Instagram Webhook Verification (GET)
     * Meta sends: GET ?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=CHALLENGE
     * We return hub.challenge if verify_token matches.
     */
    @GetMapping("/instagram")
    public ResponseEntity<String> verifyInstagramWebhook(
            @RequestParam("hub.mode") String mode,
            @RequestParam("hub.verify_token") String token,
            @RequestParam("hub.challenge") String challenge) {

        log.info("[Webhook-IG] Instagram webhook verification: mode={}, token={}", mode, token);

        if ("subscribe".equals(mode) && instagramVerifyToken.equals(token)) {
            log.info("[Webhook-IG] ✓ Instagram webhook verified successfully!");
            return ResponseEntity.ok(challenge);
        }

        log.warn("[Webhook-IG] ❌ Instagram webhook verification failed! Expected: {}, got: {}", instagramVerifyToken, token);
        return ResponseEntity.status(403).body(ErrorMessages.WEBHOOK_VERIFICATION_FAILED);
    }

    /**
     * Instagram Webhook Events (POST)
     * Verifies X-Hub-Signature-256 then delegates to WebhookEventService.
     */
    @PostMapping("/instagram")
    public ResponseEntity<String> handleInstagramEvent(
            @RequestBody String payload,
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String signature) {

        log.info("[Webhook-IG] Instagram event received, payload size={} bytes", payload.length());

        // Verify HMAC-SHA256 signature if secret is configured
        if (instagramAppSecret != null && !instagramAppSecret.isBlank() && signature != null) {
            try {
                String expected = "sha256=" + hmacSha256(payload, instagramAppSecret);
                if (!expected.equals(signature)) {
                    log.warn("[Webhook-IG] ❌ Invalid Instagram signature! Expected={}", expected);
                    return ResponseEntity.status(403).body("Invalid signature");
                }
                log.info("[Webhook-IG] ✓ Instagram signature verified");
            } catch (Exception e) {
                log.error("[Webhook-IG] Signature verification failed", e);
            }
        }

        // Process asynchronously
        try {
            webhookEventService.processInstagramPayload(payload);
        } catch (Exception e) {
            log.error("[Webhook-IG] Error processing Instagram payload", e);
        }

        return ResponseEntity.ok("EVENT_RECEIVED");
    }

    /**
     * Threads Webhook Verification (GET)
     * Meta sends: GET ?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=CHALLENGE
     * We return hub.challenge if verify_token matches.
     */
    @GetMapping("/threads")
    public ResponseEntity<String> verifyThreadsWebhook(
            @RequestParam("hub.mode") String mode,
            @RequestParam("hub.verify_token") String token,
            @RequestParam("hub.challenge") String challenge) {

        log.info("[Webhook-Threads] Threads webhook verification: mode={}, token={}", mode, token);

        if ("subscribe".equals(mode) && threadsVerifyToken.equals(token)) {
            log.info("[Webhook-Threads] ✓ Threads webhook verified successfully!");
            return ResponseEntity.ok(challenge);
        }

        log.warn("[Webhook-Threads] ❌ Threads webhook verification failed! Expected: {}, got: {}", threadsVerifyToken, token);
        return ResponseEntity.status(403).body(ErrorMessages.WEBHOOK_VERIFICATION_FAILED);
    }

    /**
     * Threads Webhook Events (POST)
     * Verifies X-Hub-Signature-256 then delegates to WebhookEventService.
     */
    @PostMapping("/threads")
    public ResponseEntity<String> handleThreadsEvent(
            @RequestBody String payload,
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String signature) {

        log.info("[Webhook-Threads] Threads event received, payload size={} bytes", payload.length());

        // Verify HMAC-SHA256 signature if secret is configured
        if (threadsAppSecret != null && !threadsAppSecret.isBlank() && signature != null) {
            try {
                String expected = "sha256=" + hmacSha256(payload, threadsAppSecret);
                if (!expected.equals(signature)) {
                    log.warn("[Webhook-Threads] ❌ Invalid Threads signature! Expected={}", expected);
                    return ResponseEntity.status(403).body("Invalid signature");
                }
                log.info("[Webhook-Threads] ✓ Threads signature verified");
            } catch (Exception e) {
                log.error("[Webhook-Threads] Signature verification failed", e);
            }
        }

        // Process asynchronously
        try {
            webhookEventService.processThreadsPayload(payload);
        } catch (Exception e) {
            log.error("[Webhook-Threads] Error processing Threads payload", e);
        }

        return ResponseEntity.ok("EVENT_RECEIVED");
    }

    // ==================== HELPERS ====================

    /**
     * Compute Hex-encoded HMAC-SHA256.
     * Used by LinkedIn webhook verification: HMAC-SHA256(challengeCode, clientSecret)
     */
    private String hmacSha256(String data, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec keySpec = new SecretKeySpec(
                secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(keySpec);
        byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));

        // Convert to hex string
        StringBuilder hexString = new StringBuilder();
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }
}

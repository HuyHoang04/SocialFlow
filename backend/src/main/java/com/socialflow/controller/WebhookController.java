package com.socialflow.controller;

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
@Slf4j
public class WebhookController {

    @Value("${webhook.verify-token:socialflow_webhook_verify_2026}")
    private String verifyToken;

    @Value("${oauth.linkedin.client-secret:}")
    private String linkedinClientSecret;

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
        return ResponseEntity.status(403).body("Verification failed");
    }

    /**
     * Facebook Webhook Events (POST)
     */
    @PostMapping("/facebook")
    public ResponseEntity<String> handleFacebookEvent(@RequestBody String payload) {
        log.info("Facebook webhook event received: {}", payload);
        // TODO: Process webhook events
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
            return ResponseEntity.status(500).body(Map.of("error", "Verification failed"));
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
                    return ResponseEntity.status(403).body("Invalid signature");
                }
                log.info("LinkedIn webhook signature verified");
            } catch (Exception e) {
                log.error("LinkedIn signature verification failed", e);
            }
        }

        // TODO: Process LinkedIn webhook events (shares, comments, etc.)
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

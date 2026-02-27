package com.socialflow.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Facebook Webhook verification & event receiver.
 * 
 * Facebook sends a GET request with hub.mode, hub.verify_token, hub.challenge
 * to verify the webhook URL. We must respond with hub.challenge if verify_token matches.
 * 
 * POST requests are sent when events occur (page posts, messages, etc.)
 */
@RestController
@RequestMapping("/api/webhook")
@Slf4j
public class WebhookController {

    @Value("${webhook.verify-token:socialflow_webhook_verify_2026}")
    private String verifyToken;

    /**
     * Facebook Webhook Verification (GET)
     * Called when you configure the webhook URL in Facebook App Dashboard.
     * 
     * Facebook sends:
     *   GET /api/webhook/facebook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=CHALLENGE_STRING
     * 
     * We must return the hub.challenge value if the verify_token matches.
     */
    @GetMapping("/facebook")
    public ResponseEntity<String> verifyFacebookWebhook(
            @RequestParam("hub.mode") String mode,
            @RequestParam("hub.verify_token") String token,
            @RequestParam("hub.challenge") String challenge) {

        log.info("Facebook webhook verification: mode={}, token={}", mode, token);

        if ("subscribe".equals(mode) && verifyToken.equals(token)) {
            log.info("Webhook verified successfully!");
            return ResponseEntity.ok(challenge);
        }

        log.warn("Webhook verification failed! Expected token: {}, got: {}", verifyToken, token);
        return ResponseEntity.status(403).body("Verification failed");
    }

    /**
     * Facebook Webhook Events (POST)
     * Receives real-time updates from Facebook (page posts, comments, etc.)
     */
    @PostMapping("/facebook")
    public ResponseEntity<String> handleFacebookEvent(@RequestBody String payload) {
        log.info("Facebook webhook event received: {}", payload);
        // TODO: Process webhook events (post insights, comments, etc.)
        return ResponseEntity.ok("EVENT_RECEIVED");
    }
}

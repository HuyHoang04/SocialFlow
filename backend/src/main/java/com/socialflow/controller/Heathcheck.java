package com.socialflow.controller;

import com.socialflow.service.OAuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequiredArgsConstructor
public class Heathcheck{
    private final OAuthService oauthService;

    @GetMapping("/actuator/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "ok");
        response.put("timestamp", new Date());
        try {
            // Simple DB check
            oauthService.getConnectionsByBrand(UUID.randomUUID());
            response.put("database", "ok");
        } catch (Exception e) {
            response.put("database", "error");
            response.put("databaseError", e.getMessage());
        }
        return ResponseEntity.ok(response);
    }
}

package com.socialflow.controller;

import com.socialflow.model.AppConfig;
import com.socialflow.model.enums.PlatformType;
import com.socialflow.service.AppConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/brands/{brandId}/app-configs")
@RequiredArgsConstructor
public class AppConfigController {

    private final AppConfigService appConfigService;

    /**
     * Get all app configurations for a brand
     */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAppConfigs(@PathVariable UUID brandId) {
        List<AppConfig> configs = appConfigService.getAppConfigsByBrand(brandId);
        return ResponseEntity.ok(configs.stream().map(this::configToMap).toList());
    }

    /**
     * Get app configuration for a specific platform
     */
    @GetMapping("/{platform}")
    public ResponseEntity<Map<String, Object>> getAppConfig(
            @PathVariable UUID brandId,
            @PathVariable String platform) {
        PlatformType platformType = PlatformType.valueOf(platform.toUpperCase());
        AppConfig config = appConfigService.getAppConfig(brandId, platformType);
        return ResponseEntity.ok(configToMap(config));
    }

    /**
     * Save or update app configuration
     */
    @PostMapping("/{platform}")
    public ResponseEntity<Map<String, Object>> saveAppConfig(
            @PathVariable UUID brandId,
            @PathVariable String platform,
            @RequestBody Map<String, Object> body) {
        PlatformType platformType = PlatformType.valueOf(platform.toUpperCase());
        
        String appId = (String) body.get("appId");
        String appSecret = (String) body.get("appSecret");
        String redirectUri = (String) body.getOrDefault("redirectUri", "");
        String additionalConfig = (String) body.getOrDefault("additionalConfig", "");

        AppConfig config = appConfigService.saveAppConfig(
            brandId, platformType, appId, appSecret, redirectUri, additionalConfig);
        
        return ResponseEntity.ok(configToMap(config));
    }

    /**
     * Delete app configuration
     */
    @DeleteMapping("/{platform}")
    public ResponseEntity<Void> deleteAppConfig(
            @PathVariable UUID brandId,
            @PathVariable String platform) {
        PlatformType platformType = PlatformType.valueOf(platform.toUpperCase());
        appConfigService.deleteAppConfig(brandId, platformType);
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> configToMap(AppConfig config) {
        return Map.ofEntries(
            Map.entry("id", config.getId()),
            Map.entry("platform", config.getPlatform()),
            Map.entry("appId", config.getAppId()),
            Map.entry("appSecret", config.getAppSecret() != null && !config.getAppSecret().isEmpty() ? "***" : null),
            Map.entry("redirectUri", config.getRedirectUri()),
            Map.entry("additionalConfig", config.getAdditionalConfig()),
            Map.entry("createdAt", config.getCreatedAt()),
            Map.entry("updatedAt", config.getUpdatedAt())
        );
    }
}

package com.socialflow.service;

import com.socialflow.model.AppConfig;
import com.socialflow.model.Brand;
import com.socialflow.model.enums.PlatformType;
import com.socialflow.repository.AppConfigRepository;
import com.socialflow.repository.BrandRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppConfigService {

    private final AppConfigRepository appConfigRepository;
    private final BrandRepository brandRepository;

    /**
     * Get all app configurations for a brand
     */
    public List<AppConfig> getAppConfigsByBrand(UUID brandId) {
        return appConfigRepository.findByBrandId(brandId);
    }

    /**
     * Get app configuration for a specific platform, throw exception if not found
     */
    public AppConfig getAppConfig(UUID brandId, PlatformType platform) {
        return appConfigRepository.findByBrandIdAndPlatform(brandId, platform)
            .orElseThrow(() -> new IllegalArgumentException("App config not found for platform: " + platform));
    }

    /**
     * Get app configuration or return null if not found
     */
    public AppConfig getAppConfigOrNull(UUID brandId, PlatformType platform) {
        return appConfigRepository.findByBrandIdAndPlatform(brandId, platform).orElse(null);
    }

    /**
     * Save or update app configuration for a platform
     */
    public AppConfig saveAppConfig(UUID brandId, PlatformType platform, 
                                   String appId, String appSecret, String redirectUri, String additionalConfig) {
        Brand brand = brandRepository.findById(brandId)
            .orElseThrow(() -> new IllegalArgumentException("Brand not found: " + brandId));

        AppConfig config = appConfigRepository.findByBrandIdAndPlatform(brandId, platform)
            .orElse(AppConfig.builder()
                .brand(brand)
                .platform(platform)
                .build());

        config.setAppId(appId);
        config.setAppSecret(appSecret);
        config.setRedirectUri(redirectUri);
        config.setAdditionalConfig(additionalConfig);

        AppConfig saved = appConfigRepository.save(config);
        log.info("App config saved for brand {} platform {}", brandId, platform);
        return saved;
    }

    /**
     * Delete app configuration
     */
    public void deleteAppConfig(UUID brandId, PlatformType platform) {
        appConfigRepository.deleteByBrandIdAndPlatform(brandId, platform);
        log.info("App config deleted for brand {} platform {}", brandId, platform);
    }

    /**
     * Check if app config exists for a platform
     */
    public boolean hasAppConfig(UUID brandId, PlatformType platform) {
        return appConfigRepository.findByBrandIdAndPlatform(brandId, platform).isPresent();
    }
}

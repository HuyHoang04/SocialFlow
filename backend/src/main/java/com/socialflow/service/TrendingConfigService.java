package com.socialflow.service;

import com.socialflow.dto.TrendingConfigRequest;
import com.socialflow.dto.TrendingConfigResponse;
import com.socialflow.model.TrendingConfig;
import com.socialflow.repository.TrendingConfigRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
public class TrendingConfigService {

    private final TrendingConfigRepository configRepository;

    public TrendingConfigService(TrendingConfigRepository configRepository) {
        this.configRepository = configRepository;
    }

    /**
     * Save or update trending config.
     * Upsert key: (brandId, source) — one config per source per brand.
     * geo, categoryId, searchKeyword are all updated on upsert.
     */
    @Transactional
    public TrendingConfigResponse saveConfig(TrendingConfigRequest request) {
        if (request.getBrandId() == null) {
            throw new IllegalArgumentException("Brand ID is required");
        }
        if (request.getSource() == null || request.getSource().isBlank()) {
            throw new IllegalArgumentException("Source is required");
        }

        Optional<TrendingConfig> existing =
                configRepository.findByBrandIdAndSource(request.getBrandId(), request.getSource());

        TrendingConfig config;
        if (existing.isPresent()) {
            config = existing.get();
            config.setGeo(request.getGeo());
            config.setCategoryId(request.getCategoryId());
            config.setSearchKeyword(request.getSearchKeyword());
            log.info("Updating existing config: brandId={}, source={}", request.getBrandId(), request.getSource());
        } else {
            config = TrendingConfig.builder()
                    .brandId(request.getBrandId())
                    .geo(request.getGeo())
                    .source(request.getSource())
                    .categoryId(request.getCategoryId())
                    .searchKeyword(request.getSearchKeyword())
                    .build();
            log.info("Creating new config: brandId={}, source={}", request.getBrandId(), request.getSource());
        }

        TrendingConfig saved = configRepository.save(config);
        log.info("Saved config id={} for brandId={}, source={}, geo={}",
                saved.getId(), saved.getBrandId(), saved.getSource(), saved.getGeo());

        return mapToResponse(saved, true);
    }

    /**
     * Get config for a brand+source (upsert key — at most 1 record).
     * Returns null if not configured yet.
     */
    public TrendingConfigResponse getConfigByBrandAndSource(UUID brandId, String source) {
        return configRepository.findByBrandIdAndSource(brandId, source)
                .map(c -> mapToResponse(c, true))
                .orElse(null);
    }

    /**
     * Get all configs for a brand (one per source: google, facebook, ...).
     */
    public List<TrendingConfigResponse> getConfigsByBrand(UUID brandId) {
        return configRepository.findByBrandId(brandId)
                .stream()
                .map(c -> mapToResponse(c, true))
                .collect(Collectors.toList());
    }

    /**
     * Delete config by id.
     */
    @Transactional
    public void deleteConfig(Long id) {
        configRepository.deleteById(id);
        log.info("Deleted config id={}", id);
    }

    // ── Internal ────────────────────────────────────────────────────────────

    private TrendingConfigResponse mapToResponse(TrendingConfig config, boolean success) {
        return TrendingConfigResponse.builder()
                .id(config.getId())
                .brandId(config.getBrandId())
                .geo(config.getGeo())
                .source(config.getSource())
                .categoryId(config.getCategoryId())
                .searchKeyword(config.getSearchKeyword())
                .createdAt(config.getCreatedAt())
                .updatedAt(config.getUpdatedAt())
                .success(success)
                .build();
    }
}

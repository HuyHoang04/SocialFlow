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
     * Save or update trending config
     */
    @Transactional
    public TrendingConfigResponse saveConfig(TrendingConfigRequest request) {
        try {
            if (request.getBrandId() == null) {
                throw new IllegalArgumentException("Brand ID is required");
            }
            
            Optional<TrendingConfig> existing = 
                    configRepository.findByBrandIdAndGeoAndSource(request.getBrandId(), request.getGeo(), request.getSource());
            
            TrendingConfig config;
            if (existing.isPresent()) {
                config = existing.get();
                config.setCategoryId(request.getCategoryId());
                config.setSearchKeyword(request.getSearchKeyword());
            } else {
                config = TrendingConfig.builder()
                        .brandId(request.getBrandId())
                        .geo(request.getGeo())
                        .source(request.getSource())
                        .categoryId(request.getCategoryId())
                        .searchKeyword(request.getSearchKeyword())
                        .build();
            }
            
            TrendingConfig saved = configRepository.save(config);
            log.info("Saved config: brandId={}, geo={}, source={}", saved.getBrandId(), saved.getGeo(), saved.getSource());
            
            return mapToResponse(saved);
        } catch (Exception ex) {
            log.error("Error saving config: {}", ex.getMessage());
            throw new RuntimeException("Failed to save config: " + ex.getMessage());
        }
    }
    
    /**
     * Get config by brand, geo and source
     */
    public TrendingConfigResponse getConfig(UUID brandId, String geo, String source) {
        try {
            Optional<TrendingConfig> config = configRepository.findByBrandIdAndGeoAndSource(brandId, geo, source);
            
            if (config.isPresent()) {
                log.info("Retrieved config: brandId={}, geo={}, source={}", brandId, geo, source);
                return mapToResponse(config.get());
            } else {
                log.warn("Config not found for brandId={}, geo={}, source={}", brandId, geo, source);
                return null;
            }
        } catch (Exception ex) {
            log.error("Error retrieving config: {}", ex.getMessage());
            return null;
        }
    }
    
    /**
     * Get all configs for a brand and geo
     */
    public List<TrendingConfigResponse> getConfigsByGeo(UUID brandId, String geo) {
        try {
            List<TrendingConfig> configs = configRepository.findByBrandIdAndGeo(brandId, geo);
            log.info("Retrieved {} configs for brandId={}, geo={}", configs.size(), brandId, geo);
            
            return configs.stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
        } catch (Exception ex) {
            log.error("Error retrieving configs: {}", ex.getMessage());
            return List.of();
        }
    }
    
    /**
     * Delete config
     */
    @Transactional
    public void deleteConfig(Long id) {
        try {
            configRepository.deleteById(id);
            log.info("Deleted config with id={}", id);
        } catch (Exception ex) {
            log.error("Error deleting config: {}", ex.getMessage());
            throw new RuntimeException("Failed to delete config: " + ex.getMessage());
        }
    }
    
    /**
     * Map entity to DTO
     */
    private TrendingConfigResponse mapToResponse(TrendingConfig config) {
        return TrendingConfigResponse.builder()
                .id(config.getId())
                .geo(config.getGeo())
                .source(config.getSource())
                .searchKeyword(config.getSearchKeyword())
                .createdAt(config.getCreatedAt())
                .updatedAt(config.getUpdatedAt())
                .build();
    }
}

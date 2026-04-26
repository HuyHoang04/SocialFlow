package com.socialflow.controller;

import com.socialflow.dto.TrendingConfigRequest;
import com.socialflow.dto.TrendingConfigResponse;
import com.socialflow.dto.TrendingRequest;
import com.socialflow.dto.TrendingResponse;
import com.socialflow.service.PlatformTrendingAdapter;
import com.socialflow.service.TrendingConfigService;
import com.socialflow.service.TrendingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/trending")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class TrendingController {

    private final List<PlatformTrendingAdapter> adapters;
    private final TrendingConfigService configService;
    private final TrendingService trendingService;
    private final com.socialflow.repository.SocialConnectionRepository connectionRepository;

    private PlatformTrendingAdapter getAdapter(String source) {
        return adapters.stream()
                .filter(a -> a.getSource().equalsIgnoreCase(source))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown trending source: " + source));
    }

    /** Fetch trending from cache using saved config for this brand. */
    @PostMapping("/{source}/search")
    public ResponseEntity<TrendingResponse> search(@PathVariable String source, @Valid @RequestBody TrendingRequest request) {
        try {
            validateBrandId(request.getBrandId());
            
            // Check if user has connection for social platforms
            if ("facebook".equalsIgnoreCase(source) || "bluesky".equalsIgnoreCase(source)) {
                com.socialflow.model.enums.PlatformType platform = "facebook".equalsIgnoreCase(source) 
                        ? com.socialflow.model.enums.PlatformType.FACEBOOK 
                        : com.socialflow.model.enums.PlatformType.BLUESKY;
                
                boolean hasConnection = connectionRepository.existsByBrandIdAndPlatform(request.getBrandId(), platform);
                if (!hasConnection) {
                    return ResponseEntity.ok(TrendingResponse.builder()
                            .success(false)
                            .error("You need to connect your " + source + " account first.")
                            .build());
                }
            }

            PlatformTrendingAdapter adapter = getAdapter(source);
            TrendingConfigResponse config = configService.getConfigByBrandAndSource(request.getBrandId(), source);
            if (config == null) {
                // For Bluesky we might not need config, but we still require users to have one if they use the UI,
                // or we can fallback to default. Let's assume config is required.
                log.warn("No {} config found for brandId={}", source, request.getBrandId());
                return ResponseEntity.ok(TrendingResponse.builder()
                        .success(false)
                        .configFound(false)
                        .error("No " + source + " config found. Please click ⚙️ Configure to set up first.")
                        .build());
            }

            String keywordOrCategory = "google".equalsIgnoreCase(source) ? config.getCategoryId() : config.getSearchKeyword();
            if (!"google".equalsIgnoreCase(source) && !"bluesky".equalsIgnoreCase(source) && (keywordOrCategory == null || keywordOrCategory.isBlank())) {
                return ResponseEntity.ok(TrendingResponse.builder()
                        .success(false)
                        .configFound(false)
                        .error("No keyword configured for " + source + ".")
                        .build());
            }

            if (keywordOrCategory == null) {
                keywordOrCategory = "";
            }

            log.info("Fetching {} trending from cache: brandId={}, geo={}, keywordOrCategory={}",
                    source, request.getBrandId(), config.getGeo(), keywordOrCategory);

            List<Map<String, Object>> data = adapter.getTrendingFromCache(
                    request.getBrandId(), config.getGeo(), keywordOrCategory);

            return ResponseEntity.ok(TrendingResponse.builder()
                    .success(!data.isEmpty())
                    .configFound(true)
                    .trendingSearches(data)
                    .geo(config.getGeo())
                    .categoryId(config.getCategoryId())
                    .build());

        } catch (Exception e) {
            log.error("Error fetching {} trending", source, e);
            return ResponseEntity.badRequest().body(TrendingResponse.builder()
                    .success(false).error(e.getMessage()).build());
        }
    }

    /** Refresh trending from API using saved config. */
    @PostMapping("/{source}/search/refresh")
    public ResponseEntity<TrendingResponse> refresh(@PathVariable String source, @Valid @RequestBody TrendingRequest request) {
        try {
            validateBrandId(request.getBrandId());
            
            // Check if user has connection for social platforms
            if ("facebook".equalsIgnoreCase(source) || "bluesky".equalsIgnoreCase(source)) {
                com.socialflow.model.enums.PlatformType platform = "facebook".equalsIgnoreCase(source) 
                        ? com.socialflow.model.enums.PlatformType.FACEBOOK 
                        : com.socialflow.model.enums.PlatformType.BLUESKY;
                
                boolean hasConnection = connectionRepository.existsByBrandIdAndPlatform(request.getBrandId(), platform);
                if (!hasConnection) {
                    return ResponseEntity.ok(TrendingResponse.builder()
                            .success(false)
                            .error("You need to connect your " + source + " account first.")
                            .build());
                }
            }

            PlatformTrendingAdapter adapter = getAdapter(source);
            TrendingConfigResponse config = configService.getConfigByBrandAndSource(request.getBrandId(), source);
            if (config == null) {
                log.warn("No {} config found for brandId={}", source, request.getBrandId());
                return ResponseEntity.ok(TrendingResponse.builder()
                        .success(false)
                        .configFound(false)
                        .error("No " + source + " config found. Please click ⚙️ Configure to set up first.")
                        .build());
            }

            String keywordOrCategory = "google".equalsIgnoreCase(source) ? config.getCategoryId() : config.getSearchKeyword();
            if (!"google".equalsIgnoreCase(source) && !"bluesky".equalsIgnoreCase(source) && (keywordOrCategory == null || keywordOrCategory.isBlank())) {
                return ResponseEntity.ok(TrendingResponse.builder()
                        .success(false)
                        .configFound(false)
                        .error("No keyword configured for " + source + ".")
                        .build());
            }

            if (keywordOrCategory == null) {
                keywordOrCategory = "";
            }

            log.info("Refreshing {} trending from API: brandId={}, geo={}, keywordOrCategory={}",
                    source, request.getBrandId(), config.getGeo(), keywordOrCategory);

            List<Map<String, Object>> data = adapter.getTrendingFromAPI(
                    request.getBrandId(), config.getGeo(), keywordOrCategory);

            return ResponseEntity.ok(TrendingResponse.builder()
                    .success(!data.isEmpty())
                    .configFound(true)
                    .trendingSearches(data)
                    .geo(config.getGeo())
                    .categoryId(config.getCategoryId())
                    .build());

        } catch (Exception e) {
            log.error("Error refreshing {} trending", source, e);
            return ResponseEntity.badRequest().body(TrendingResponse.builder()
                    .success(false).error(e.getMessage()).build());
        }
    }

    // Keep backwards compatibility for frontend temporarily if needed, 
    // but the instruction says to refactor and update frontend.
    @PostMapping("/search")
    public ResponseEntity<TrendingResponse> getTrendingSearchesOld(@Valid @RequestBody TrendingRequest request) {
        return search("google", request);
    }

    @PostMapping("/search/refresh")
    public ResponseEntity<TrendingResponse> refreshTrendingSearchesOld(@Valid @RequestBody TrendingRequest request) {
        return refresh("google", request);
    }

    @PostMapping("/facebook/search")
    public ResponseEntity<TrendingResponse> searchFacebookOld(@Valid @RequestBody TrendingRequest request) {
        return search("facebook", request);
    }

    @PostMapping("/facebook/search/refresh")
    public ResponseEntity<TrendingResponse> refreshFacebookOld(@Valid @RequestBody TrendingRequest request) {
        return refresh("facebook", request);
    }

    // ============= CONFIG MANAGEMENT =============

    /** Save / upsert config for a brand+source (one per source). */
    @PostMapping("/config")
    public ResponseEntity<TrendingConfigResponse> saveConfig(@Valid @RequestBody TrendingConfigRequest request) {
        try {
            validateBrandId(request.getBrandId());
            log.info("Saving trending config: brandId={}, source={}, geo={}",
                    request.getBrandId(), request.getSource(), request.getGeo());

            TrendingConfigResponse response = configService.saveConfig(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error saving config", e);
            return ResponseEntity.badRequest().build();
        }
    }

    /** Get config for a specific brand + source (upsert key). */
    @GetMapping("/config/{brandId}/{source}")
    public ResponseEntity<TrendingConfigResponse> getConfig(
            @PathVariable UUID brandId,
            @PathVariable String source) {
        try {
            log.info("Retrieving config: brandId={}, source={}", brandId, source);
            TrendingConfigResponse response = configService.getConfigByBrandAndSource(brandId, source);
            return response != null ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error retrieving config", e);
            return ResponseEntity.badRequest().build();
        }
    }

    /** Get all configs for a brand (one per source). */
    @GetMapping("/config/{brandId}")
    public ResponseEntity<List<TrendingConfigResponse>> getConfigsByBrand(
            @PathVariable UUID brandId) {
        try {
            log.info("Retrieving all configs for brandId={}", brandId);
            List<TrendingConfigResponse> responses = configService.getConfigsByBrand(brandId);
            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            log.error("Error retrieving configs", e);
            return ResponseEntity.badRequest().build();
        }
    }

    /** Delete config by id. */
    @DeleteMapping("/config/{id}")
    public ResponseEntity<Void> deleteConfig(@PathVariable Long id) {
        try {
            log.info("Deleting config id={}", id);
            configService.deleteConfig(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Error deleting config", e);
            return ResponseEntity.badRequest().build();
        }
    }

    // ============= MAINTENANCE =============

    @PostMapping("/cleanup")
    public ResponseEntity<String> cleanup() {
        try {
            log.info("Starting trending data cleanup");
            trendingService.cleanupOldData();
            return ResponseEntity.ok("Cleanup completed");
        } catch (Exception e) {
            log.error("Error during cleanup", e);
            return ResponseEntity.badRequest().body("Cleanup failed: " + e.getMessage());
        }
    }

    // ============= HELPERS =============

    private void validateBrandId(UUID brandId) {
        if (brandId == null) {
            throw new IllegalArgumentException("Brand ID is required");
        }
    }
}

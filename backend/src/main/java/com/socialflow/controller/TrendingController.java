package com.socialflow.controller;

import com.socialflow.dto.TrendingConfigRequest;
import com.socialflow.dto.TrendingConfigResponse;
import com.socialflow.dto.TrendingRequest;
import com.socialflow.dto.TrendingResponse;
import com.socialflow.service.FacebookTrendingService;
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

    private final TrendingService trendingService;
    private final FacebookTrendingService facebookTrendingService;
    private final TrendingConfigService configService;

    // ============= GOOGLE TRENDS =============

    /** Fetch Google trending from cache using saved config for this brand. */
    @PostMapping("/search")
    public ResponseEntity<TrendingResponse> getTrendingSearches(@Valid @RequestBody TrendingRequest request) {
        try {
            validateBrandId(request.getBrandId());

            TrendingConfigResponse config = configService.getConfigByBrandAndSource(request.getBrandId(), "google");
            if (config == null) {
                log.warn("No Google config found for brandId={}", request.getBrandId());
                return ResponseEntity.ok(TrendingResponse.builder()
                        .success(false)
                        .configFound(false)
                        .error("No Google Trends config found. Please click ⚙️ Configure to set up first.")
                        .build());
            }

            log.info("Fetching Google trending from cache: brandId={}, geo={}, categoryId={}",
                    request.getBrandId(), config.getGeo(), config.getCategoryId());

            List<Map<String, Object>> data = trendingService.getTrendingFromCache(
                    request.getBrandId(), config.getGeo(), config.getCategoryId());

            return ResponseEntity.ok(TrendingResponse.builder()
                    .success(!data.isEmpty())
                    .configFound(true)
                    .trendingSearches(data)
                    .geo(config.getGeo())
                    .categoryId(config.getCategoryId())
                    .build());

        } catch (Exception e) {
            log.error("Error fetching Google trending", e);
            return ResponseEntity.badRequest().body(TrendingResponse.builder()
                    .success(false).error(e.getMessage()).build());
        }
    }

    /** Refresh Google trending from SerpAPI using saved config. */
    @PostMapping("/search/refresh")
    public ResponseEntity<TrendingResponse> refreshTrendingSearches(@Valid @RequestBody TrendingRequest request) {
        try {
            validateBrandId(request.getBrandId());

            TrendingConfigResponse config = configService.getConfigByBrandAndSource(request.getBrandId(), "google");
            if (config == null) {
                log.warn("No Google config found for brandId={}", request.getBrandId());
                return ResponseEntity.ok(TrendingResponse.builder()
                        .success(false)
                        .configFound(false)
                        .error("No Google Trends config found. Please click ⚙️ Configure to set up first.")
                        .build());
            }

            log.info("Refreshing Google trending from API: brandId={}, geo={}, categoryId={}",
                    request.getBrandId(), config.getGeo(), config.getCategoryId());

            List<Map<String, Object>> data = trendingService.getTrendingFromAPI(
                    request.getBrandId(), config.getGeo(), config.getCategoryId());

            return ResponseEntity.ok(TrendingResponse.builder()
                    .success(!data.isEmpty())
                    .configFound(true)
                    .trendingSearches(data)
                    .geo(config.getGeo())
                    .categoryId(config.getCategoryId())
                    .build());

        } catch (Exception e) {
            log.error("Error refreshing Google trending", e);
            return ResponseEntity.badRequest().body(TrendingResponse.builder()
                    .success(false).error(e.getMessage()).build());
        }
    }

    @PostMapping("/search/default")
    public ResponseEntity<TrendingResponse> getTrendingDefault() {
        return getTrendingSearches(TrendingRequest.builder().geo("VN").build());
    }

    @PostMapping("/search/refresh/default")
    public ResponseEntity<TrendingResponse> refreshTrendingDefault() {
        return refreshTrendingSearches(TrendingRequest.builder().geo("VN").build());
    }

    // ============= FACEBOOK TRENDS =============

    /** Fetch Facebook trending from cache using saved config (keyword + geo). */
    @PostMapping("/facebook/search")
    public ResponseEntity<TrendingResponse> searchFacebook(@Valid @RequestBody TrendingRequest request) {
        try {
            validateBrandId(request.getBrandId());

            TrendingConfigResponse config = configService.getConfigByBrandAndSource(request.getBrandId(), "facebook");
            if (config == null || config.getSearchKeyword() == null || config.getSearchKeyword().isBlank()) {
                log.warn("No Facebook config (or missing keyword) for brandId={}", request.getBrandId());
                return ResponseEntity.ok(TrendingResponse.builder()
                        .success(false)
                        .configFound(false)
                        .error("No Facebook config found. Please click ⚙️ Configure and enter a search keyword.")
                        .build());
            }

            log.info("Fetching Facebook trending from cache: brandId={}, geo={}, keyword={}",
                    request.getBrandId(), config.getGeo(), config.getSearchKeyword());

            List<Map<String, Object>> data = facebookTrendingService.getFacebookTrendingFromCache(
                    request.getBrandId(), config.getGeo(), config.getSearchKeyword());

            return ResponseEntity.ok(TrendingResponse.builder()
                    .success(!data.isEmpty())
                    .configFound(true)
                    .trendingSearches(data)
                    .geo(config.getGeo())
                    .build());

        } catch (Exception e) {
            log.error("Error fetching Facebook trending", e);
            return ResponseEntity.badRequest().body(TrendingResponse.builder()
                    .success(false).error(e.getMessage()).build());
        }
    }

    /** Refresh Facebook trending from API using saved config (keyword + geo). */
    @PostMapping("/facebook/search/refresh")
    public ResponseEntity<TrendingResponse> refreshFacebook(@Valid @RequestBody TrendingRequest request) {
        try {
            validateBrandId(request.getBrandId());

            TrendingConfigResponse config = configService.getConfigByBrandAndSource(request.getBrandId(), "facebook");
            if (config == null || config.getSearchKeyword() == null || config.getSearchKeyword().isBlank()) {
                log.warn("No Facebook config (or missing keyword) for brandId={}", request.getBrandId());
                return ResponseEntity.ok(TrendingResponse.builder()
                        .success(false)
                        .configFound(false)
                        .error("No Facebook config found. Please click ⚙️ Configure and enter a search keyword.")
                        .build());
            }

            log.info("Refreshing Facebook trending from API: brandId={}, geo={}, keyword={}",
                    request.getBrandId(), config.getGeo(), config.getSearchKeyword());

            List<Map<String, Object>> data = facebookTrendingService.getFacebookTrendingFromAPI(
                    request.getBrandId(), config.getGeo(), config.getSearchKeyword());

            return ResponseEntity.ok(TrendingResponse.builder()
                    .success(!data.isEmpty())
                    .configFound(true)
                    .trendingSearches(data)
                    .geo(config.getGeo())
                    .build());

        } catch (Exception e) {
            log.error("Error refreshing Facebook trending", e);
            return ResponseEntity.badRequest().body(TrendingResponse.builder()
                    .success(false).error(e.getMessage()).build());
        }
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

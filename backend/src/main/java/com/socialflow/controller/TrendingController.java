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

    @PostMapping("/search")
    public ResponseEntity<TrendingResponse> getTrendingSearches(@Valid @RequestBody TrendingRequest request) {
        try {
            validateBrandId(request.getBrandId());
            log.info("Fetching Google trending from cache: brandId={}, geo={}, categoryId={}", 
                    request.getBrandId(), request.getGeo(), request.getCategoryId());
            
            List<Map<String, Object>> data = trendingService.getTrendingFromCache(
                    request.getBrandId(), request.getGeo(), request.getCategoryId());
            
            return ResponseEntity.ok(TrendingResponse.builder()
                    .success(!data.isEmpty())
                    .trendingSearches(data)
                    .geo(request.getGeo())
                    .categoryId(request.getCategoryId())
                    .build());
        } catch (Exception e) {
            log.error("Error fetching Google trending", e);
            return ResponseEntity.badRequest().body(TrendingResponse.builder()
                    .success(false)
                    .error(e.getMessage())
                    .build());
        }
    }

    @PostMapping("/search/refresh")
    public ResponseEntity<TrendingResponse> refreshTrendingSearches(@Valid @RequestBody TrendingRequest request) {
        try {
            validateBrandId(request.getBrandId());
            log.info("Refreshing Google trending from API: brandId={}, geo={}, categoryId={}", 
                    request.getBrandId(), request.getGeo(), request.getCategoryId());
            
            List<Map<String, Object>> data = trendingService.getTrendingFromAPI(
                    request.getBrandId(), request.getGeo(), request.getCategoryId());
            
            return ResponseEntity.ok(TrendingResponse.builder()
                    .success(!data.isEmpty())
                    .trendingSearches(data)
                    .geo(request.getGeo())
                    .categoryId(request.getCategoryId())
                    .build());
        } catch (Exception e) {
            log.error("Error refreshing Google trending", e);
            return ResponseEntity.badRequest().body(TrendingResponse.builder()
                    .success(false)
                    .error(e.getMessage())
                    .build());
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

    @PostMapping("/facebook/search")
    public ResponseEntity<TrendingResponse> searchFacebook(@Valid @RequestBody TrendingRequest request) {
        try {
            validateBrandId(request.getBrandId());
            validateSearchKeyword(request.getSearchKeyword());
            log.info("Fetching Facebook trending from cache: brandId={}, geo={}, keyword={}", 
                    request.getBrandId(), request.getGeo(), request.getSearchKeyword());
            
            List<Map<String, Object>> data = facebookTrendingService.getFacebookTrendingFromCache(
                    request.getBrandId(), request.getGeo(), request.getSearchKeyword());
            
            return ResponseEntity.ok(TrendingResponse.builder()
                    .success(!data.isEmpty())
                    .trendingSearches(data)
                    .geo(request.getGeo())
                    .build());
        } catch (Exception e) {
            log.error("Error fetching Facebook trending", e);
            return ResponseEntity.badRequest().body(TrendingResponse.builder()
                    .success(false)
                    .error(e.getMessage())
                    .build());
        }
    }

    @PostMapping("/facebook/search/refresh")
    public ResponseEntity<TrendingResponse> refreshFacebook(@Valid @RequestBody TrendingRequest request) {
        try {
            validateBrandId(request.getBrandId());
            validateSearchKeyword(request.getSearchKeyword());
            log.info("Refreshing Facebook trending from API: brandId={}, geo={}, keyword={}", 
                    request.getBrandId(), request.getGeo(), request.getSearchKeyword());
            
            List<Map<String, Object>> data = facebookTrendingService.getFacebookTrendingFromAPI(
                    request.getBrandId(), request.getGeo(), request.getSearchKeyword());
            
            return ResponseEntity.ok(TrendingResponse.builder()
                    .success(!data.isEmpty())
                    .trendingSearches(data)
                    .geo(request.getGeo())
                    .build());
        } catch (Exception e) {
            log.error("Error refreshing Facebook trending", e);
            return ResponseEntity.badRequest().body(TrendingResponse.builder()
                    .success(false)
                    .error(e.getMessage())
                    .build());
        }
    }

    // ============= CONFIG MANAGEMENT =============

    @PostMapping("/config")
    public ResponseEntity<TrendingConfigResponse> saveConfig(@Valid @RequestBody TrendingConfigRequest request) {
        try {
            validateBrandId(request.getBrandId());
            log.info("Saving trending config: brandId={}, geo={}, source={}", 
                    request.getBrandId(), request.getGeo(), request.getSource());
            
            TrendingConfigResponse response = configService.saveConfig(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error saving config", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/config/{brandId}/{geo}/{source}")
    public ResponseEntity<TrendingConfigResponse> getConfig(
            @PathVariable UUID brandId,
            @PathVariable String geo,
            @PathVariable String source) {
        try {
            log.info("Retrieving config: brandId={}, geo={}, source={}", brandId, geo, source);
            TrendingConfigResponse response = configService.getConfig(brandId, geo, source);
            return response != null ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error retrieving config", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/config/{brandId}/{geo}")
    public ResponseEntity<List<TrendingConfigResponse>> getConfigsByGeo(
            @PathVariable UUID brandId,
            @PathVariable String geo) {
        try {
            log.info("Retrieving configs: brandId={}, geo={}", brandId, geo);
            List<TrendingConfigResponse> responses = configService.getConfigsByGeo(brandId, geo);
            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            log.error("Error retrieving configs", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/config/{id}")
    public ResponseEntity<Void> deleteConfig(@PathVariable Long id) {
        try {
            log.info("Deleting config: id={}", id);
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

    // ============= VALIDATION HELPERS =============

    private void validateBrandId(UUID brandId) {
        if (brandId == null) {
            throw new IllegalArgumentException("Brand ID is required");
        }
    }

    private void validateSearchKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            throw new IllegalArgumentException("Search keyword is required");
        }
    }
}

package com.socialflow.controller;

import com.socialflow.dto.TrendingRequest;
import com.socialflow.dto.TrendingResponse;
import com.socialflow.service.TrendingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/trending")
@RequiredArgsConstructor
@Slf4j
public class TrendingController {

    private final TrendingService trendingService;

    /**
     * Get trending searches (from database cache)
     * Only returns what's already saved in database
     * 
     * @param request TrendingRequest with geo and categoryId
     * @return TrendingResponse with cached trending data
     */
    @PostMapping("/search")
    public ResponseEntity<TrendingResponse> getTrendingSearches(@Valid @RequestBody TrendingRequest request) {
        try {
            log.info("Fetching trending from cache for geo={}, categoryId={}, brand={}", 
                    request.getGeo(), request.getCategoryId(), request.getBrandName());
            
            // Get from database (cache)
            List<Map<String, Object>> trendingSearches = trendingService.getTrendingFromCache(
                    request.getGeo(),
                    request.getCategoryId()
            );
            
            boolean success = !trendingSearches.isEmpty();
            
            TrendingResponse response = TrendingResponse.builder()
                    .success(success)
                    .trendingSearches(trendingSearches)
                    .geo(request.getGeo())
                    .categoryId(request.getCategoryId())
                    .build();
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Failed to fetch trending searches", e);
            return ResponseEntity.status(500).body(TrendingResponse.builder()
                    .success(false)
                    .error(e.getMessage())
                    .geo(request.getGeo())
                    .categoryId(request.getCategoryId())
                    .build());
        }
    }

    /**
     * Refresh trending searches (call SerpAPI and update database)
     * This is called explicitly by user when they want new data
     * 
     * @param request TrendingRequest with geo and categoryId
     * @return TrendingResponse with fresh data from API
     */
    @PostMapping("/search/refresh")
    public ResponseEntity<TrendingResponse> refreshTrendingSearches(@Valid @RequestBody TrendingRequest request) {
        try {
            log.info("Refreshing trending from API for geo={}, categoryId={}, brand={}", 
                    request.getGeo(), request.getCategoryId(), request.getBrandName());
            
            // Call API and save to database
            List<Map<String, Object>> trendingSearches = trendingService.getTrendingFromAPI(
                    request.getGeo(),
                    request.getCategoryId()
            );
            
            boolean success = !trendingSearches.isEmpty();
            
            TrendingResponse response = TrendingResponse.builder()
                    .success(success)
                    .trendingSearches(trendingSearches)
                    .geo(request.getGeo())
                    .categoryId(request.getCategoryId())
                    .build();
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Failed to refresh trending searches", e);
            return ResponseEntity.status(500).body(TrendingResponse.builder()
                    .success(false)
                    .error(e.getMessage())
                    .geo(request.getGeo())
                    .categoryId(request.getCategoryId())
                    .build());
        }
    }

    /**
     * Get trending with default geo (VN)
     */
    @PostMapping("/search/default")
    public ResponseEntity<TrendingResponse> getTrendingDefault() {
        return getTrendingSearches(TrendingRequest.builder()
                .geo("VN")
                .build());
    }

    /**
     * Refresh trending with default geo (VN)
     */
    @PostMapping("/search/refresh/default")
    public ResponseEntity<TrendingResponse> refreshTrendingDefault() {
        return refreshTrendingSearches(TrendingRequest.builder()
                .geo("VN")
                .build());
    }

    /**
     * Cleanup old trending data (older than 7 days)
     */
    @PostMapping("/cleanup")
    public ResponseEntity<String> cleanup() {
        trendingService.cleanupOldData();
        return ResponseEntity.ok("Cleanup completed");
    }
}

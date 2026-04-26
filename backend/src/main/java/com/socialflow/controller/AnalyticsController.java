package com.socialflow.controller;

import com.socialflow.dto.AnalyticsOverviewResponse;
import com.socialflow.dto.PageAnalyticsResponse;
import com.socialflow.dto.PostAnalyticsResponse;
import com.socialflow.service.AnalyticsService;
import com.socialflow.service.PlatformAnalyticsAdapter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@Slf4j
public class AnalyticsController {

    private final List<PlatformAnalyticsAdapter> adapters;
    private final AnalyticsService analyticsService;

    // ── Sync (fetch fresh data from platforms) ──

    @PostMapping("/brands/{brandId}/sync")
    public ResponseEntity<Map<String, String>> syncAnalytics(@PathVariable UUID brandId) {
        Map<String, String> results = new HashMap<>();
        for (PlatformAnalyticsAdapter adapter : adapters) {
            String platformName = adapter.getPlatformType().name().toLowerCase();
            try {
                adapter.syncPostAnalytics(brandId);
                adapter.syncPageAnalytics(brandId);
                results.put(platformName, "success");
            } catch (Exception e) {
                log.error("Failed to sync analytics for {} on brand {}", platformName, brandId, e);
                results.put(platformName, "error: " + e.getMessage());
            }
        }
        return ResponseEntity.ok(results);
    }

    @PostMapping("/brands/{brandId}/sync/posts")
    public ResponseEntity<Map<String, String>> syncPostAnalytics(@PathVariable UUID brandId) {
        Map<String, String> results = new HashMap<>();
        for (PlatformAnalyticsAdapter adapter : adapters) {
            String platformName = adapter.getPlatformType().name().toLowerCase();
            try {
                adapter.syncPostAnalytics(brandId);
                results.put(platformName, "success");
            } catch (Exception e) {
                log.error("Failed to sync post analytics for {} on brand {}", platformName, brandId, e);
                results.put(platformName, "error: " + e.getMessage());
            }
        }
        return ResponseEntity.ok(results);
    }

    @PostMapping("/brands/{brandId}/sync/pages")
    public ResponseEntity<Map<String, String>> syncPageAnalytics(@PathVariable UUID brandId) {
        Map<String, String> results = new HashMap<>();
        for (PlatformAnalyticsAdapter adapter : adapters) {
            String platformName = adapter.getPlatformType().name().toLowerCase();
            try {
                adapter.syncPageAnalytics(brandId);
                results.put(platformName, "success");
            } catch (Exception e) {
                log.error("Failed to sync page analytics for {} on brand {}", platformName, brandId, e);
                results.put(platformName, "error: " + e.getMessage());
            }
        }
        return ResponseEntity.ok(results);
    }

    // ── Overview ──

    @GetMapping("/brands/{brandId}/overview")
    public ResponseEntity<AnalyticsOverviewResponse> getOverview(@PathVariable UUID brandId) {
        return ResponseEntity.ok(analyticsService.getOverview(brandId));
    }

    // ── Post Analytics ──

    @GetMapping("/brands/{brandId}/posts")
    public ResponseEntity<List<PostAnalyticsResponse>> getPostAnalyticsByBrand(@PathVariable UUID brandId) {
        return ResponseEntity.ok(analyticsService.getPostAnalyticsByBrand(brandId));
    }

    @GetMapping("/posts/{postId}")
    public ResponseEntity<PostAnalyticsResponse> getPostAnalytics(@PathVariable UUID postId) {
        return ResponseEntity.ok(analyticsService.getPostAnalytics(postId));
    }

    @GetMapping("/posts/{postId}/history")
    public ResponseEntity<List<PostAnalyticsResponse>> getPostAnalyticsHistory(@PathVariable UUID postId) {
        return ResponseEntity.ok(analyticsService.getPostAnalyticsHistory(postId));
    }

    // ── Page Analytics ──

    @GetMapping("/pages/{pageId}")
    public ResponseEntity<PageAnalyticsResponse> getPageAnalytics(@PathVariable UUID pageId) {
        return ResponseEntity.ok(analyticsService.getPageAnalytics(pageId));
    }

    @GetMapping("/pages/{pageId}/history")
    public ResponseEntity<List<PageAnalyticsResponse>> getPageAnalyticsHistory(@PathVariable UUID pageId) {
        return ResponseEntity.ok(analyticsService.getPageAnalyticsHistory(pageId));
    }
}

package com.socialflow.controller;

import com.socialflow.dto.AnalyticsOverviewResponse;
import com.socialflow.dto.PageAnalyticsResponse;
import com.socialflow.dto.PostAnalyticsResponse;
import com.socialflow.service.FacebookAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final FacebookAnalyticsService facebookAnalyticsService;

    // ── Sync (fetch fresh data from Facebook) ──

    @PostMapping("/brands/{brandId}/sync")
    public ResponseEntity<Map<String, String>> syncAnalytics(@PathVariable UUID brandId) {
        facebookAnalyticsService.syncPostAnalytics(brandId);
        facebookAnalyticsService.syncPageAnalytics(brandId);
        return ResponseEntity.ok(Map.of("status", "ok", "message", "Analytics synced successfully"));
    }

    @PostMapping("/brands/{brandId}/sync/posts")
    public ResponseEntity<Map<String, String>> syncPostAnalytics(@PathVariable UUID brandId) {
        facebookAnalyticsService.syncPostAnalytics(brandId);
        return ResponseEntity.ok(Map.of("status", "ok", "message", "Post analytics synced"));
    }

    @PostMapping("/brands/{brandId}/sync/pages")
    public ResponseEntity<Map<String, String>> syncPageAnalytics(@PathVariable UUID brandId) {
        facebookAnalyticsService.syncPageAnalytics(brandId);
        return ResponseEntity.ok(Map.of("status", "ok", "message", "Page analytics synced"));
    }

    // ── Overview ──

    @GetMapping("/brands/{brandId}/overview")
    public ResponseEntity<AnalyticsOverviewResponse> getOverview(@PathVariable UUID brandId) {
        return ResponseEntity.ok(facebookAnalyticsService.getOverview(brandId));
    }

    // ── Post Analytics ──

    @GetMapping("/brands/{brandId}/posts")
    public ResponseEntity<List<PostAnalyticsResponse>> getPostAnalyticsByBrand(@PathVariable UUID brandId) {
        return ResponseEntity.ok(facebookAnalyticsService.getPostAnalyticsByBrand(brandId));
    }

    @GetMapping("/posts/{postId}")
    public ResponseEntity<PostAnalyticsResponse> getPostAnalytics(@PathVariable UUID postId) {
        return ResponseEntity.ok(facebookAnalyticsService.getPostAnalytics(postId));
    }

    @GetMapping("/posts/{postId}/history")
    public ResponseEntity<List<PostAnalyticsResponse>> getPostAnalyticsHistory(@PathVariable UUID postId) {
        return ResponseEntity.ok(facebookAnalyticsService.getPostAnalyticsHistory(postId));
    }

    // ── Page Analytics ──

    @GetMapping("/pages/{pageId}")
    public ResponseEntity<PageAnalyticsResponse> getPageAnalytics(@PathVariable UUID pageId) {
        return ResponseEntity.ok(facebookAnalyticsService.getPageAnalytics(pageId));
    }

    @GetMapping("/pages/{pageId}/history")
    public ResponseEntity<List<PageAnalyticsResponse>> getPageAnalyticsHistory(@PathVariable UUID pageId) {
        return ResponseEntity.ok(facebookAnalyticsService.getPageAnalyticsHistory(pageId));
    }
}

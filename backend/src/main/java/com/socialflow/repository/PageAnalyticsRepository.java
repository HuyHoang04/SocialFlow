package com.socialflow.repository;

import com.socialflow.model.PageAnalytics;
import com.socialflow.model.enums.PlatformType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PageAnalyticsRepository extends JpaRepository<PageAnalytics, UUID> {
    List<PageAnalytics> findByPageIdOrderByFetchedAtDesc(UUID pageId);
    Optional<PageAnalytics> findFirstByPageIdOrderByFetchedAtDesc(UUID pageId);
    List<PageAnalytics> findByPageConnectionBrandIdOrderByFetchedAtDesc(UUID brandId);
    List<PageAnalytics> findByPageConnectionBrandIdAndPlatformOrderByFetchedAtDesc(UUID brandId, PlatformType platform);
}

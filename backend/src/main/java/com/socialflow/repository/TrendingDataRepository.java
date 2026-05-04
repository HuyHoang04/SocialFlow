package com.socialflow.repository;

import com.socialflow.model.TrendingData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TrendingDataRepository extends JpaRepository<TrendingData, Long> {
    
    /**
     * Find latest trending by brand, geo, source, and category (Google Trends)
     */
    Optional<TrendingData> findFirstByBrandIdAndGeoAndSourceAndCategoryIdOrderByFetchedAtDesc(
            UUID brandId, String geo, String source, String categoryId);
    
    /**
     * Find latest trending by brand, geo and source only (all categories)
     */
    Optional<TrendingData> findFirstByBrandIdAndGeoAndSourceAndCategoryIdIsNullOrderByFetchedAtDesc(
            UUID brandId, String geo, String source);
    
    /**
     * Find latest trending by brand, geo, source, and keyword (Facebook posts)
     */
    Optional<TrendingData> findFirstByBrandIdAndGeoAndSourceAndSearchKeywordOrderByFetchedAtDesc(
            UUID brandId, String geo, String source, String keyword);
    
    /**
     * Delete trending data older than specified time
     */
    long deleteByFetchedAtBefore(LocalDateTime before);
    
    /**
     * Delete by brand, geo, source, and categoryId
     */
    long deleteByBrandIdAndGeoAndSourceAndCategoryId(UUID brandId, String geo, String source, String categoryId);
    
    /**
     * Delete by brand, geo and source (all categories)
     */
    long deleteByBrandIdAndGeoAndSourceAndCategoryIdIsNull(UUID brandId, String geo, String source);
    
    /**
     * Delete by brand, geo, source, and keyword
     */
    long deleteByBrandIdAndGeoAndSourceAndSearchKeyword(UUID brandId, String geo, String source, String keyword);
}

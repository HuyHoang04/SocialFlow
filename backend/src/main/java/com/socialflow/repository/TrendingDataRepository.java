package com.socialflow.repository;

import com.socialflow.model.TrendingData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TrendingDataRepository extends JpaRepository<TrendingData, Long> {
    
    /**
     * Find latest trending data for geo and optional category
     */
    Optional<TrendingData> findFirstByGeoAndCategoryIdOrderByFetchedAtDesc(String geo, String categoryId);
    
    /**
     * Find latest trending data by geo only (all categories)
     */
    Optional<TrendingData> findFirstByGeoAndCategoryIdIsNullOrderByFetchedAtDesc(String geo);
    
    /**
     * Delete trending data older than specified time
     */
    long deleteByFetchedAtBefore(LocalDateTime before);
    
    /**
     * Delete by geo and categoryId
     */
    long deleteByGeoAndCategoryId(String geo, String categoryId);
    
    /**
     * Delete by geo and categoryId is null
     */
    long deleteByGeoAndCategoryIdIsNull(String geo);
}

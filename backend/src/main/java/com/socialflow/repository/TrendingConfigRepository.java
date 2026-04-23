package com.socialflow.repository;

import com.socialflow.model.TrendingConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TrendingConfigRepository extends JpaRepository<TrendingConfig, Long> {
    
    /**
     * Find config by brand, geo and source
     */
    Optional<TrendingConfig> findByBrandIdAndGeoAndSource(UUID brandId, String geo, String source);
    
    /**
     * Find all configs by brand and geo
     */
    List<TrendingConfig> findByBrandIdAndGeo(UUID brandId, String geo);
    
    /**
     * Find all configs by brand and source
     */
    List<TrendingConfig> findByBrandIdAndSource(UUID brandId, String source);
}

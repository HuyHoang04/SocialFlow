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
     * Upsert key: 1 config per brand per source.
     * Find config by brand and source (geo is just a field, not part of the key).
     */
    Optional<TrendingConfig> findByBrandIdAndSource(UUID brandId, String source);

    /**
     * Get all configs for a brand (one per source).
     */
    List<TrendingConfig> findByBrandId(UUID brandId);

    /**
     * Legacy – kept for any existing code that needs it.
     */
    List<TrendingConfig> findByBrandIdAndGeo(UUID brandId, String geo);
}

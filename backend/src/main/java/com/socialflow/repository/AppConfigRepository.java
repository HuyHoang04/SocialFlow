package com.socialflow.repository;

import com.socialflow.model.AppConfig;
import com.socialflow.model.enums.PlatformType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AppConfigRepository extends JpaRepository<AppConfig, UUID> {
    List<AppConfig> findByBrandId(UUID brandId);

    Optional<AppConfig> findByBrandIdAndPlatform(UUID brandId, PlatformType platform);

    void deleteByBrandIdAndPlatform(UUID brandId, PlatformType platform);
}

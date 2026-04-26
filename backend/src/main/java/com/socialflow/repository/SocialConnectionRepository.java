package com.socialflow.repository;

import com.socialflow.model.SocialConnection;
import com.socialflow.model.enums.PlatformType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SocialConnectionRepository extends JpaRepository<SocialConnection, UUID> {
    List<SocialConnection> findByBrandId(UUID brandId);

    // For upsert: find existing connection by brand + platform + accountId
    Optional<SocialConnection> findByBrandIdAndPlatformAndAccountId(UUID brandId, PlatformType platform, String accountId);

    boolean existsByBrandIdAndPlatform(UUID brandId, PlatformType platform);
}

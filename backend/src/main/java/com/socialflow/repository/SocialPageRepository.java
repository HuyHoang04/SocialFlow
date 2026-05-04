package com.socialflow.repository;

import com.socialflow.model.SocialPage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SocialPageRepository extends JpaRepository<SocialPage, UUID> {
    List<SocialPage> findByConnectionId(UUID connectionId);

    // For upsert: find existing page by connection + platformPageId
    Optional<SocialPage> findByConnectionIdAndPlatformPageId(UUID connectionId, String platformPageId);

    // Find all pages for a specific brand
    List<SocialPage> findByConnectionBrandId(UUID brandId);

    // For webhook: find page by platform-side ID (e.g. Facebook Page ID)
    List<SocialPage> findByPlatformPageId(String platformPageId);
}

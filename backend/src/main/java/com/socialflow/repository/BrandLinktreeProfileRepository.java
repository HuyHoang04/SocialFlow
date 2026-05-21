package com.socialflow.repository;

import com.socialflow.model.BrandLinktreeProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface BrandLinktreeProfileRepository extends JpaRepository<BrandLinktreeProfile, UUID> {

    Optional<BrandLinktreeProfile> findByBrandId(UUID brandId);

    Optional<BrandLinktreeProfile> findBySlug(String slug);

    /** Find by slug OR brand ID (brand ID used as fallback slug) */
    @Query("SELECT p FROM BrandLinktreeProfile p WHERE p.slug = :slug OR CAST(p.brand.id AS string) = :slug")
    Optional<BrandLinktreeProfile> findBySlugOrBrandId(@Param("slug") String slug);

    boolean existsBySlug(String slug);
}

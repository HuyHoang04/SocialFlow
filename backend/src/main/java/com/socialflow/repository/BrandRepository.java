package com.socialflow.repository;

import com.socialflow.model.Brand;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface BrandRepository extends JpaRepository<Brand, UUID> {
    List<Brand> findByUserId(UUID userId);
}

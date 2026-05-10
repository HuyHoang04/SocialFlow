package com.socialflow.repository;

import com.socialflow.model.BrandTeamMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BrandTeamMemberRepository extends JpaRepository<BrandTeamMember, UUID> {
    List<BrandTeamMember> findByBrandId(UUID brandId);
    List<BrandTeamMember> findByUserId(UUID userId);
    Optional<BrandTeamMember> findByBrandIdAndUserId(UUID brandId, UUID userId);
    boolean existsByBrandIdAndUserId(UUID brandId, UUID userId);
    void deleteByBrandIdAndUserId(UUID brandId, UUID userId);
}

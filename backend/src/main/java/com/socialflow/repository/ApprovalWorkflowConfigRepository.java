package com.socialflow.repository;

import com.socialflow.model.ApprovalWorkflowConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApprovalWorkflowConfigRepository extends JpaRepository<ApprovalWorkflowConfig, UUID> {
    Optional<ApprovalWorkflowConfig> findByBrandId(UUID brandId);
    boolean existsByBrandId(UUID brandId);
}

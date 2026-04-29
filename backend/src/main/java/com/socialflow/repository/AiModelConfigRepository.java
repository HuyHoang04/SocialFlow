package com.socialflow.repository;

import com.socialflow.model.AiModelConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AiModelConfigRepository extends JpaRepository<AiModelConfig, UUID> {
}

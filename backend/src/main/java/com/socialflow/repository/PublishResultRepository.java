package com.socialflow.repository;

import com.socialflow.model.PublishResult;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface PublishResultRepository extends JpaRepository<PublishResult, UUID> {
}

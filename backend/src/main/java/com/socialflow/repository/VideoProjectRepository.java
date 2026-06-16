package com.socialflow.repository;

import com.socialflow.model.VideoProject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface VideoProjectRepository extends JpaRepository<VideoProject, UUID> {
    List<VideoProject> findByBrandIdOrderByUpdatedAtDesc(UUID brandId);
}

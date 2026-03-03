package com.socialflow.repository;

import com.socialflow.model.PostAnalytics;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PostAnalyticsRepository extends JpaRepository<PostAnalytics, UUID> {
    List<PostAnalytics> findByPostIdOrderByFetchedAtDesc(UUID postId);
    Optional<PostAnalytics> findFirstByPostIdOrderByFetchedAtDesc(UUID postId);
    List<PostAnalytics> findByPostPageIdOrderByFetchedAtDesc(UUID pageId);
    List<PostAnalytics> findByPostPageConnectionBrandIdOrderByFetchedAtDesc(UUID brandId);
    void deleteByPostId(UUID postId);
}

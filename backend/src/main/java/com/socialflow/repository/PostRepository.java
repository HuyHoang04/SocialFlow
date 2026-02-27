package com.socialflow.repository;

import com.socialflow.model.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface PostRepository extends JpaRepository<Post, UUID> {
    List<Post> findByPageIdOrderByCreatedAtDesc(UUID pageId);
    List<Post> findByPageConnectionBrandUserIdOrderByCreatedAtDesc(UUID userId);
}

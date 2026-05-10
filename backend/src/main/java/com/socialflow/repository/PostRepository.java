package com.socialflow.repository;

import com.socialflow.model.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface PostRepository extends JpaRepository<Post, UUID> {
    List<Post> findByPageIdOrderByCreatedAtDesc(UUID pageId);
    List<Post> findByPageConnectionBrandUserIdOrderByCreatedAtDesc(UUID userId);
    List<Post> findByStatusAndScheduledTimeLessThanEqual(com.socialflow.model.enums.PostStatus status, java.time.LocalDateTime time);
    List<Post> findByCreatedByIdOrderByCreatedAtDesc(UUID createdById);
    List<Post> findByStatusAndPageConnectionBrandIdOrderByCreatedAtDesc(com.socialflow.model.enums.PostStatus status, UUID brandId);
    List<Post> findByPageConnectionBrandIdInOrderByCreatedAtDesc(java.util.List<UUID> brandIds);
}

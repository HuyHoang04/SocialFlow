package com.socialflow.repository;

import com.socialflow.model.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface PostRepository extends JpaRepository<Post, UUID> {
    @org.springframework.data.jpa.repository.Query("SELECT p FROM Post p " +
           "LEFT JOIN FETCH p.page pg " +
           "LEFT JOIN FETCH pg.connection c " +
           "LEFT JOIN FETCH c.brand b " +
           "LEFT JOIN FETCH p.campaign cp " +
           "LEFT JOIN FETCH p.createdBy u " +
           "WHERE pg.id = :pageId " +
           "ORDER BY p.createdAt DESC")
    List<Post> findByPageIdOrderByCreatedAtDesc(@org.springframework.data.repository.query.Param("pageId") UUID pageId);

    List<Post> findByPageConnectionBrandUserIdOrderByCreatedAtDesc(UUID userId);
    List<Post> findByStatusAndScheduledTimeLessThanEqual(com.socialflow.model.enums.PostStatus status, java.time.LocalDateTime time);
    List<Post> findByCreatedByIdOrderByCreatedAtDesc(UUID createdById);
    List<Post> findByStatusAndPageConnectionBrandIdOrderByCreatedAtDesc(com.socialflow.model.enums.PostStatus status, UUID brandId);

    @org.springframework.data.jpa.repository.Query("SELECT p FROM Post p " +
           "LEFT JOIN FETCH p.page pg " +
           "LEFT JOIN FETCH pg.connection c " +
           "LEFT JOIN FETCH c.brand b " +
           "LEFT JOIN FETCH p.campaign cp " +
           "LEFT JOIN FETCH p.createdBy u " +
           "WHERE b.id IN :brandIds " +
           "ORDER BY p.createdAt DESC")
    List<Post> findByPageConnectionBrandIdInOrderByCreatedAtDesc(@org.springframework.data.repository.query.Param("brandIds") java.util.List<UUID> brandIds);

    long countByPageConnectionBrandId(UUID brandId);
    long countByStatusAndPageConnectionBrandId(com.socialflow.model.enums.PostStatus status, UUID brandId);
}

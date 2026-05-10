package com.socialflow.repository;

import com.socialflow.model.PostApproval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PostApprovalRepository extends JpaRepository<PostApproval, UUID> {
    List<PostApproval> findByPostId(UUID postId);
    List<PostApproval> findByAssignedToId(UUID userId);
    Optional<PostApproval> findByPostIdAndApprovalLevel(UUID postId, int level);
    List<PostApproval> findByPostIdOrderByApprovalLevel(UUID postId);
    
    @Query("SELECT a FROM PostApproval a WHERE a.post.page.connection.brand.id = :brandId")
    List<PostApproval> findByBrandId(@Param("brandId") UUID brandId);
}

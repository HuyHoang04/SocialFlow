package com.socialflow.repository;

import com.socialflow.model.PostMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface PostMediaRepository extends JpaRepository<PostMedia, UUID> {
    List<PostMedia> findByUploaderIdOrderByCreatedAtDesc(UUID uploaderId);
}

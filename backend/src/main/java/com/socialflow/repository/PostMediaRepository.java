package com.socialflow.repository;

import com.socialflow.model.PostMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface PostMediaRepository extends JpaRepository<PostMedia, UUID> {
    List<PostMedia> findByUploaderIdOrderByCreatedAtDesc(UUID uploaderId);
    
    @org.springframework.data.jpa.repository.Query("SELECT m FROM PostMedia m WHERE m.filename = :filename AND m.uploader.id = :uploaderId ORDER BY m.createdAt DESC NULLS LAST")
    List<PostMedia> findByFilenameAndUploaderIdCustom(@org.springframework.data.repository.query.Param("filename") String filename, @org.springframework.data.repository.query.Param("uploaderId") UUID uploaderId);
}

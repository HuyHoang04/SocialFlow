package com.socialflow.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Stores uploaded files for RAG (Retrieval-Augmented Generation).
 * Files are processed by AI Service to extract text and generate embeddings.
 */
@Entity
@Table(name = "content_library_item")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ContentLibraryItem {

    @Id
    @Column(columnDefinition = "varchar(36)")
    private String id;

    @Column(name = "brand_id", nullable = false)
    private UUID brandId;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "file_type", nullable = false)
    private String fileType;

    @Column(nullable = false)
    private String category;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "storage_url", columnDefinition = "TEXT")
    private String storageUrl;

    @Column(name = "extracted_text", columnDefinition = "TEXT")
    private String extractedText;

    @Column(columnDefinition = "TEXT")
    private String metadata;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) id = UUID.randomUUID().toString();
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (isDeleted == null) isDeleted = false;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

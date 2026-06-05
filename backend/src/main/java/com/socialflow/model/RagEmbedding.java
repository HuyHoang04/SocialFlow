package com.socialflow.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Stores vector embeddings for RAG similarity search.
 * Each record represents one text chunk with its embedding vector.
 * Uses pgvector extension for vector similarity operations.
 */
@Entity
@Table(name = "rag_embedding")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RagEmbedding {

    @Id
    @Column(columnDefinition = "varchar(36)")
    private String id;

    @Column(name = "brand_id", nullable = false)
    private UUID brandId;

    @Column(name = "library_item_id", nullable = false)
    private String libraryItemId;

    @Column(name = "chunk_id", nullable = false)
    private Integer chunkId;

    @Column(name = "chunk_text", columnDefinition = "TEXT", nullable = false)
    private String chunkText;

    /**
     * Vector embedding stored as pgvector type.
     * Managed by AI Service (Python) via raw SQL.
     * Java side stores as String for read-only reference.
     */
    @Column(columnDefinition = "vector")
    private String embedding;

    @Column(length = 255)
    private String model;

    @Column(length = 100)
    private String provider;

    @Column(columnDefinition = "TEXT")
    private String metadata;

    @PrePersist
    protected void onCreate() {
        if (id == null) id = UUID.randomUUID().toString();
    }
}

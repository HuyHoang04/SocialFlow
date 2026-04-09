package com.socialflow.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "embeddings", indexes = {
    @Index(name = "idx_brand_id", columnList = "brand_id"),
    @Index(name = "idx_model", columnList = "model"),
    @Index(name = "idx_provider", columnList = "provider"),
    @Index(name = "idx_created_at", columnList = "created_at")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Embedding {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "brand_id", nullable = false)
    private UUID brandId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;

    @Column(columnDefinition = "vector(4096)")
    private String embedding;

    @Column(length = 255)
    private String model;

    @Column(length = 255)
    private String provider;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}

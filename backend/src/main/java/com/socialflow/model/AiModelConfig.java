package com.socialflow.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ai_model_config")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AiModelConfig {

    @Id
    @Column(name = "brand_id")
    private UUID brandId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "brand_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Brand brand;

    @Column(name = "text_provider")
    private String textProvider;

    @Column(name = "text_model")
    private String textModel;

    @Column(name = "image_provider")
    private String imageProvider;

    @Column(name = "image_model")
    private String imageModel;

    @Column(name = "embedding_provider")
    private String embeddingProvider;

    @Column(name = "embedding_model")
    private String embeddingModel;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

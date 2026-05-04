package com.socialflow.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "trending_config")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrendingConfig {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "brand_id", nullable = false)
    private UUID brandId;  // Foreign key to Brand
    
    @Column(name = "geo", nullable = false)
    private String geo;
    
    @Column(name = "source", nullable = false)
    private String source;  // 'google', 'facebook', 'twitter', etc
    
    @Column(name = "category_id")
    private String categoryId;  // For Google Trends
    
    @Column(name = "search_keyword")
    private String searchKeyword;  // For Facebook posts, user-defined keyword
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at", nullable = false)
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

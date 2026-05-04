package com.socialflow.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "trending_data")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrendingData {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "brand_id", nullable = false)
    private UUID brandId;  // Foreign key to Brand
    
    @Column(name = "geo", nullable = false)
    private String geo;
    
    @Column(name = "source", nullable = false)
    @Builder.Default
    private String source = "google";  // 'google', 'facebook', 'twitter', etc
    
    @Column(name = "category_id")
    private String categoryId;  // For Google Trends
    
    @Column(name = "search_keyword")
    private String searchKeyword;  // For Facebook posts
    
    @Column(name = "trending_searches", columnDefinition = "JSONB", nullable = false)
    @JdbcTypeCode(SqlTypes.JSON)
    private String trendingSearches; // JSON array of all items (trends or posts)
    
    @Column(name = "fetched_at", nullable = false)
    private LocalDateTime fetchedAt;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (fetchedAt == null) {
            fetchedAt = LocalDateTime.now();
        }
        if (source == null) {
            source = "google";
        }
    }
}

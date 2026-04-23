package com.socialflow.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;

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
    
    @Column(name = "geo", nullable = false)
    private String geo;
    
    @Column(name = "category_id")
    private String categoryId;
    
    @Column(name = "trending_searches", columnDefinition = "JSONB", nullable = false)
    @JdbcTypeCode(SqlTypes.JSON)
    private String trendingSearches; // JSON array of all trending searches from SerpAPI
    
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
    }
}

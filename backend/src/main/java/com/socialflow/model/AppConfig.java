package com.socialflow.model;

import com.socialflow.model.enums.PlatformType;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Stores platform-specific OAuth credentials per brand.
 * Allows users to configure their own App IDs and Secrets for each platform.
 */
@Entity
@Table(name = "app_configs", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"brand_id", "platform"})
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AppConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "brand_id", nullable = false)
    private Brand brand;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PlatformType platform;

    @Column(columnDefinition = "TEXT")
    private String appId;

    @Column(columnDefinition = "TEXT")
    private String appSecret;

    @Column(columnDefinition = "TEXT")
    private String redirectUri;

    @Column(columnDefinition = "TEXT")
    private String additionalConfig;  // JSON field for platform-specific config

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
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

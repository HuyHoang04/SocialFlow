package com.socialflow.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Standalone public profile / Linktree-style page for a brand.
 * Deliberately kept separate from Brand to avoid coupling.
 */
@Entity
@Table(name = "brand_linktree_profiles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BrandLinktreeProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** The brand this profile belongs to (1:1) */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "brand_id", nullable = false, unique = true)
    private Brand brand;

    /** URL-friendly slug: /p/{slug} */
    @Column(unique = true)
    private String slug;

    /** Optional bio override (uses brand.description if null) */
    @Column(columnDefinition = "TEXT")
    private String bio;

    /** Display name override (uses brand.name if null) */
    private String displayName;

    /** Website link label, e.g. "Visit our site" */
    private String websiteLabel;

    /**
     * Background preset key, e.g. "gradient-purple", "gradient-ocean",
     * "gradient-sunset", "gradient-forest", "gradient-night", "gradient-peach"
     */
    @Column(name = "bg_style")
    private String bgStyle;

    /** Custom uploaded background image URL (overrides bgStyle if present) */
    @Column(name = "bg_image_url", columnDefinition = "TEXT")
    private String bgImageUrl;

    /**
     * Button style: "rounded", "square", "pill"
     */
    @Column(name = "button_style")
    private String buttonStyle;

    /**
     * Serialised JSON array of custom links.
     * Format: [{"id": "uuid", "title": "My Link", "url": "https://...", "iconUrl": "https://...", "platform": "custom"}]
     */
    @Column(name = "custom_links", columnDefinition = "TEXT")
    private String customLinks;

    /** Whether this profile is publicly accessible */
    @Column(name = "is_published")
    private boolean published;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (bgStyle == null) bgStyle = "gradient-purple";
        if (buttonStyle == null) buttonStyle = "rounded";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

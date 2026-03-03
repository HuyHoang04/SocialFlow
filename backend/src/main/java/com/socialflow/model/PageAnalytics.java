package com.socialflow.model;

import com.socialflow.model.enums.PlatformType;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "page_analytics")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PageAnalytics {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "page_id", nullable = false)
    private SocialPage page;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PlatformType platform;

    @Builder.Default
    private Integer followers = 0;

    @Builder.Default
    private Integer totalPageLikes = 0;

    @Builder.Default
    private Integer pageViews = 0;

    @Builder.Default
    private Integer newFollowers = 0;

    @Builder.Default
    private Integer pageImpressions = 0;

    @Builder.Default
    private Integer pageEngagedUsers = 0;

    @Builder.Default
    private Integer postsCount = 0;

    @Builder.Default
    private Double avgEngagementRate = 0.0;

    @Column(nullable = false)
    private LocalDateTime fetchedAt;

    @PrePersist
    protected void onCreate() {
        if (fetchedAt == null) fetchedAt = LocalDateTime.now();
    }
}

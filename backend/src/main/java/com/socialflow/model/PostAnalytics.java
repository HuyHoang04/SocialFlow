package com.socialflow.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "post_analytics")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PostAnalytics {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    private String platformPostId;

    @Builder.Default
    private Integer likes = 0;

    @Builder.Default
    private Integer comments = 0;

    @Builder.Default
    private Integer shares = 0;

    @Builder.Default
    private Integer impressions = 0;

    @Builder.Default
    private Integer reach = 0;

    @Builder.Default
    private Integer engagedUsers = 0;

    @Builder.Default
    private Integer clicks = 0;

    @Builder.Default
    private Integer bookmarks = 0;

    @Builder.Default
    private Integer quotes = 0;

    @Builder.Default
    private Integer replies = 0;

    @Builder.Default
    private Integer views = 0;

    @Builder.Default
    private Double engagementRate = 0.0;

    @Column(nullable = false)
    private LocalDateTime fetchedAt;

    @PrePersist
    protected void onCreate() {
        if (fetchedAt == null) fetchedAt = LocalDateTime.now();
    }
}

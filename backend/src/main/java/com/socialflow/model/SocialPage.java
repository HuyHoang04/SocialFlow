package com.socialflow.model;

import com.socialflow.model.enums.PlatformType;
import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "social_pages")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SocialPage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String platformPageId;

    @Column(nullable = false)
    private String pageName;

    @Column(columnDefinition = "TEXT")
    private String pageImageUrl;

    @Column(columnDefinition = "TEXT")
    private String pageAccessToken;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PlatformType platform;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "connection_id", nullable = false)
    private SocialConnection connection;

    @OneToMany(mappedBy = "page", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Post> posts = new ArrayList<>();

    @OneToMany(mappedBy = "page", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PageAnalytics> pageAnalytics = new ArrayList<>();

    @OneToMany(mappedBy = "page", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<InboxMessage> inboxMessages = new ArrayList<>();
}

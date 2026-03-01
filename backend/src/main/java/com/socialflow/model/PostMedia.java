package com.socialflow.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "post_media")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PostMedia {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id")
    private Post post;

    @Column(nullable = false)
    private String filename;        // UUID-based stored name (e.g. abc123.jpg)

    @Column(nullable = false)
    private String originalName;    // User's original filename

    @Column(nullable = false)
    private String contentType;     // image/jpeg, video/mp4, etc.

    private Long fileSize;          // bytes

    @Column(nullable = false)
    private String url;             // /api/media/abc123.jpg

    @Column(nullable = false)
    private int sortOrder;          // ordering within a post
}

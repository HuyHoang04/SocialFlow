package com.socialflow.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "video_scenes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VideoScene {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String script;

    private String gesture;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private Boolean isMoving = false;

    private String mediaUrl;

    private Double mediaScale;

    private Integer mediaWidth;

    private Integer mediaHeight;

    // We store arrays as comma-separated strings or JSON. Since it's just [x, y, z], a string is fine.
    private String cameraPosition; // e.g. "0,0,4"
    private String cameraTarget;   // e.g. "0,0,0"

    @Column(columnDefinition = "TEXT")
    private String snapshotUrl; // Base64 or URL of the scene snapshot

    @Column(nullable = false)
    private Integer orderIndex;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private VideoProject project;
}

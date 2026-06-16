package com.socialflow.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VideoSceneDTO {
    private UUID id;
    private String title;
    private String script;
    private String gesture;
    private Boolean isMoving;
    private String mediaUrl;
    private Double mediaScale;
    private Integer mediaWidth;
    private Integer mediaHeight;
    private String cameraPosition;
    private String cameraTarget;
    private String snapshotUrl;
    private Integer orderIndex;
}

package com.socialflow.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VideoProjectDTO {
    private UUID id;
    private String title;
    private String avatarUrl;
    private String voiceUri;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID brandId;
    private List<VideoSceneDTO> scenes;
}

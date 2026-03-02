package com.socialflow.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class PlatformCommentDto {
    private String platformMessageId;
    private String platformPostId;
    private String content;
    private String authorName;
    private String parentMessageId;
    private LocalDateTime createdAt;
}

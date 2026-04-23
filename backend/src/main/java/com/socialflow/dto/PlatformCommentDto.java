package com.socialflow.dto;

import com.socialflow.model.enums.MessageType;
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
    private String authorId;
    private String parentMessageId;
    private LocalDateTime createdAt;
    private MessageType messageType;
    private String conversationId;

    @Builder.Default
    private Integer likeCount = 0;
}

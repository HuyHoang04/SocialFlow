package com.socialflow.dto;

import com.socialflow.model.enums.PlatformType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class InboxMessageResponse {
    private UUID id;
    private String platformMessageId;
    private String platformPostId;
    private String content;
    private String authorName;
    private String parentMessageId;
    private String authorProfilePic;
    private LocalDateTime createdAt;
    private Boolean isRead;
    private Boolean isFromMe;
    
    // Context about where the message came from
    private UUID pageId;
    private String pageName;
    private PlatformType platform;
}

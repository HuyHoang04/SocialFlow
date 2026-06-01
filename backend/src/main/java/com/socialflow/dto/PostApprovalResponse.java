package com.socialflow.dto;

import com.socialflow.model.enums.ApprovalStatus;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder
public class PostApprovalResponse {
    private UUID id;
    private UUID postId;
    private UUID groupId;
    private String content;
    private String pageName;
    private String platform;
    private String createdByName;
    private String createdByEmail;
    private UUID assignedToUserId;
    private String assignedToName;
    private String assignedToEmail;
    private int approvalLevel;
    private ApprovalStatus status;
    private LocalDateTime createdAt;
    private String comment;
    private LocalDateTime approvedAt;
}

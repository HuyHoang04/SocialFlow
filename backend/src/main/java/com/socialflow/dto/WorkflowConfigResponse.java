package com.socialflow.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data @Builder
public class WorkflowConfigResponse {
    private boolean enabled;
    private int approvalLevels;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

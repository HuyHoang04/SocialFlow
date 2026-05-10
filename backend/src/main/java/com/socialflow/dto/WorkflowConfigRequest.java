package com.socialflow.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class WorkflowConfigRequest {
    @NotNull(message = "Enabled flag is required")
    private Boolean enabled;

    @NotNull(message = "Approval levels is required")
    @Min(value = 1, message = "Approval levels must be at least 1")
    private Integer approvalLevels;  // 1 or 2
}

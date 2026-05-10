package com.socialflow.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

@Data
public class SubmitForApprovalRequest {
    @NotNull(message = "Assigned to user ID is required")
    private UUID assignedToUserId;
}

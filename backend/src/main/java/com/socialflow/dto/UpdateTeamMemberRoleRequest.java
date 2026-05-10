package com.socialflow.dto;

import com.socialflow.model.enums.UserRole;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateTeamMemberRoleRequest {
    @NotNull(message = "Role is required")
    private UserRole role;
}

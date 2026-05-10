package com.socialflow.dto;

import com.socialflow.model.enums.UserRole;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder
public class TeamMemberResponse {
    private UUID userId;
    private String email;
    private String name;
    private String profilePictureUrl;
    private UserRole role;
    private LocalDateTime joinedAt;
    private boolean isAdmin;
}

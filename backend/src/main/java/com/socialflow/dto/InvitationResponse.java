package com.socialflow.dto;

import com.socialflow.model.enums.UserRole;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder
public class InvitationResponse {
    private UUID id;
    private String email;
    private String brandName;
    private UUID brandId;
    private UserRole role;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
    private boolean accepted;
    private LocalDateTime acceptedAt;
    private String invitationLink;  // Frontend URL with token
}

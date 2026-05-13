package com.socialflow.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AcceptInvitationResponse {
    private UUID invitationId;
    private UUID brandId;
    private String brandName;
    private String role;
    private String token;  // Updated JWT token with new brand role
}

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
public class TeamMemberChangeResponse {
    private UUID userId;
    private UUID brandId;
    private String role;
    private String token;  // Updated JWT token with new/updated brand role
}

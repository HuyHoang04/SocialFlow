package com.socialflow.dto;

import lombok.Data;

/**
 * Minimal request for accepting an invitation.
 * User ID is extracted from the JWT auth token in the controller.
 * The invitation token comes from the URL path.
 */
@Data
public class AcceptInvitationRequest {
    // Body is intentionally empty - user info comes from JWT
}

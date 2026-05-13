package com.socialflow.controller;

import com.socialflow.dto.AcceptInvitationRequest;
import com.socialflow.dto.AcceptInvitationResponse;
import com.socialflow.dto.InvitationResponse;
import com.socialflow.model.UserInvitation;
import com.socialflow.model.User;
import com.socialflow.security.JwtUtil;
import com.socialflow.service.UserInvitationService;
import com.socialflow.service.BrandTeamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/invitations")
@RequiredArgsConstructor
public class InvitationController {

    private final UserInvitationService userInvitationService;
    private final BrandTeamService brandTeamService;
    private final JwtUtil jwtUtil;

    @GetMapping("/token/{token}")
    public ResponseEntity<InvitationResponse> getInvitationByToken(@PathVariable String token) {
        // Public endpoint - no auth required to view invitation details
        InvitationResponse response = userInvitationService.getInvitationByToken(token);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/token/{token}/accept")
    public ResponseEntity<AcceptInvitationResponse> acceptInvitation(
            @AuthenticationPrincipal User user,
            @PathVariable String token,
            @Valid @RequestBody AcceptInvitationRequest request) {
        // Accept the invitation
        UserInvitation invitation = userInvitationService.acceptInvitation(token, user.getId());
        
        // Get updated brand roles for the user
        Map<String, String> brandRoles = brandTeamService.getBrandRolesForUser(user.getId());
        
        // Generate new JWT token with updated brand roles
        String newToken = jwtUtil.generateToken(user.getId(), user.getEmail(), brandRoles);
        
        // Build response
        AcceptInvitationResponse response = AcceptInvitationResponse.builder()
                .invitationId(invitation.getId())
                .brandId(invitation.getBrand().getId())
                .brandName(invitation.getBrand().getName())
                .role(invitation.getRole().name())
                .token(newToken)
                .build();
        
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{invitationId}")
    public ResponseEntity<Void> cancelInvitation(
            @AuthenticationPrincipal User user,
            @PathVariable UUID invitationId) {
        userInvitationService.cancelInvitation(invitationId, user.getId());
        return ResponseEntity.noContent().build();
    }
}

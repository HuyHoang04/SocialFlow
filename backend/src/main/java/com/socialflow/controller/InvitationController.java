package com.socialflow.controller;

import com.socialflow.dto.AcceptInvitationRequest;
import com.socialflow.dto.InvitationResponse;
import com.socialflow.model.UserInvitation;
import com.socialflow.model.User;
import com.socialflow.service.UserInvitationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/invitations")
@RequiredArgsConstructor
public class InvitationController {

    private final UserInvitationService userInvitationService;

    @GetMapping("/token/{token}")
    public ResponseEntity<InvitationResponse> getInvitationByToken(@PathVariable String token) {
        // Public endpoint - no auth required to view invitation details
        InvitationResponse response = userInvitationService.getInvitationByToken(token);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/token/{token}/accept")
    public ResponseEntity<InvitationResponse> acceptInvitation(
            @AuthenticationPrincipal User user,
            @PathVariable String token,
            @Valid @RequestBody AcceptInvitationRequest request) {
        userInvitationService.acceptInvitation(token, user.getId());
        InvitationResponse response = userInvitationService.getInvitationByToken(token);
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

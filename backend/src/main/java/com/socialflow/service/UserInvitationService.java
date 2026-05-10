package com.socialflow.service;

import com.socialflow.constants.ErrorMessages;
import com.socialflow.dto.InvitationResponse;
import com.socialflow.dto.WorkflowConfigResponse;
import com.socialflow.model.Brand;
import com.socialflow.model.BrandTeamMember;
import com.socialflow.model.User;
import com.socialflow.model.UserInvitation;
import com.socialflow.model.enums.UserRole;
import com.socialflow.repository.BrandRepository;
import com.socialflow.repository.UserInvitationRepository;
import com.socialflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserInvitationService {

    private final UserInvitationRepository invitationRepository;
    private final BrandTeamService brandTeamService;
    private final UserRepository userRepository;
    private final BrandRepository brandRepository;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    private static final int TOKEN_LENGTH = 64;
    private static final String TOKEN_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final SecureRandom random = new SecureRandom();

    /**
     * Generate random 64-character token
     */
    private String generateToken() {
        StringBuilder token = new StringBuilder(TOKEN_LENGTH);
        for (int i = 0; i < TOKEN_LENGTH; i++) {
            token.append(TOKEN_CHARACTERS.charAt(random.nextInt(TOKEN_CHARACTERS.length())));
        }
        return token.toString();
    }

    /**
     * Create a new invitation for someone to join a brand
     */
    @Transactional
    public InvitationResponse createInvitation(UUID brandId, String email, UserRole role) {
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new RuntimeException("Brand not found: " + brandId));

        if (role == UserRole.ADMIN) {
            throw new RuntimeException("Cannot invite as ADMIN role. ADMIN must be set directly.");
        }

        String token = generateToken();

        UserInvitation invitation = UserInvitation.builder()
                .brand(brand)
                .email(email)
                .token(token)
                .role(role)
                .build();

        invitation = invitationRepository.save(invitation);
        log.info("Created invitation for email {} to brand {} with role {}", email, brandId, role);
        return toInvitationResponse(invitation, token);
    }

    /**
     * Accept an invitation and add user to brand
     */
    @Transactional
    public void acceptInvitation(String token, UUID userId) {
        UserInvitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Invitation token not found or invalid"));

        // Check if expired
        if (LocalDateTime.now().isAfter(invitation.getExpiresAt())) {
            throw new RuntimeException("Invitation has expired");
        }

        // Check if already accepted
        if (invitation.getAcceptedAt() != null) {
            throw new RuntimeException("Invitation has already been accepted");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        // Validate user email matches invitation email
        if (!user.getEmail().equalsIgnoreCase(invitation.getEmail())) {
            throw new RuntimeException("User email does not match invitation email. Expected: " + invitation.getEmail() + ", Got: " + user.getEmail());
        }

        // Add user to brand with invited role
        try {
            brandTeamService.addTeamMember(invitation.getBrand().getId(), userId, invitation.getRole());
        } catch (RuntimeException e) {
            if (e.getMessage().contains("already a member")) {
                throw new RuntimeException("User is already a member of this brand");
            }
            throw e;
        }

        // Mark invitation as accepted
        invitation.setAcceptedAt(LocalDateTime.now());
        invitation.setAcceptedByUser(user);
        invitationRepository.save(invitation);

        log.info("User {} accepted invitation to brand {}", userId, invitation.getBrand().getId());
    }

    /**
     * Get invitation details by token (public endpoint)
     */
    public InvitationResponse getInvitationByToken(String token) {
        UserInvitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Invitation token not found or invalid"));

        // Check if expired
        if (LocalDateTime.now().isAfter(invitation.getExpiresAt())) {
            throw new RuntimeException("Invitation has expired");
        }

        return toInvitationResponse(invitation, token);
    }

    /**
     * Get all pending (not yet accepted) invitations for a brand
     */
    public List<InvitationResponse> getPendingInvitations(UUID brandId) {
        List<UserInvitation> invitations = invitationRepository.findByBrandIdAndAcceptedAtIsNull(brandId);
        return invitations.stream()
                .map(inv -> toInvitationResponse(inv, inv.getToken()))
                .collect(Collectors.toList());
    }

    /**
     * Get all invitations for a specific email in a brand
     */
    public List<UserInvitation> getInvitationsByEmail(UUID brandId, String email) {
        return invitationRepository.findByEmailAndBrandId(email, brandId);
    }

    /**
     * Cancel an invitation (delete it)
     */
    @Transactional
    public void cancelInvitation(UUID invitationId, UUID userId) {
        UserInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new RuntimeException("Invitation not found"));
        
        // Check if user is ADMIN of the brand that created this invitation
        if (!brandTeamService.hasRoleInBrand(userId, invitation.getBrand().getId(), UserRole.ADMIN)) {
            throw new RuntimeException(ErrorMessages.NOT_AUTHORIZED);
        }

        invitationRepository.delete(invitation);
        log.info("Cancelled invitation {} for email {}", invitationId, invitation.getEmail());
    }

    /**
     * Delete expired invitations (cleanup)
     */
    @Transactional
    public void cleanupExpiredInvitations() {
        LocalDateTime now = LocalDateTime.now();
        // This would require a custom query - for now, you can call this manually
        log.info("Cleanup of expired invitations would run here");
    }

    /**
     * Get workflow config for a brand (delegates to ApprovalWorkflowService)
     */
    public WorkflowConfigResponse getWorkflowConfig(UUID brandId) {
        // This delegates to ApprovalWorkflowService in BrandController
        throw new RuntimeException("Use ApprovalWorkflowService.getWorkflowConfig instead");
    }

    /**
     * Update workflow config for a brand (delegates to ApprovalWorkflowService)
     */
    public WorkflowConfigResponse updateWorkflowConfig(UUID brandId, boolean enabled, int approvalLevels) {
        // This delegates to ApprovalWorkflowService in BrandController
        throw new RuntimeException("Use ApprovalWorkflowService.updateWorkflowConfig instead");
    }

    /**
     * Convert UserInvitation to InvitationResponse DTO
     */
    private InvitationResponse toInvitationResponse(UserInvitation invitation, String token) {
        return InvitationResponse.builder()
                .id(invitation.getId())
                .email(invitation.getEmail())
                .brandName(invitation.getBrand().getName())
                .brandId(invitation.getBrand().getId())
                .role(invitation.getRole())
                .expiresAt(invitation.getExpiresAt())
                .createdAt(invitation.getCreatedAt())
                .accepted(invitation.getAcceptedAt() != null)
                .acceptedAt(invitation.getAcceptedAt())
                .invitationLink(frontendUrl + "/join?token=" + token)
                .build();
    }
}

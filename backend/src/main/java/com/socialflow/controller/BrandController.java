package com.socialflow.controller;

import com.socialflow.constants.ErrorMessages;
import com.socialflow.dto.*;
import com.socialflow.model.Brand;
import com.socialflow.model.BrandTeamMember;
import com.socialflow.model.ApprovalWorkflowConfig;
import com.socialflow.model.User;
import com.socialflow.model.enums.UserRole;
import com.socialflow.security.JwtUtil;
import com.socialflow.service.BrandService;
import com.socialflow.service.BrandTeamService;
import com.socialflow.service.BrandSuggestionService;
import com.socialflow.service.UserInvitationService;
import com.socialflow.service.ApprovalWorkflowService;
import com.socialflow.service.CloudinaryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/brands")
@RequiredArgsConstructor
public class BrandController {

    private final BrandService brandService;
    private final BrandTeamService brandTeamService;
    private final UserInvitationService userInvitationService;
    private final ApprovalWorkflowService approvalWorkflowService;
    private final BrandSuggestionService brandSuggestionService;
    private final JwtUtil jwtUtil;
    private final CloudinaryService cloudinaryService;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getBrands(@AuthenticationPrincipal User user) {
        List<Brand> brands = brandService.getBrandsByUser(user);
        return ResponseEntity.ok(brands.stream().map(this::toMap).collect(Collectors.toList()));
    }

    @PostMapping
    public ResponseEntity<CreateBrandResponse> createBrand(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateBrandRequest request) {
        Brand brand = brandService.createBrand(user, request);
        
        // Get all brand roles for this user (includes the newly created brand with ADMIN role)
        Map<String, String> brandRoles = brandTeamService.getBrandRolesForUser(user.getId());
        
        // Generate new JWT token with updated brand roles
        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), brandRoles);
        
        // Build response with brand data and new token
        CreateBrandResponse response = CreateBrandResponse.builder()
                .id(brand.getId())
                .name(brand.getName())
                .description(brand.getDescription())
                .logoUrl(brand.getLogoUrl())
                .website(brand.getWebsite())
                .contactEmail(brand.getContactEmail())
                .phone(brand.getPhone())
                .industry(brand.getIndustry())
                .country(brand.getCountry())
                .brandSlogan(brand.getBrandSlogan())
                .primaryColor(brand.getPrimaryColor())
                .secondaryColor(brand.getSecondaryColor())
                .connectionCount((long) brand.getConnections().size())
                .token(token)
                .build();
        
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBrand(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        brandService.deleteBrand(id, user);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateBrand(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody CreateBrandRequest request) {
        Brand brand = brandService.updateBrand(id, user, request);
        return ResponseEntity.ok(toMap(brand));
    }

    /**
     * Upload brand logo to Cloudinary.
     */
    @PostMapping("/{id}/logo")
    public ResponseEntity<Map<String, Object>> uploadBrandLogo(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file) throws IOException {
        if (!brandTeamService.hasRoleInBrand(user.getId(), id, UserRole.MANAGER)) {
            throw new RuntimeException("Only brand ADMIN or MANAGER can update the logo");
        }
        if (file.isEmpty()) {
            throw new RuntimeException("File is empty");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new RuntimeException("Only image files are allowed");
        }

        String logoUrl = cloudinaryService.uploadBrandLogo(file, id.toString());
        Brand brand = brandService.updateBrandLogo(id, logoUrl);
        return ResponseEntity.ok(toMap(brand));
    }

    /**
     * Delete brand logo.
     */
    @DeleteMapping("/{id}/logo")
    public ResponseEntity<Map<String, String>> deleteBrandLogo(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        if (!brandTeamService.hasRoleInBrand(user.getId(), id, UserRole.MANAGER)) {
            throw new RuntimeException("Only brand ADMIN or MANAGER can delete the logo");
        }
        brandService.removeBrandLogo(id);
        cloudinaryService.deleteBrandLogo(id.toString());
        return ResponseEntity.ok(Map.of("message", "Brand logo deleted"));
    }

    // Brand Suggestion Endpoint
    @PostMapping("/suggestions/generate")
    public ResponseEntity<BrandSuggestionResponse> generateSuggestions(
            @Valid @RequestBody BrandSuggestionRequest request) {
        BrandSuggestionResponse suggestions = brandSuggestionService.generateSuggestions(request);
        return ResponseEntity.ok(suggestions);
    }

    // Team Management Endpoints
    @PostMapping("/{id}/team")
    public ResponseEntity<TeamMemberResponse> addTeamMember(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody AddTeamMemberRequest request) {
        // TODO: Check if user is ADMIN in this brand
        // TODO: This should look up user by email or create invitation instead
        // For now, throw error
        throw new RuntimeException("Direct team member add by email not implemented - use invitations instead");
    }

    @GetMapping("/{id}/team")
    public ResponseEntity<List<TeamMemberResponse>> getTeamMembers(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        List<BrandTeamMember> members = brandTeamService.getTeamMembers(id);
        return ResponseEntity.ok(members.stream().map(this::toTeamMemberResponse).collect(Collectors.toList()));
    }

    @PatchMapping("/{id}/team/{userId}")
    public ResponseEntity<TeamMemberChangeResponse> updateTeamMemberRole(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateTeamMemberRoleRequest request) {
        // Check if user is ADMIN or MANAGER in this brand
        UserRole userRole = brandTeamService.getUserRoleInBrand(user.getId(), id);
        if (userRole != UserRole.ADMIN && userRole != UserRole.MANAGER) {
            throw new RuntimeException(ErrorMessages.NOT_AUTHORIZED);
        }
        
        // MANAGER can only assign CREATOR role
        if (userRole == UserRole.MANAGER && request.getRole() != UserRole.CREATOR) {
            throw new RuntimeException("Managers can only assign Creator role");
        }
        
        BrandTeamMember member = brandTeamService.updateMemberRole(id, userId, request.getRole());
        
        // Get the affected user
        User affectedUser = member.getUser();
        
        // Generate updated token for the affected user (in case they're currently logged in)
        Map<String, String> brandRoles = brandTeamService.getBrandRolesForUser(affectedUser.getId());
        String newToken = jwtUtil.generateToken(affectedUser.getId(), affectedUser.getEmail(), brandRoles);
        
        TeamMemberChangeResponse response = TeamMemberChangeResponse.builder()
                .userId(userId)
                .brandId(id)
                .role(request.getRole().name())
                .token(newToken)
                .build();
        
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}/team/{userId}")
    public ResponseEntity<Void> removeTeamMember(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @PathVariable UUID userId) {
        // Check if user is ADMIN or MANAGER in this brand
        UserRole userRole = brandTeamService.getUserRoleInBrand(user.getId(), id);
        if (userRole != UserRole.ADMIN && userRole != UserRole.MANAGER) {
            throw new RuntimeException(ErrorMessages.NOT_AUTHORIZED);
        }
        
        // Get the member to check their role
        BrandTeamMember memberToRemove = brandTeamService.getTeamMembers(id).stream()
                .filter(m -> m.getUser().getId().equals(userId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Team member not found"));
        
        // MANAGER can only remove CREATOR role members
        if (userRole == UserRole.MANAGER && memberToRemove.getRole() != UserRole.CREATOR) {
            throw new RuntimeException("Managers can only remove Creator role members");
        }
        
        brandTeamService.removeTeamMember(id, userId);
        return ResponseEntity.noContent().build();
    }

    // Invitation Endpoints
    @PostMapping("/{id}/invitations")
    public ResponseEntity<InvitationResponse> createInvitation(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody CreateInvitationRequest request) {
        // Check if user is ADMIN or MANAGER in this brand
        UserRole userRole = brandTeamService.getUserRoleInBrand(user.getId(), id);
        if (userRole != UserRole.ADMIN && userRole != UserRole.MANAGER) {
            throw new RuntimeException("Only brand ADMIN or MANAGER can create invitations");
        }
        
        // MANAGER can only invite CREATOR role
        if (userRole == UserRole.MANAGER && request.getRole() != UserRole.CREATOR) {
            throw new RuntimeException("Managers can only invite members with Creator role");
        }
        
        InvitationResponse response = userInvitationService.createInvitation(id, request.getEmail(), request.getRole());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/invitations")
    public ResponseEntity<List<InvitationResponse>> getPendingInvitations(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        // Check if user is ADMIN or MANAGER in this brand
        if (!brandTeamService.hasRoleInBrand(user.getId(), id, UserRole.MANAGER)) {
            throw new RuntimeException("Only brand ADMIN or MANAGER can view invitations");
        }
        
        List<InvitationResponse> invitations = userInvitationService.getPendingInvitations(id);
        return ResponseEntity.ok(invitations);
    }

    // Workflow Config Endpoints
    @GetMapping("/{id}/workflow-config")
    public ResponseEntity<WorkflowConfigResponse> getWorkflowConfig(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        // TODO: Check if user has access to this brand
        ApprovalWorkflowConfig config = approvalWorkflowService.getWorkflowConfig(id);
        return ResponseEntity.ok(toWorkflowConfigResponse(config));
    }

    @PutMapping("/{id}/workflow-config")
    public ResponseEntity<WorkflowConfigResponse> updateWorkflowConfig(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody WorkflowConfigRequest request) {
        // Check if user is ADMIN or MANAGER in this brand
        if (!brandTeamService.hasRoleInBrand(user.getId(), id, UserRole.MANAGER)) {
            throw new RuntimeException("Only brand ADMIN or MANAGER can update workflow config");
        }
        
        ApprovalWorkflowConfig config = approvalWorkflowService.updateWorkflowConfig(id, request.getEnabled(), request.getApprovalLevels());
        return ResponseEntity.ok(toWorkflowConfigResponse(config));
    }

    private TeamMemberResponse toTeamMemberResponse(BrandTeamMember member) {
        return TeamMemberResponse.builder()
                .userId(member.getUser().getId())
                .email(member.getUser().getEmail())
                .name(member.getUser().getName())
                .role(member.getRole())
                .joinedAt(member.getCreatedAt())
                .isAdmin(member.getRole() == UserRole.ADMIN)
                .build();
    }

    private WorkflowConfigResponse toWorkflowConfigResponse(ApprovalWorkflowConfig config) {
        return WorkflowConfigResponse.builder()
                .enabled(config.isEnabled())
                .approvalLevels(config.getApprovalLevels())
                .createdAt(config.getCreatedAt())
                .updatedAt(config.getUpdatedAt())
                .build();
    }

    private Map<String, Object> toMap(Brand brand) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", brand.getId());
        map.put("name", brand.getName());
        map.put("description", brand.getDescription());
        map.put("logoUrl", brand.getLogoUrl());
        map.put("website", brand.getWebsite());
        map.put("contactEmail", brand.getContactEmail());
        map.put("phone", brand.getPhone());
        map.put("industry", brand.getIndustry());
        map.put("country", brand.getCountry());
        map.put("brandSlogan", brand.getBrandSlogan());
        map.put("primaryColor", brand.getPrimaryColor());
        map.put("secondaryColor", brand.getSecondaryColor());
        map.put("createdAt", brand.getCreatedAt());
        map.put("connectionCount", brand.getConnections().size());
        return map;
    }
}

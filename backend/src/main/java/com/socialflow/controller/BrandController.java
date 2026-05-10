package com.socialflow.controller;

import com.socialflow.dto.*;
import com.socialflow.model.Brand;
import com.socialflow.model.BrandTeamMember;
import com.socialflow.model.ApprovalWorkflowConfig;
import com.socialflow.model.User;
import com.socialflow.model.enums.UserRole;
import com.socialflow.service.BrandService;
import com.socialflow.service.BrandTeamService;
import com.socialflow.service.UserInvitationService;
import com.socialflow.service.ApprovalWorkflowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

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

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getBrands(@AuthenticationPrincipal User user) {
        List<Brand> brands = brandService.getBrandsByUser(user);
        return ResponseEntity.ok(brands.stream().map(this::toMap).collect(Collectors.toList()));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createBrand(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateBrandRequest request) {
        Brand brand = brandService.createBrand(user, request);
        return ResponseEntity.ok(toMap(brand));
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
    public ResponseEntity<TeamMemberResponse> updateTeamMemberRole(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateTeamMemberRoleRequest request) {
        // TODO: Check if user is ADMIN in this brand
        BrandTeamMember member = brandTeamService.updateMemberRole(id, userId, request.getRole());
        return ResponseEntity.ok(toTeamMemberResponse(member));
    }

    @DeleteMapping("/{id}/team/{userId}")
    public ResponseEntity<Void> removeTeamMember(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @PathVariable UUID userId) {
        // TODO: Check if user is ADMIN in this brand
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
        if (!brandTeamService.hasRoleInBrand(user.getId(), id, UserRole.MANAGER)) {
            throw new RuntimeException("Only brand ADMIN or MANAGER can create invitations");
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
        // TODO: Check if user is ADMIN in this brand
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
        map.put("createdAt", brand.getCreatedAt());
        map.put("connectionCount", brand.getConnections().size());
        return map;
    }
}

package com.socialflow.controller;

import com.socialflow.dto.ApprovePostRequest;
import com.socialflow.dto.PostApprovalResponse;
import com.socialflow.dto.PostResponse;
import com.socialflow.dto.RejectPostRequest;
import com.socialflow.model.PostApproval;
import com.socialflow.model.Post;
import com.socialflow.model.User;
import com.socialflow.service.ApprovalWorkflowService;
import com.socialflow.service.BrandTeamService;
import com.socialflow.service.PostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/approvals")
@RequiredArgsConstructor
public class ApprovalController {

    private final ApprovalWorkflowService approvalWorkflowService;
    private final PostService postService;
    private final BrandTeamService brandTeamService;

    @PostMapping("/{approvalId}/approve")
    public ResponseEntity<PostApprovalResponse> approvePost(
            @AuthenticationPrincipal User user,
            @PathVariable UUID approvalId,
            @Valid @RequestBody ApprovePostRequest request) {
        // TODO: Check if user is assigned to this approval
        approvalWorkflowService.approvePost(approvalId, user.getId(), request.getComment());
        // Return updated approval
        PostApproval approval = approvalWorkflowService.getApprovalById(approvalId);
        return ResponseEntity.ok(toResponse(approval));
    }

    @PostMapping("/{approvalId}/reject")
    public ResponseEntity<PostApprovalResponse> rejectPost(
            @AuthenticationPrincipal User user,
            @PathVariable UUID approvalId,
            @Valid @RequestBody RejectPostRequest request) {
        // TODO: Check if user is assigned to this approval
        approvalWorkflowService.rejectPost(approvalId, user.getId(), request.getComment());
        // Return updated approval
        PostApproval approval = approvalWorkflowService.getApprovalById(approvalId);
        return ResponseEntity.ok(toResponse(approval));
    }

    @GetMapping("/user/{userId}/brand/{brandId}")
    public ResponseEntity<List<PostResponse>> getPendingApprovalsForUser(
            @AuthenticationPrincipal User user,
            @PathVariable UUID userId,
            @PathVariable UUID brandId) {
        // Check if user is accessing their own approvals
        if (!user.getId().equals(userId)) {
            throw new RuntimeException("Cannot access other user's approvals");
        }
        List<Post> posts = approvalWorkflowService.getPendingApprovalsForUser(userId, brandId);
        return ResponseEntity.ok(posts.stream().map(p -> postService.getPostById(p.getId())).collect(Collectors.toList()));
    }

    @GetMapping("/user/{userId}/brand/{brandId}/kanban")
    public ResponseEntity<List<PostApprovalResponse>> getAllApprovalsForUser(
            @AuthenticationPrincipal User user,
            @PathVariable UUID userId,
            @PathVariable UUID brandId) {
        // Check if user is accessing their own approvals
        if (!user.getId().equals(userId)) {
            throw new RuntimeException("Cannot access other user's approvals");
        }
        List<PostApproval> approvals = approvalWorkflowService.getAllApprovalsForUser(userId, brandId);
        return ResponseEntity.ok(approvals.stream().map(this::toResponse).collect(Collectors.toList()));
    }

    @GetMapping("/post/{postId}")
    public ResponseEntity<List<PostApprovalResponse>> getPostApprovals(
            @AuthenticationPrincipal User user,
            @PathVariable UUID postId) {
        // Check if user has access to this post's brand
        PostApproval sampleApproval = approvalWorkflowService.getPostApprovals(postId).stream().findFirst()
                .orElseThrow(() -> new RuntimeException("No approvals found for this post"));
        UUID brandId = sampleApproval.getPost().getPage().getConnection().getBrand().getId();
        if (!brandTeamService.canUserAccessBrand(user.getId(), brandId)) {
            throw new RuntimeException("User does not have access to this post");
        }
        List<PostApproval> approvals = approvalWorkflowService.getPostApprovals(postId);
        return ResponseEntity.ok(approvals.stream().map(this::toResponse).collect(Collectors.toList()));
    }

    private PostApprovalResponse toResponse(PostApproval approval) {
        com.socialflow.model.SocialPage page = approval.getPost().getPage();
        return PostApprovalResponse.builder()
                .id(approval.getId())
                .postId(approval.getPost().getId())
                .groupId(approval.getPost().getGroupId())
                .content(approval.getPost().getContent())
                .pageName(page != null ? page.getPageName() : null)
                .platform(page != null ? page.getPlatform().name() : null)
                .createdByName(approval.getPost().getCreatedBy() != null ? approval.getPost().getCreatedBy().getName() : "Unknown")
                .createdByEmail(approval.getPost().getCreatedBy() != null ? approval.getPost().getCreatedBy().getEmail() : "")
                .assignedToUserId(approval.getAssignedTo().getId())
                .assignedToName(approval.getAssignedTo().getName())
                .assignedToEmail(approval.getAssignedTo().getEmail())
                .approvalLevel(approval.getApprovalLevel())
                .status(approval.getStatus())
                .createdAt(approval.getCreatedAt())
                .comment(approval.getComment())
                .approvedAt(approval.getApprovedAt())
                .build();
    }
}

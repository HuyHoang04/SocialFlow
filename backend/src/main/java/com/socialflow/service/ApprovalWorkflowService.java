package com.socialflow.service;

import com.socialflow.model.ApprovalWorkflowConfig;
import com.socialflow.model.Post;
import com.socialflow.model.PostApproval;
import com.socialflow.model.User;
import com.socialflow.model.enums.ApprovalStatus;
import com.socialflow.model.enums.PostStatus;
import com.socialflow.repository.ApprovalWorkflowConfigRepository;
import com.socialflow.repository.BrandRepository;
import com.socialflow.repository.PostApprovalRepository;
import com.socialflow.repository.PostRepository;
import com.socialflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ApprovalWorkflowService {

    private final ApprovalWorkflowConfigRepository configRepository;
    private final PostApprovalRepository postApprovalRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final BrandRepository brandRepository;
    private final BrandTeamService brandTeamService;

    /**
     * Get workflow config for a brand, or create default if not exists
     */
    public ApprovalWorkflowConfig getWorkflowConfig(UUID brandId) {
        return configRepository.findByBrandId(brandId)
                .orElseGet(() -> {
                    // Create default config (disabled)
                    ApprovalWorkflowConfig config = ApprovalWorkflowConfig.builder()
                            .brand(brandRepository.findById(brandId)
                                    .orElseThrow(() -> new RuntimeException("Brand not found")))
                            .enabled(false)
                            .approvalLevels(1)
                            .build();
                    return configRepository.save(config);
                });
    }

    /**
     * Update or create workflow config for a brand
     */
    @Transactional
    public ApprovalWorkflowConfig updateWorkflowConfig(UUID brandId, boolean enabled, int approvalLevels) {
        ApprovalWorkflowConfig config = configRepository.findByBrandId(brandId)
                .orElseGet(() -> ApprovalWorkflowConfig.builder()
                        .brand(brandRepository.findById(brandId)
                                .orElseThrow(() -> new RuntimeException("Brand not found")))
                        .build());

        config.setEnabled(enabled);
        config.setApprovalLevels(1); // Force to 1 level as requested by user
        config = configRepository.save(config);
        log.info("Updated workflow config for brand {}: enabled={}, levels=1", brandId, enabled);
        return config;
    }

    /**
     * Check if a brand requires approval workflow
     */
    public boolean requiresApprovalForBrand(UUID brandId) {
        return getWorkflowConfig(brandId).isEnabled();
    }

    /**
     * Creator submits post for approval, assigns to manager
     */
    @Transactional
    public void submitForApproval(UUID postId, UUID assignedToManagerId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        User manager = userRepository.findById(assignedToManagerId)
                .orElseThrow(() -> new RuntimeException("Assigned user not found"));

        // Create level 1 approval
        PostApproval approval = PostApproval.builder()
                .post(post)
                .approvalLevel(1)
                .assignedTo(manager)
                .status(ApprovalStatus.PENDING)
                .build();

        postApprovalRepository.save(approval);

        // Update post status
        post.setStatus(PostStatus.PENDING_APPROVAL);
        postRepository.save(post);

        log.info("Post {} submitted for approval to user {}", postId, assignedToManagerId);
    }

    /**
     * Manager/Admin approves post
     */
    @Transactional
    public void approvePost(UUID approvalId, UUID approverId, String comment) {
        PostApproval approval = postApprovalRepository.findById(approvalId)
                .orElseThrow(() -> new RuntimeException("Approval not found"));
        // Check if user is assigned to this approval
        if (!approval.getAssignedTo().getId().equals(approverId)) {
            throw new RuntimeException("User is not assigned to this approval");
        }
        // Check if user is assigned to this approval
        if (!approval.getAssignedTo().getId().equals(approverId)) {
            throw new RuntimeException("User is not assigned to this approval");
        }

        // Check if already approved/rejected
        if (approval.getStatus() != ApprovalStatus.PENDING) {
            throw new RuntimeException("Approval already processed");
        }

        approval.setStatus(ApprovalStatus.APPROVED);
        approval.setComment(comment);
        approval.setApprovedAt(LocalDateTime.now());
        postApprovalRepository.save(approval);

        Post post = approval.getPost();
        ApprovalWorkflowConfig config = getWorkflowConfig(post.getPage().getConnection().getBrand().getId());

        // If 1-level or last level approved, set post to APPROVED
        if (config.getApprovalLevels() == 1) {
            post.setStatus(PostStatus.APPROVED);
            postRepository.save(post);
            log.info("Post {} approved (1-level workflow)", post.getId());
        } else {
            // Check if level 2 approval exists
            java.util.Optional<PostApproval> level2 = postApprovalRepository.findByPostIdAndApprovalLevel(post.getId(), 2);
            if (level2.isEmpty()) {
                // Create level 2 approval
                PostApproval level2Approval = PostApproval.builder()
                        .post(post)
                        .approvalLevel(2)
                        .status(ApprovalStatus.PENDING)
                        .build();
                postApprovalRepository.save(level2Approval);
                log.info("Post {} level 1 approved, waiting for level 2", post.getId());
            } else if (level2.get().getStatus() == ApprovalStatus.APPROVED) {
                // Both levels approved
                post.setStatus(PostStatus.APPROVED);
                postRepository.save(post);
                log.info("Post {} fully approved (2-level workflow)", post.getId());
            }
        }
    }

    /**
     * Manager/Admin rejects post
     */
    @Transactional
    public void rejectPost(UUID approvalId, UUID approverId, String comment) {
        PostApproval approval = postApprovalRepository.findById(approvalId)
                .orElseThrow(() -> new RuntimeException("Approval not found"));

        if (approval.getStatus() != ApprovalStatus.PENDING) {
            throw new RuntimeException("Approval already processed");
        }

        approval.setStatus(ApprovalStatus.REJECTED);
        approval.setComment(comment);
        approval.setApprovedAt(LocalDateTime.now());
        postApprovalRepository.save(approval);

        // Reset post to REJECTED (editable by creator)
        Post post = approval.getPost();
        post.setStatus(PostStatus.REJECTED);
        postRepository.save(post);

        log.info("Post {} rejected at level {}", post.getId(), approval.getApprovalLevel());
    }

    /**
     * Get all posts pending approval for a user in a brand
     */
    public List<Post> getPendingApprovalsForUser(UUID userId, UUID brandId) {
        List<PostApproval> approvals = postApprovalRepository.findByAssignedToId(userId);
        return approvals.stream()
                .filter(a -> a.getStatus() == ApprovalStatus.PENDING &&
                        a.getPost().getPage().getConnection().getBrand().getId().equals(brandId))
                .map(PostApproval::getPost)
                .collect(Collectors.toList());
    }

    /**
     * Get all approvals for a user in a brand, grouped by status (for kanban view)
     */
    public List<PostApproval> getAllApprovalsForUser(UUID userId, UUID brandId) {
        // Check if user belongs to the brand team
        if (!brandTeamService.canUserAccessBrand(userId, brandId)) {
            throw new RuntimeException("User does not have access to this brand");
        }
        return postApprovalRepository.findByBrandId(brandId);
    }

    /**
     * Get all approval records for a post
     */
    public List<PostApproval> getPostApprovals(UUID postId) {
        return postApprovalRepository.findByPostIdOrderByApprovalLevel(postId);
    }

    /**
     * Check if post has all required approvals
     */
    public boolean hasAllApprovalsRequired(UUID postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        ApprovalWorkflowConfig config = getWorkflowConfig(post.getPage().getConnection().getBrand().getId());

        if (!config.isEnabled()) {
            return true;  // No approval needed
        }

        List<PostApproval> approvals = postApprovalRepository.findByPostIdOrderByApprovalLevel(postId);

        // Check if we have enough approvals
        for (int level = 1; level <= config.getApprovalLevels(); level++) {
            final int currentLevel = level;
            java.util.Optional<PostApproval> approval = approvals.stream()
                    .filter(a -> a.getApprovalLevel() == currentLevel)
                    .findFirst();

            if (approval.isEmpty() || approval.get().getStatus() != ApprovalStatus.APPROVED) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get a single approval by ID
     */
    public PostApproval getApprovalById(UUID approvalId) {
        return postApprovalRepository.findById(approvalId)
                .orElseThrow(() -> new RuntimeException("Approval not found"));
    }
}

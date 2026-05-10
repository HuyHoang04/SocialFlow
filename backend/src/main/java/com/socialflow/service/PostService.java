package com.socialflow.service;

import com.socialflow.constants.ErrorMessages;
import com.socialflow.dto.CreatePostRequest;
import com.socialflow.dto.PostApprovalResponse;
import com.socialflow.dto.PostResponse;
import com.socialflow.model.*;
import com.socialflow.model.enums.PostStatus;
import com.socialflow.repository.*;
import com.socialflow.service.publisher.PublisherService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final SocialPageRepository pageRepository;
    private final PostMediaRepository mediaRepository;
    private final PublisherService publisherService;
    private final CampaignRepository campaignRepository;
    private final ApprovalWorkflowService approvalWorkflowService;
    private final PostApprovalRepository postApprovalRepository;
    private final BrandTeamMemberRepository brandTeamMemberRepository;

    public List<PostResponse> getPostsByUser(User user) {
        // Get all brands where user is a team member
        List<UUID> brandIds = brandTeamMemberRepository.findByUserId(user.getId())
                .stream()
                .map(member -> member.getBrand().getId())
                .collect(Collectors.toList());
        
        // If user is not a member of any brand, return empty list
        if (brandIds.isEmpty()) {
            return new ArrayList<>();
        }
        
        // Get all posts from those brands
        List<Post> posts = postRepository.findByPageConnectionBrandIdInOrderByCreatedAtDesc(brandIds);
        return posts.stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<PostResponse> getPostsByPage(UUID pageId) {
        List<Post> posts = postRepository.findByPageIdOrderByCreatedAtDesc(pageId);
        return posts.stream().map(this::toResponse).collect(Collectors.toList());
    }

    public PostResponse getPostById(UUID id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(ErrorMessages.POST_NOT_FOUND));
        return toResponse(post);
    }

    @Transactional
    public List<PostResponse> createPost(CreatePostRequest request, User currentUser) {
        // Create media records from filenames (save from cache to DB)
        List<PostMedia> mediaFiles = new ArrayList<>();
        if (request.getMediaFilenames() != null && !request.getMediaFilenames().isEmpty()) {
            for (int i = 0; i < request.getMediaFilenames().size(); i++) {
                String filename = request.getMediaFilenames().get(i);
                
                // Create media record with current user (files were already saved to disk during upload)
                PostMedia media = PostMedia.builder()
                        .filename(filename)
                        .originalName(filename)  // Can be improved with metadata later
                        .contentType("image/jpeg")  // Should be passed from frontend
                        .fileSize(0L)  // Should be tracked from upload
                        .url("/api/media/" + filename)
                        .sortOrder(i)
                        .uploader(currentUser)
                        .build();
                media = mediaRepository.save(media);
                mediaFiles.add(media);
            }
        }

        List<PostResponse> responses = new ArrayList<>();

        for (UUID pageId : request.getPageIds()) {
            SocialPage page = pageRepository.findById(pageId)
                    .orElseThrow(() -> new RuntimeException(ErrorMessages.PAGE_NOT_FOUND + pageId));

            LocalDateTime scheduledTime = null;
            if (request.getScheduledTime() != null && !request.getScheduledTime().isBlank()) {
                // Parse as OffsetDateTime and convert to LocalDateTime (UTC)
                scheduledTime = OffsetDateTime.parse(request.getScheduledTime()).toLocalDateTime();
            }

            Campaign campaign = null;
            if (request.getCampaignId() != null) {
                campaign = campaignRepository.findById(request.getCampaignId())
                        .orElseThrow(() -> new RuntimeException(ErrorMessages.CAMPAIGN_NOT_FOUND_WITH_ID + request.getCampaignId()));
            }

            // Get platform-specific content or fallback to common content
            String postContent = request.getContent();
            if (request.getPlatformContent() != null && request.getPlatformContent().containsKey(pageId)) {
                postContent = request.getPlatformContent().get(pageId);
            }

            Post post = Post.builder()
                    .content(postContent)
                    .createdBy(currentUser)
                    .status(PostStatus.DRAFT)
                    .scheduledTime(scheduledTime)
                    .campaign(campaign)
                    .page(page)
                    .build();
            post = postRepository.save(post);

            // Link media to post
            for (PostMedia media : mediaFiles) {
                PostMedia copy;
                if (request.getPageIds().size() == 1) {
                    // Single page — link directly
                    media.setPost(post);
                    mediaRepository.save(media);
                    copy = media;
                } else {
                    // Multi-page — create copy of media reference for each post
                    copy = PostMedia.builder()
                            .filename(media.getFilename())
                            .originalName(media.getOriginalName())
                            .contentType(media.getContentType())
                            .fileSize(media.getFileSize())
                            .url(media.getUrl())
                            .sortOrder(media.getSortOrder())
                            .uploader(media.getUploader())
                            .post(post)
                            .build();
                    mediaRepository.save(copy);
                }
                post.getMediaFiles().add(copy);
            }

            responses.add(toResponse(post));
        }

        return responses;
    }

    @Transactional
    public PostResponse updatePost(UUID postId, CreatePostRequest request, User currentUser) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException(ErrorMessages.POST_NOT_FOUND));

        // Check if user is the creator
        if (!post.getCreatedBy().getId().equals(currentUser.getId())) {
            throw new RuntimeException(ErrorMessages.UNAUTHORIZED);
        }

        // Update content (use platform-specific if available, else fallback to common)
        String postContent = request.getContent();
        if (request.getPlatformContent() != null && request.getPlatformContent().containsKey(post.getPage().getId())) {
            postContent = request.getPlatformContent().get(post.getPage().getId());
        }
        post.setContent(postContent);

        // Update scheduled time if provided
        if (request.getScheduledTime() != null && !request.getScheduledTime().isBlank()) {
            LocalDateTime scheduledTime = OffsetDateTime.parse(request.getScheduledTime()).toLocalDateTime();
            post.setScheduledTime(scheduledTime);
        } else {
            post.setScheduledTime(null);
        }
        
        // Always reset to DRAFT when editing
        post.setStatus(PostStatus.DRAFT);

        // Update campaign if provided
        if (request.getCampaignId() != null) {
            Campaign campaign = campaignRepository.findById(request.getCampaignId())
                    .orElseThrow(() -> new RuntimeException(ErrorMessages.CAMPAIGN_NOT_FOUND_WITH_ID + request.getCampaignId()));
            post.setCampaign(campaign);
        } else {
            post.setCampaign(null);
        }

        // Update media files if provided
        if (request.getMediaFilenames() != null) {
            // Delete existing media
            List<PostMedia> existingMedia = new ArrayList<>(post.getMediaFiles());
            for (PostMedia media : existingMedia) {
                post.getMediaFiles().remove(media);
                mediaRepository.delete(media);
            }

            // Create new media records from filenames
            if (!request.getMediaFilenames().isEmpty()) {
                for (int i = 0; i < request.getMediaFilenames().size(); i++) {
                    String filename = request.getMediaFilenames().get(i);
                    
                    PostMedia media = PostMedia.builder()
                            .filename(filename)
                            .originalName(filename)
                            .contentType("image/jpeg")
                            .fileSize(0L)
                            .url("/api/media/" + filename)
                            .sortOrder(i)
                            .post(post)
                            .uploader(currentUser)
                            .build();
                    media = mediaRepository.save(media);
                    post.getMediaFiles().add(media);
                }
            }
        }

        post = postRepository.save(post);
        return toResponse(post);
    }

    @Transactional
    public PostResponse publishPost(UUID postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException(ErrorMessages.POST_NOT_FOUND));

        // Check if post requires approval and has all required approvals
        Brand brand = post.getPage().getConnection().getBrand();
        if (approvalWorkflowService.requiresApprovalForBrand(brand.getId())) {
            if (!approvalWorkflowService.hasAllApprovalsRequired(postId)) {
                throw new RuntimeException("Post requires approval before publishing");
            }
        }

        // Set scheduled time to now if not already scheduled
        if (post.getScheduledTime() == null) {
            post.setScheduledTime(LocalDateTime.now());
        }

        post.setStatus(PostStatus.PUBLISHING);
        postRepository.save(post);

        try {
            PublishResult result = publisherService.publish(post);
            post.getPublishResults().add(result);

            if (result.getSuccess()) {
                post.setStatus(PostStatus.PUBLISHED);
                post.setPublishedAt(LocalDateTime.now());
            } else {
                post.setStatus(PostStatus.FAILED);
            }
        } catch (Exception e) {
            PublishResult failResult = PublishResult.builder()
                    .post(post)
                    .success(false)
                    .errorMessage(e.getMessage())
                    .build();
            post.getPublishResults().add(failResult);
            post.setStatus(PostStatus.FAILED);
        }

        post = postRepository.save(post);
        return toResponse(post);
    }

    public void deletePost(UUID id, User user) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(ErrorMessages.POST_NOT_FOUND));
        
        // Check if user is the creator
        if (!post.getCreatedBy().getId().equals(user.getId())) {
            throw new RuntimeException(ErrorMessages.UNAUTHORIZED);
        }
        
        postRepository.deleteById(id);
    }

    @Transactional
    public void submitForApproval(UUID postId, UUID assignedToManagerId, User user) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException(ErrorMessages.POST_NOT_FOUND));

        // Check if user is the creator
        if (!post.getCreatedBy().getId().equals(user.getId())) {
            throw new RuntimeException(ErrorMessages.UNAUTHORIZED);
        }

        if (!post.getStatus().equals(PostStatus.DRAFT)) {
            throw new RuntimeException("Only DRAFT posts can be submitted for approval");
        }

        Brand brand = post.getPage().getConnection().getBrand();
        approvalWorkflowService.submitForApproval(postId, assignedToManagerId);
    }

    public List<PostResponse> getPendingApprovalsForUser(UUID userId, UUID brandId) {
        List<PostApproval> approvals = postApprovalRepository.findByAssignedToId(userId).stream()
                .filter(a -> a.getPost().getPage().getConnection().getBrand().getId().equals(brandId))
                .filter(a -> a.getStatus().equals(com.socialflow.model.enums.ApprovalStatus.PENDING))
                .collect(Collectors.toList());

        return approvals.stream()
                .map(approval -> toResponse(approval.getPost()))
                .distinct()
                .collect(Collectors.toList());
    }

    public List<PostResponse> getPostsByStatus(PostStatus status, UUID brandId) {
        return postRepository.findByStatusAndPageConnectionBrandIdOrderByCreatedAtDesc(status, brandId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Creates an AI-generated DRAFT post without requiring a target page.
     * Used exclusively by the AI callback flow — the user will assign a page
     * later when they decide to publish the draft.
     *
     * @param content        Post content generated by the AI
     * @param campaign       Optional campaign to associate the post with
     * @param scheduledTime  Optional scheduled time string (ISO-8601)
     * @param mediaFilenames Optional list of AI-generated image filenames
     * @param uploader       The user who owns this brand/session
     * @return saved Post entity
     */
    @Transactional
    public Post createAiDraftPost(
            String content,
            Campaign campaign,
            String scheduledTime,
            List<String> mediaFilenames,
            User uploader
    ) {
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("AI draft post content must not be blank");
        }

        LocalDateTime parsedScheduledTime = null;
        if (scheduledTime != null && !scheduledTime.isBlank()) {
            try {
                parsedScheduledTime = OffsetDateTime.parse(scheduledTime).toLocalDateTime();
            } catch (Exception e) {
                log.warn("Could not parse AI scheduledTime '{}', ignoring: {}", scheduledTime, e.getMessage());
            }
        }

        Post post = Post.builder()
                .content(content)
                .createdBy(uploader)
                .status(PostStatus.DRAFT)
                .campaign(campaign)
                .scheduledTime(parsedScheduledTime)
                // page is intentionally null — user assigns page on publish
                .build();
        post = postRepository.save(post);

        if (mediaFilenames != null && uploader != null) {
            for (int i = 0; i < mediaFilenames.size(); i++) {
                String filename = mediaFilenames.get(i);
                PostMedia media = PostMedia.builder()
                        .post(post)
                        .uploader(uploader)
                        .filename(filename)
                        .originalName("ai_gen_" + i + ".png")
                        .contentType("image/png")
                        .url("/api/media/" + filename)
                        .fileSize(0L)
                        .sortOrder(i)
                        .build();
                mediaRepository.save(media);
            }
            log.info("  ✓ Linked {} AI-generated media assets to draft post {}", mediaFilenames.size(), post.getId());
        }

        log.info("✓ AI draft post created via PostService: {}", post.getId());
        return post;
    }

    private PostResponse toResponse(Post post) {
        SocialPage page = post.getPage();
        SocialConnection conn = page.getConnection();

        // Build approvals list
        List<PostApprovalResponse> approvalResponses = new ArrayList<>();
        if (post.getApprovals() != null) {
            for (PostApproval approval : post.getApprovals()) {
                approvalResponses.add(PostApprovalResponse.builder()
                        .id(approval.getId())
                        .postId(approval.getPost().getId())
                        .assignedToUserId(approval.getAssignedTo().getId())
                        .assignedToName(approval.getAssignedTo().getName())
                        .assignedToEmail(approval.getAssignedTo().getEmail())
                        .approvalLevel(approval.getApprovalLevel())
                        .status(approval.getStatus())
                        .createdAt(approval.getCreatedAt())
                        .comment(approval.getComment())
                        .approvedAt(approval.getApprovedAt())
                        .build());
            }
        }

        return PostResponse.builder()
                .id(post.getId())
                .content(post.getContent())
                .status(post.getStatus())
                .createdAt(post.getCreatedAt())
                .publishedAt(post.getPublishedAt())
                .scheduledTime(post.getScheduledTime())
                .campaignId(post.getCampaign() != null ? post.getCampaign().getId() : null)
                .campaignName(post.getCampaign() != null ? post.getCampaign().getName() : null)
                .createdByUserId(post.getCreatedBy() != null ? post.getCreatedBy().getId() : null)
                .createdByName(post.getCreatedBy() != null ? post.getCreatedBy().getName() : null)
                .page(PostResponse.PageInfo.builder()
                        .id(page.getId())
                        .pageName(page.getPageName())
                        .platform(page.getPlatform())
                        .brandName(conn.getBrand().getName())
                        .build())
                .mediaFiles(post.getMediaFiles().stream()
                        .map(m -> PostResponse.MediaInfo.builder()
                                .id(m.getId())
                                .url(m.getUrl())
                                .contentType(m.getContentType())
                                .originalName(m.getOriginalName())
                                .build())
                        .collect(Collectors.toList()))
                .publishResults(post.getPublishResults().stream()
                        .map(r -> PostResponse.PublishResultResponse.builder()
                                .id(r.getId())
                                .platformPostId(r.getPlatformPostId())
                                .platformPostUrl(r.getPlatformPostUrl())
                                .success(r.getSuccess())
                                .errorMessage(r.getErrorMessage())
                                .createdAt(r.getCreatedAt())
                                .build())
                        .collect(Collectors.toList()))
                .approvals(approvalResponses)
                .build();
    }
}

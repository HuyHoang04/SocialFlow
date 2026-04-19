package com.socialflow.service;

import com.socialflow.constants.ErrorMessages;
import com.socialflow.dto.CreatePostRequest;
import com.socialflow.dto.PostResponse;
import com.socialflow.model.*;
import com.socialflow.model.enums.PostStatus;
import com.socialflow.repository.*;
import com.socialflow.service.publisher.PublisherService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final SocialPageRepository pageRepository;
    private final PostMediaRepository mediaRepository;
    private final PublisherService publisherService;
    private final CampaignRepository campaignRepository;

    public List<PostResponse> getPostsByUser(User user) {
        List<Post> posts = postRepository.findByPageConnectionBrandUserIdOrderByCreatedAtDesc(user.getId());
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
            PostStatus initialStatus = PostStatus.DRAFT;
            if (request.getScheduledTime() != null && !request.getScheduledTime().isBlank()) {
                scheduledTime = OffsetDateTime.parse(request.getScheduledTime()).toLocalDateTime();
                if (scheduledTime.isAfter(LocalDateTime.now())) {
                    initialStatus = PostStatus.SCHEDULED;
                }
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
                    .status(initialStatus)
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

        // Update content (use platform-specific if available, else fallback to common)
        String postContent = request.getContent();
        if (request.getPlatformContent() != null && request.getPlatformContent().containsKey(post.getPage().getId())) {
            postContent = request.getPlatformContent().get(post.getPage().getId());
        }
        post.setContent(postContent);

        // Update scheduled time if provided
        if (request.getScheduledTime() != null && !request.getScheduledTime().isBlank()) {
            LocalDateTime scheduledTime = LocalDateTime.parse(request.getScheduledTime());
            post.setScheduledTime(scheduledTime);
            if (scheduledTime.isAfter(LocalDateTime.now())) {
                post.setStatus(PostStatus.SCHEDULED);
            } else {
                post.setStatus(PostStatus.DRAFT);
            }
        } else {
            post.setScheduledTime(null);
            post.setStatus(PostStatus.DRAFT);
        }

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

    public void deletePost(UUID id) {
        postRepository.deleteById(id);
    }

    private PostResponse toResponse(Post post) {
        SocialPage page = post.getPage();
        SocialConnection conn = page.getConnection();

        return PostResponse.builder()
                .id(post.getId())
                .content(post.getContent())
                .status(post.getStatus())
                .createdAt(post.getCreatedAt())
                .publishedAt(post.getPublishedAt())
                .scheduledTime(post.getScheduledTime())
                .campaignId(post.getCampaign() != null ? post.getCampaign().getId() : null)
                .campaignName(post.getCampaign() != null ? post.getCampaign().getName() : null)
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
                .build();
    }
}

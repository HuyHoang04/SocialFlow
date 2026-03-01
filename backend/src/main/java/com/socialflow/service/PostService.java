package com.socialflow.service;

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
                .orElseThrow(() -> new RuntimeException("Post not found"));
        return toResponse(post);
    }

    @Transactional
    public List<PostResponse> createPost(CreatePostRequest request) {
        // Load media files if provided
        List<PostMedia> mediaFiles = new ArrayList<>();
        if (request.getMediaIds() != null && !request.getMediaIds().isEmpty()) {
            for (int i = 0; i < request.getMediaIds().size(); i++) {
                UUID mediaId = request.getMediaIds().get(i);
                PostMedia media = mediaRepository.findById(mediaId)
                        .orElseThrow(() -> new RuntimeException("Media not found: " + mediaId));
                media.setSortOrder(i);
                mediaFiles.add(media);
            }
        }

        List<PostResponse> responses = new ArrayList<>();

        for (UUID pageId : request.getPageIds()) {
            SocialPage page = pageRepository.findById(pageId)
                    .orElseThrow(() -> new RuntimeException("Page not found: " + pageId));

            Post post = Post.builder()
                    .content(request.getContent())
                    .status(PostStatus.DRAFT)
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
    public PostResponse publishPost(UUID postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

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

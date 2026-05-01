package com.socialflow.service;

import com.socialflow.model.Post;
import com.socialflow.model.enums.PostStatus;
import com.socialflow.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PostScheduler {

    private final PostRepository postRepository;
    private final PostService postService;

    // Run every minute
    @Scheduled(fixedDelay = 60000)
    public void publishScheduledPosts() {
        // Use UTC time to match stored scheduledTime
        LocalDateTime now = LocalDateTime.now(java.time.ZoneOffset.UTC);
        List<Post> duePosts = postRepository.findByStatusAndScheduledTimeLessThanEqual(PostStatus.SCHEDULED, now);

        if (!duePosts.isEmpty()) {
            log.info("Found {} scheduled posts due for publishing.", duePosts.size());
            for (Post post : duePosts) {
                try {
                    log.info("Publishing scheduled post ID: {}", post.getId());
                    postService.publishPost(post.getId());
                } catch (Exception e) {
                    log.error("Failed to publish scheduled post ID: {}", post.getId(), e);
                }
            }
        }
    }
}

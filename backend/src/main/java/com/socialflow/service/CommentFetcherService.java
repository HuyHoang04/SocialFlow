package com.socialflow.service;

import com.socialflow.dto.PlatformCommentDto;
import com.socialflow.model.SocialPage;
import com.socialflow.model.enums.PlatformType;
import com.socialflow.service.publisher.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

/**
 * Routes comment-fetching requests to the correct platform publisher.
 * Acts as a platform-agnostic facade so InboxService doesn't need to
 * know which publisher handles which platform.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CommentFetcherService {

    private final FacebookPublisher facebookPublisher;
    private final TwitterPublisher twitterPublisher;
    private final LinkedInPublisher linkedInPublisher;
    private final BlueskyPublisher blueskyPublisher;
    private final ThreadsPublisher threadsPublisher;

    /**
     * Fetch comments for all published posts on the given page,
     * routing to the appropriate platform publisher.
     *
     * @param page the social page to fetch comments for
     * @return list of platform comment DTOs, never null
     */
    public List<PlatformCommentDto> fetchComments(SocialPage page) {
        PlatformType platform = page.getPlatform();
        try {
            return switch (platform) {
                case FACEBOOK -> facebookPublisher.fetchComments(page);
                case TWITTER  -> twitterPublisher.fetchComments(page);
                case LINKEDIN -> linkedInPublisher.fetchComments(page);
                case BLUESKY  -> blueskyPublisher.fetchComments(page);
                case THREADS  -> threadsPublisher.fetchComments(page);
            };
        } catch (Exception e) {
            log.error("Failed to fetch comments for {} page '{}': {}",
                    platform, page.getPageName(), e.getMessage(), e);
            return Collections.emptyList();
        }
    }
}

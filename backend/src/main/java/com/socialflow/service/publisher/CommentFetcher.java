package com.socialflow.service.publisher;

import com.socialflow.dto.PlatformCommentDto;
import com.socialflow.model.SocialPage;

import java.util.List;

/**
 * Common contract for fetching comments/replies from a social media platform.
 * Each platform publisher implements this to provide comment ingestion
 * into the Unified Inbox.
 */
public interface CommentFetcher {

    /**
     * Fetch comments for all published posts belonging to the given page.
     *
     * @param page the social page whose posts' comments should be fetched
     * @return list of comment DTOs ready for persistence, never null
     */
    List<PlatformCommentDto> fetchComments(SocialPage page);
}

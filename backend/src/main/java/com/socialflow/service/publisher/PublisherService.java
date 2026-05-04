package com.socialflow.service.publisher;

import com.socialflow.model.Post;
import com.socialflow.model.PublishResult;
import com.socialflow.model.SocialPage;
import com.socialflow.model.enums.PlatformType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PublisherService {

    private final FacebookPublisher facebookPublisher;
    private final TwitterPublisher twitterPublisher;
    private final LinkedInPublisher linkedInPublisher;
    private final BlueskyPublisher blueskyPublisher;
    private final ThreadsPublisher threadsPublisher;

    public PublishResult publish(Post post) {
        SocialPage page = post.getPage();
        PlatformType platform = page.getPlatform();

        if (platform == PlatformType.FACEBOOK) return facebookPublisher.publish(post, page);
        if (platform == PlatformType.TWITTER) return twitterPublisher.publish(post, page);
        if (platform == PlatformType.LINKEDIN) return linkedInPublisher.publish(post, page);
        if (platform == PlatformType.BLUESKY) return blueskyPublisher.publish(post, page);
        if (platform == PlatformType.THREADS) return threadsPublisher.publish(post, page);
        throw new IllegalArgumentException("Unsupported platform: " + platform);
    }
}

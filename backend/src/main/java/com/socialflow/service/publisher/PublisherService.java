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

    public PublishResult publish(Post post) {
        SocialPage page = post.getPage();
        PlatformType platform = page.getPlatform();

        return switch (platform) {
            case FACEBOOK -> facebookPublisher.publish(post, page);
            case TWITTER -> twitterPublisher.publish(post, page);
            case LINKEDIN -> linkedInPublisher.publish(post, page);
        };
    }
}

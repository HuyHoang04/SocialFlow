package com.socialflow.service.bot;

import com.fasterxml.jackson.databind.JsonNode;
import com.socialflow.model.Post;
import com.socialflow.model.PublishResult;
import com.socialflow.model.SocialPage;
import com.socialflow.repository.PostRepository;
import com.socialflow.repository.SocialPageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Arrays;
import java.util.List;
import java.util.Random;

@Service
@RequiredArgsConstructor
@Slf4j
public class EngagementBotService {

    private final PostRepository postRepository;
    private final SocialPageRepository pageRepository;
    private final WebClient.Builder webClientBuilder;

    private static final List<String> POSITIVE_COMMENTS = Arrays.asList(
            "Tuyệt vời quá! 😍",
            "Nội dung rất hay, cảm ơn bạn đã chia sẻ!",
            "Mình rất thích bài viết này! 👍",
            "Thông tin rất hữu ích!",
            "Rất ấn tượng, tiếp tục phát huy nhé!",
            "Quá đỉnh luôn 🔥",
            "Đồng ý hoàn toàn với bạn!",
            "Chia sẻ rất sâu sắc, mong có thêm nhiều bài như vậy.",
            "Wow, thật tuyệt vời! 👏",
            "Hóng bài tiếp theo của bạn!"
    );

    public void runEngagementBot(String postIdStr, String brandIdStr) {
        log.info("Starting engagement bot for post {}", postIdStr);
        
        java.util.UUID postId = java.util.UUID.fromString(postIdStr);
        java.util.UUID brandId = java.util.UUID.fromString(brandIdStr);
        
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        if (post.getPage() == null || post.getPage().getConnection() == null ||
            !brandId.equals(post.getPage().getConnection().getBrand().getId())) {
            throw new RuntimeException("Unauthorized to access this post");
        }

        // We need the platform post ID. Find the first successful publish result
        String platformPostId = post.getPublishResults().stream()
                .filter(PublishResult::getSuccess)
                .map(PublishResult::getPlatformPostId)
                .findFirst()
                .orElse(null);

        if (platformPostId == null) {
            log.warn("Post {} has no successful platform publish result", postId);
            throw new RuntimeException("Post has not been successfully published yet");
        }

        // Find available pages to interact. In a real scenario we'd use other accounts.
        // For demo, we just use the first available Facebook page in the brand.
        List<SocialPage> pages = pageRepository.findByConnectionBrandId(brandId);
        SocialPage botPage = pages.stream()
                .filter(p -> com.socialflow.model.enums.PlatformType.FACEBOOK.equals(p.getPlatform()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No Facebook page available for bot engagement"));

        String token = botPage.getPageAccessToken();
        if (token == null || token.isEmpty()) {
            throw new RuntimeException("Page token is missing");
        }

        WebClient client = webClientBuilder.baseUrl("https://graph.facebook.com/v18.0").build();
        Random random = new Random();

        // 1. Attempt to LIKE the post
        try {
            log.info("Bot attempting to like post {}", platformPostId);
            client.post()
                    .uri("/{postId}/likes", platformPostId)
                    .bodyValue(java.util.Map.of("access_token", token))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
            log.info("Bot successfully liked the post");
        } catch (Exception e) {
            log.warn("Bot failed to like post (maybe already liked): {}", e.getMessage());
        }

        // 2. Attempt to COMMENT on the post
        try {
            String commentText = POSITIVE_COMMENTS.get(random.nextInt(POSITIVE_COMMENTS.size()));
            log.info("Bot attempting to comment: '{}'", commentText);
            
            client.post()
                    .uri("/{postId}/comments", platformPostId)
                    .bodyValue(java.util.Map.of(
                            "message", commentText,
                            "access_token", token
                    ))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
            log.info("Bot successfully commented on the post");
        } catch (Exception e) {
            log.error("Bot failed to comment on post: {}", e.getMessage());
            throw new RuntimeException("Failed to comment on post: " + e.getMessage());
        }
    }
}

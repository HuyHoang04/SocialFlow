package com.socialflow.service.publisher;

import com.fasterxml.jackson.databind.JsonNode;
import com.socialflow.model.Post;
import com.socialflow.model.PostMedia;
import com.socialflow.model.PublishResult;
import com.socialflow.model.SocialPage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class TwitterPublisher {

    private final WebClient.Builder webClientBuilder;

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    public PublishResult publish(Post post, SocialPage page) {
        try {
            String accessToken = page.getPageAccessToken();
            List<PostMedia> media = post.getMediaFiles();

            String mediaIdStr = null;

            // Upload media if present
            if (media != null && !media.isEmpty()) {
                PostMedia first = media.get(0);
                Path filePath = Paths.get(uploadDir).resolve(first.getFilename());

                WebClient uploadClient = webClientBuilder.baseUrl("https://upload.twitter.com").build();

                MultipartBodyBuilder builder = new MultipartBodyBuilder();
                builder.part("media", new FileSystemResource(filePath.toFile()));

                JsonNode uploadResp = uploadClient.post()
                        .uri("/1.1/media/upload.json")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .body(BodyInserters.fromMultipartData(builder.build()))
                        .retrieve()
                        .bodyToMono(JsonNode.class)
                        .block();

                if (uploadResp != null && uploadResp.has("media_id_string")) {
                    mediaIdStr = uploadResp.get("media_id_string").asText();
                }
            }

            // Create tweet
            WebClient client = webClientBuilder.baseUrl("https://api.twitter.com").build();

            Map<String, Object> tweetBody;
            if (mediaIdStr != null) {
                tweetBody = Map.of(
                        "text", post.getContent(),
                        "media", Map.of("media_ids", List.of(mediaIdStr))
                );
            } else {
                tweetBody = Map.of("text", post.getContent());
            }

            JsonNode response = client.post()
                    .uri("/2/tweets")
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .bodyValue(tweetBody)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (response != null && response.has("data") && response.get("data").has("id")) {
                String tweetId = response.get("data").get("id").asText();
                return PublishResult.builder()
                        .post(post)
                        .platformPostId(tweetId)
                        .platformPostUrl("https://x.com/i/web/status/" + tweetId)
                        .success(true)
                        .build();
            }

            return PublishResult.builder()
                    .post(post).success(false)
                    .errorMessage("No tweet ID returned from X/Twitter")
                    .build();

        } catch (Exception e) {
            log.error("Twitter publish failed", e);
            return PublishResult.builder()
                    .post(post).success(false)
                    .errorMessage(e.getMessage())
                    .build();
        }
    }
}

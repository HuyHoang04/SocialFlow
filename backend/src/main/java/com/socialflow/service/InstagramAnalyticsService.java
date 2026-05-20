package com.socialflow.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.socialflow.model.*;
import com.socialflow.model.enums.PlatformType;
import com.socialflow.model.enums.PostStatus;
import com.socialflow.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.JdbcTemplate;
import jakarta.annotation.PostConstruct;

@Service
@RequiredArgsConstructor
@Slf4j
public class InstagramAnalyticsService implements PlatformAnalyticsAdapter {

    private final WebClient.Builder webClientBuilder;
    private final PostRepository postRepository;
    private final PostAnalyticsRepository postAnalyticsRepository;
    private final PageAnalyticsRepository pageAnalyticsRepository;
    private final SocialPageRepository socialPageRepository;
    private final SocialConnectionRepository socialConnectionRepository;
    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void fixDatabaseConstraints() {
        try {
            log.info("Dropping outdated platform check constraints for analytics tables...");
            jdbcTemplate.execute("ALTER TABLE page_analytics DROP CONSTRAINT IF EXISTS page_analytics_platform_check");
            jdbcTemplate.execute("ALTER TABLE post_analytics DROP CONSTRAINT IF EXISTS post_analytics_platform_check");
            log.info("Successfully dropped check constraints.");
        } catch (Exception e) {
            log.warn("Could not drop constraints, they might not exist or another error occurred: {}", e.getMessage());
        }
    }

    private static final String GRAPH_BASE = "https://graph.instagram.com/v18.0";

    // ═══════════════════════════════════════════════════════════
    //  SYNC: Fetch analytics from Instagram API and store locally
    // ═══════════════════════════════════════════════════════════

    @Override
    public PlatformType getPlatformType() {
        return PlatformType.INSTAGRAM;
    }

    @Transactional
    @Override
    public void syncPostAnalytics(UUID brandId) {
        log.info("Syncing Instagram post analytics for brand {}", brandId);
        List<SocialConnection> connections = socialConnectionRepository.findByBrandId(brandId);

        for (SocialConnection conn : connections) {
            if (conn.getPlatform() != PlatformType.INSTAGRAM) continue;

            List<SocialPage> pages = socialPageRepository.findByConnectionId(conn.getId());
            for (SocialPage page : pages) {
                syncPostAnalyticsForPage(page);
            }
        }
    }

    @Transactional
    @Override
    public void syncPageAnalytics(UUID brandId) {
        log.info("Syncing Instagram page analytics for brand {}", brandId);
        List<SocialConnection> connections = socialConnectionRepository.findByBrandId(brandId);

        for (SocialConnection conn : connections) {
            if (conn.getPlatform() != PlatformType.INSTAGRAM) continue;

            List<SocialPage> pages = socialPageRepository.findByConnectionId(conn.getId());
            for (SocialPage page : pages) {
                syncPageAnalyticsForPage(page);
            }
        }
    }

    private void syncPostAnalyticsForPage(SocialPage page) {
        WebClient client = webClientBuilder.baseUrl(GRAPH_BASE).build();

        // Get published posts for this page
        List<Post> publishedPosts = postRepository.findByPageIdOrderByCreatedAtDesc(page.getId())
                .stream()
                .filter(p -> p.getStatus() == PostStatus.PUBLISHED)
                .collect(Collectors.toList());

        for (Post post : publishedPosts) {
            // Find the platformPostId from publish results
            String platformPostId = post.getPublishResults().stream()
                    .filter(r -> r.getSuccess() != null && r.getSuccess())
                    .map(PublishResult::getPlatformPostId)
                    .findFirst()
                    .orElse(null);

            if (platformPostId == null) continue;

            try {
                // Fetch Instagram media insights (likes, comments, etc.)
                String insightsUrl = String.format(
                        "/%s/insights?metric=impressions,total_interactions,reach,saved&access_token=%s",
                        platformPostId, page.getPageAccessToken()
                );

                JsonNode insightsData = client.get()
                        .uri(insightsUrl)
                        .retrieve()
                        .bodyToMono(JsonNode.class)
                        .block();

                log.info("Instagram media insights raw for {}: {}", platformPostId, insightsData);

                int impressions = 0, reach = 0, engagedUsers = 0, clicks = 0;

                if (insightsData != null && insightsData.has("data")) {
                    for (JsonNode metric : insightsData.get("data")) {
                        String metricName = metric.get("name").asText();
                        int value = 0;
                        if (metric.has("values") && metric.get("values").size() > 0) {
                            value = metric.get("values").get(0).get("value").asInt(0);
                        }
                        switch (metricName) {
                            case "impressions" -> impressions = value;
                            case "reach" -> reach = value;
                            case "total_interactions" -> engagedUsers = value;
                            case "saved" -> clicks = value;
                        }
                    }
                }

                // Also fetch basic media data (likes, comments)
                String mediaUrl = String.format(
                        "/%s?fields=like_count,comments_count&access_token=%s",
                        platformPostId, page.getPageAccessToken()
                );

                JsonNode mediaData = client.get()
                        .uri(mediaUrl)
                        .retrieve()
                        .bodyToMono(JsonNode.class)
                        .block();

                int likes = 0, commentsCount = 0, shares = 0;
                double engagementRate = 0.0;

                if (mediaData != null) {
                    likes = mediaData.has("like_count") ? mediaData.get("like_count").asInt(0) : 0;
                    commentsCount = mediaData.has("comments_count") ? mediaData.get("comments_count").asInt(0) : 0;
                    
                    // Instagram doesn't provide shares metric in basic API
                    shares = 0;
                    
                    // Calculate engagement rate
                    if (reach > 0) {
                        engagementRate = ((double)(likes + commentsCount) / reach) * 100;
                    }
                }

                // Create/update analytics
                PostAnalytics analytics = new PostAnalytics();
                analytics.setPost(post);
                analytics.setLikes(likes);
                analytics.setComments(commentsCount);
                analytics.setShares(shares);
                analytics.setImpressions(impressions);
                analytics.setReach(reach);
                analytics.setEngagedUsers(engagedUsers);
                analytics.setClicks(clicks);
                analytics.setEngagementRate(engagementRate);
                analytics.setFetchedAt(LocalDateTime.now());

                postAnalyticsRepository.save(analytics);

                log.info("Saved Instagram analytics for post {}: likes={}, comments={}, impressions={}, reach={}, engagement={}%",
                        platformPostId, likes, commentsCount, impressions, reach, String.format("%.2f", engagementRate));

            } catch (WebClientResponseException e) {
                log.warn("Could not fetch Instagram analytics for post {} (HTTP {}): {}",
                        platformPostId, e.getStatusCode(), e.getResponseBodyAsString());
            } catch (Exception e) {
                log.error("Failed to sync Instagram analytics for post {}: {}",
                        platformPostId, e.getMessage(), e);
            }
        }

        // Sync page-level analytics
        syncPageAnalyticsForPage(page);
    }

    @Transactional
    private void syncPageAnalyticsForPage(SocialPage page) {
        WebClient client = webClientBuilder.baseUrl(GRAPH_BASE).build();

        try {
            String userId = page.getPlatformPageId();
            String pageInsightsUrl = String.format(
                    "/%s?fields=biography,followers_count,media_count&access_token=%s",
                    userId, page.getPageAccessToken()
            );

            JsonNode pageData = client.get()
                    .uri(pageInsightsUrl)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (pageData != null) {
                int followers = pageData.has("followers_count") ? pageData.get("followers_count").asInt(0) : 0;
                int postsCount = pageData.has("media_count") ? pageData.get("media_count").asInt(0) : 0;

                PageAnalytics pageAnalytics = PageAnalytics.builder()
                        .page(page)
                        .platform(PlatformType.INSTAGRAM)
                        .followers(followers)
                        .postsCount(postsCount)
                        .fetchedAt(LocalDateTime.now())
                        .build();

                pageAnalyticsRepository.save(pageAnalytics);

                log.info("Saved Instagram page analytics for page {}: followers={}, posts={}",
                        page.getPageName(), followers, postsCount);
            }
        } catch (WebClientResponseException e) {
            log.warn("Could not fetch Instagram page analytics (HTTP {}): {}",
                    e.getStatusCode(), e.getResponseBodyAsString());
        } catch (Exception e) {
            log.error("Failed to sync Instagram page analytics: {}", e.getMessage(), e);
        }
    }
}

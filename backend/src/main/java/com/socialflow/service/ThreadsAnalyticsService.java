package com.socialflow.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.socialflow.dto.PostAnalyticsResponse;
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

@Service
@RequiredArgsConstructor
@Slf4j
public class ThreadsAnalyticsService implements PlatformAnalyticsAdapter {

    private final WebClient.Builder webClientBuilder;
    private final PostRepository postRepository;
    private final PostAnalyticsRepository postAnalyticsRepository;
    private final PageAnalyticsRepository pageAnalyticsRepository;
    private final SocialPageRepository socialPageRepository;
    private final SocialConnectionRepository socialConnectionRepository;

    private static final String GRAPH_BASE = "https://graph.threads.com/v1.0";

    // ═══════════════════════════════════════════════════════════
    //  SYNC: Fetch analytics from Threads API and store locally
    // ═══════════════════════════════════════════════════════════

    @Override
    public PlatformType getPlatformType() {
        return PlatformType.THREADS;
    }

    @Transactional
    @Override
    public void syncPostAnalytics(UUID brandId) {
        log.info("Syncing Threads post analytics for brand {}", brandId);
        List<SocialConnection> connections = socialConnectionRepository.findByBrandId(brandId);

        for (SocialConnection conn : connections) {
            if (conn.getPlatform() != PlatformType.THREADS) continue;

            List<SocialPage> pages = socialPageRepository.findByConnectionId(conn.getId());
            for (SocialPage page : pages) {
                syncPostAnalyticsForPage(page);
            }
        }
    }

    @Transactional
    @Override
    public void syncPageAnalytics(UUID brandId) {
        log.info("Syncing Threads page analytics for brand {}", brandId);
        List<SocialConnection> connections = socialConnectionRepository.findByBrandId(brandId);

        for (SocialConnection conn : connections) {
            if (conn.getPlatform() != PlatformType.THREADS) continue;

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
                // Fetch Threads post insights (likes, replies, etc.)
                String insightsUrl = String.format(
                        "/%s/insights?metric=views,likes,replies,reposts,quotes&access_token=%s",
                        platformPostId, page.getPageAccessToken()
                );

                JsonNode postData = client.get()
                        .uri(insightsUrl)
                        .retrieve()
                        .bodyToMono(JsonNode.class)
                        .block();

                log.info("Threads post metrics raw for {}: {}", platformPostId, postData);

                int likes = 0, commentsCount = 0, shares = 0, views = 0;
                double engagementRate = 0.0;

                if (postData != null && postData.has("data")) {
                    for (JsonNode metric : postData.get("data")) {
                        String metricName = metric.get("name").asText();
                        int value = 0;
                        if (metric.has("values") && metric.get("values").size() > 0) {
                            value = metric.get("values").get(0).get("value").asInt(0);
                        }
                        switch (metricName) {
                            case "views" -> views = value;
                            case "likes" -> likes = value;
                            case "replies" -> commentsCount = value;
                            case "reposts", "quotes" -> shares += value;
                        }
                    }
                    
                    // Simple engagement calculation
                    engagementRate = (views > 0) ? 
                            (double)(likes + commentsCount + shares) / views * 100 : 0.0;
                }

                // Create/update analytics
                PostAnalytics analytics = new PostAnalytics();
                analytics.setPost(post);
                analytics.setLikes(likes);
                analytics.setComments(commentsCount);
                analytics.setShares(shares);
                analytics.setImpressions(0); // Threads doesn't provide impressions in free API
                analytics.setReach(0);       // Threads doesn't provide reach in free API
                analytics.setEngagedUsers(0);
                analytics.setClicks(0);
                analytics.setEngagementRate(engagementRate);
                analytics.setFetchedAt(LocalDateTime.now());

                postAnalyticsRepository.save(analytics);

                log.info("Saved Threads analytics for post {}: likes={}, comments={}, engagement={}%",
                        platformPostId, likes, commentsCount, String.format("%.2f", engagementRate));

            } catch (WebClientResponseException e) {
                log.warn("Could not fetch Threads analytics for post {} (HTTP {}): {}",
                        platformPostId, e.getStatusCode(), e.getResponseBodyAsString());
            } catch (Exception e) {
                log.error("Failed to sync Threads analytics for post {}: {}",
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
                    "/%s/threads_insights?metric=followers_count&access_token=%s",
                    userId, page.getPageAccessToken()
            );

            JsonNode pageData = client.get()
                    .uri(pageInsightsUrl)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (pageData != null && pageData.has("data")) {
                int followers = 0;
                for (JsonNode metric : pageData.get("data")) {
                    if ("followers_count".equals(metric.get("name").asText())) {
                        if (metric.has("total_value") && metric.get("total_value").has("value")) {
                            followers = metric.get("total_value").get("value").asInt(0);
                        }
                        break;
                    }
                }
                
                int postsCount = 0; // media_count is not available via threads_insights, requires checking profile

                PageAnalytics pageAnalytics = PageAnalytics.builder()
                        .page(page)
                        .platform(PlatformType.THREADS)
                        .followers(followers)
                        .postsCount(postsCount)
                        .fetchedAt(LocalDateTime.now())
                        .build();

                pageAnalyticsRepository.save(pageAnalytics);

                log.info("Saved Threads page analytics for page {}: followers={}, posts={}",
                        page.getPageName(), followers, postsCount);
            }
        } catch (WebClientResponseException e) {
            log.warn("Could not fetch Threads page analytics (HTTP {}): {}",
                    e.getStatusCode(), e.getResponseBodyAsString());
        } catch (Exception e) {
            log.error("Failed to sync Threads page analytics: {}", e.getMessage(), e);
        }
    }
}

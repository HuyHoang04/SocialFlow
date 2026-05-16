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

    private static final String GRAPH_BASE = "https://graph.threads.net/v1.0";

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
                // Fetch Threads post insights (likes, comments, repliesCount)
                String insightsUrl = String.format(
                        "%s/%s?fields=id,like_count,comments_count,text,timestamp&access_token=%s",
                        GRAPH_BASE, platformPostId, page.getPageAccessToken()
                );

                JsonNode postData = client.get()
                        .uri(java.net.URI.create(insightsUrl))
                        .retrieve()
                        .bodyToMono(JsonNode.class)
                        .block();

                log.info("Threads post metrics raw for {}: {}", platformPostId, postData);

                int likes = 0, commentsCount = 0, shares = 0;
                double engagementRate = 0.0;

                if (postData != null) {
                    likes = postData.has("like_count") ? postData.get("like_count").asInt(0) : 0;
                    commentsCount = postData.has("comments_count") ? postData.get("comments_count").asInt(0) : 0;
                    
                    // Threads doesn't have direct shares metric in basic API
                    shares = 0;
                    
                    // Simple engagement calculation
                    engagementRate = (likes + commentsCount > 0) ? 
                            (double)(likes + commentsCount) / Math.max(1, 100) * 100 : 0.0; // Placeholder calculation
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
                    "%s/%s?fields=biography,followers_count,media_count&access_token=%s",
                    GRAPH_BASE, userId, page.getPageAccessToken()
            );

            JsonNode pageData = client.get()
                    .uri(java.net.URI.create(pageInsightsUrl))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (pageData != null) {
                int followers = pageData.has("followers_count") ? pageData.get("followers_count").asInt(0) : 0;
                int postsCount = pageData.has("media_count") ? pageData.get("media_count").asInt(0) : 0;

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

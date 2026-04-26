package com.socialflow.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.socialflow.constants.ErrorMessages;
import com.socialflow.dto.AnalyticsOverviewResponse;
import com.socialflow.dto.PageAnalyticsResponse;
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
public class FacebookAnalyticsService implements PlatformAnalyticsAdapter {

    private final WebClient.Builder webClientBuilder;
    private final PostRepository postRepository;
    private final PostAnalyticsRepository postAnalyticsRepository;
    private final PageAnalyticsRepository pageAnalyticsRepository;
    private final SocialPageRepository socialPageRepository;
    private final SocialConnectionRepository socialConnectionRepository;

    private static final String GRAPH_BASE = "https://graph.facebook.com/v18.0";

    // ═══════════════════════════════════════════════════════════
    //  SYNC: Fetch analytics from Facebook API and store locally
    // ═══════════════════════════════════════════════════════════

    @Override
    public PlatformType getPlatformType() {
        return PlatformType.FACEBOOK;
    }

    @Transactional
    @Override
    public void syncPostAnalytics(UUID brandId) {
        log.info("Syncing Facebook post analytics for brand {}", brandId);
        List<SocialConnection> connections = socialConnectionRepository.findByBrandId(brandId);

        for (SocialConnection conn : connections) {
            if (conn.getPlatform() != PlatformType.FACEBOOK) continue;

            List<SocialPage> pages = socialPageRepository.findByConnectionId(conn.getId());
            for (SocialPage page : pages) {
                syncPostAnalyticsForPage(page);
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
                // Fetch basic post metrics: reactions, comments, shares
                String metricsUrl = String.format(
                        "https://graph.facebook.com/v18.0/%s?fields=%s&access_token=%s",
                        platformPostId,
                        "reactions.summary(true),comments.summary(true),shares",
                        page.getPageAccessToken()
                );
                JsonNode postData = client.get()
                        .uri(java.net.URI.create(metricsUrl))
                        .retrieve()
                        .bodyToMono(JsonNode.class)
                        .block();

                log.info("FB post metrics raw for {}: {}", platformPostId, postData);

                int likes = 0, commentsCount = 0, shares = 0;

                if (postData != null) {
                    if (postData.has("reactions") && postData.get("reactions").has("summary")) {
                        likes = postData.get("reactions").get("summary").get("total_count").asInt(0);
                    }
                    if (postData.has("comments") && postData.get("comments").has("summary")) {
                        commentsCount = postData.get("comments").get("summary").get("total_count").asInt(0);
                    }
                    if (postData.has("shares")) {
                        shares = postData.get("shares").get("count").asInt(0);
                    }
                }

                // Fetch post insights (impressions, reach, engaged users)
                int impressions = 0, reach = 0, engagedUsers = 0, clicks = 0;
                try {
                    String insightsUrl = String.format(
                            "https://graph.facebook.com/v18.0/%s/insights?metric=%s&access_token=%s",
                            platformPostId,
                            "post_impressions,post_impressions_unique,post_engaged_users,post_clicks",
                            page.getPageAccessToken()
                    );
                    JsonNode insightsData = client.get()
                            .uri(java.net.URI.create(insightsUrl))
                            .retrieve()
                            .bodyToMono(JsonNode.class)
                            .block();

                    log.info("FB post insights raw for {}: {}", platformPostId, insightsData);

                    if (insightsData != null && insightsData.has("data")) {
                        for (JsonNode metric : insightsData.get("data")) {
                            String metricName = metric.get("name").asText();
                            int value = 0;
                            if (metric.has("values") && metric.get("values").size() > 0) {
                                value = metric.get("values").get(0).get("value").asInt(0);
                            }
                            switch (metricName) {
                                case "post_impressions" -> impressions = value;
                                case "post_impressions_unique" -> reach = value;
                                case "post_engaged_users" -> engagedUsers = value;
                                case "post_clicks" -> clicks = value;
                            }
                        }
                    }
                } catch (WebClientResponseException e) {
                    log.warn("Could not fetch insights for post {} (may need page-level permissions): {}",
                            platformPostId, e.getResponseBodyAsString());
                }

                // Calculate engagement rate
                double engagementRate = 0.0;
                if (reach > 0) {
                    engagementRate = ((double)(likes + commentsCount + shares)) / reach * 100.0;
                } else if (impressions > 0) {
                    engagementRate = ((double)(likes + commentsCount + shares)) / impressions * 100.0;
                } else if (likes + commentsCount + shares > 0) {
                    // Fallback for new posts without reach data yet
                    engagementRate = ((double)(likes + commentsCount + shares)) / (likes + commentsCount + shares + 10) * 100.0;
                }

                // Save analytics snapshot
                PostAnalytics analytics = PostAnalytics.builder()
                        .post(post)
                        .platformPostId(platformPostId)
                        .likes(likes)
                        .comments(commentsCount)
                        .shares(shares)
                        .impressions(impressions)
                        .reach(reach)
                        .engagedUsers(engagedUsers)
                        .clicks(clicks)
                        .engagementRate(Math.round(engagementRate * 100.0) / 100.0)
                        .fetchedAt(LocalDateTime.now())
                        .build();

                postAnalyticsRepository.save(analytics);
                log.info("Saved analytics for post {}: likes={}, comments={}, shares={}, impressions={}, reach={}",
                        platformPostId, likes, commentsCount, shares, impressions, reach);

            } catch (WebClientResponseException e) {
                log.error("Failed to fetch Facebook analytics for post {} (HTTP {}): {}",
                        platformPostId, e.getStatusCode(), e.getResponseBodyAsString());
            } catch (Exception e) {
                log.error("Failed to fetch Facebook analytics for post {}: {}", platformPostId, e.getMessage());
            }
        }
    }

    /**
     * SYNC PAGE METRICS
     */
    @Transactional
    @Override
    public void syncPageAnalytics(UUID brandId) {
        log.info("Syncing Facebook page analytics for brand {}", brandId);
        List<SocialConnection> connections = socialConnectionRepository.findByBrandId(brandId);
        WebClient client = webClientBuilder.baseUrl(GRAPH_BASE).build();

        for (SocialConnection conn : connections) {
            if (conn.getPlatform() != PlatformType.FACEBOOK) continue;

            List<SocialPage> pages = socialPageRepository.findByConnectionId(conn.getId());
            for (SocialPage page : pages) {
                try {
                    // Fetch page info: followers, fan count
                    String pageInfoUrl = String.format(
                            "https://graph.facebook.com/v18.0/%s?fields=followers_count,fan_count&access_token=%s",
                            page.getPlatformPageId(), page.getPageAccessToken()
                    );
                    JsonNode pageData = client.get()
                            .uri(java.net.URI.create(pageInfoUrl))
                            .retrieve()
                            .bodyToMono(JsonNode.class)
                            .block();

                    int followers = 0, fanCount = 0;
                    if (pageData != null) {
                        followers = pageData.has("followers_count") ? pageData.get("followers_count").asInt(0) : 0;
                        fanCount = pageData.has("fan_count") ? pageData.get("fan_count").asInt(0) : 0;
                    }

                    // Fetch page insights
                    int pageImpressions = 0, pageEngagedUsers = 0, pageViews = 0, newFollowers = 0;
                    try {
                        String pageInsightsUrl = String.format(
                                "https://graph.facebook.com/v18.0/%s/insights?metric=%s&period=day&access_token=%s",
                                page.getPlatformPageId(),
                                "page_impressions,page_engaged_users,page_views_total,page_fan_adds",
                                page.getPageAccessToken()
                        );
                        JsonNode insightsData = client.get()
                                .uri(java.net.URI.create(pageInsightsUrl))
                                .retrieve()
                                .bodyToMono(JsonNode.class)
                                .block();

                        if (insightsData != null && insightsData.has("data")) {
                            for (JsonNode metric : insightsData.get("data")) {
                                String metricName = metric.get("name").asText();
                                int value = 0;
                                if (metric.has("values") && metric.get("values").size() > 0) {
                                    // Get the latest value
                                    JsonNode values = metric.get("values");
                                    value = values.get(values.size() - 1).get("value").asInt(0);
                                }
                                switch (metricName) {
                                    case "page_impressions" -> pageImpressions = value;
                                    case "page_engaged_users" -> pageEngagedUsers = value;
                                    case "page_views_total" -> pageViews = value;
                                    case "page_fan_adds" -> newFollowers = value;
                                }
                            }
                        }
                    } catch (WebClientResponseException e) {
                        log.warn("Could not fetch page insights for {} : {}", page.getPageName(), e.getResponseBodyAsString());
                    }

                    // Count posts for this page
                    int postsCount = postRepository.findByPageIdOrderByCreatedAtDesc(page.getId()).size();

                    // Calculate avg engagement from stored post analytics
                    List<PostAnalytics> postAnalyticsList = postAnalyticsRepository
                            .findByPostPageIdOrderByFetchedAtDesc(page.getId());
                    double avgEngagement = 0.0;
                    if (!postAnalyticsList.isEmpty()) {
                        // Get latest analytics per post
                        Map<UUID, PostAnalytics> latestPerPost = new LinkedHashMap<>();
                        for (PostAnalytics pa : postAnalyticsList) {
                            latestPerPost.putIfAbsent(pa.getPost().getId(), pa);
                        }
                        avgEngagement = latestPerPost.values().stream()
                                .mapToDouble(PostAnalytics::getEngagementRate)
                                .average()
                                .orElse(0.0);
                        avgEngagement = Math.round(avgEngagement * 100.0) / 100.0;
                    }

                    PageAnalytics analytics = PageAnalytics.builder()
                            .page(page)
                            .platform(PlatformType.FACEBOOK)
                            .followers(followers)
                            .totalPageLikes(fanCount)
                            .pageViews(pageViews)
                            .newFollowers(newFollowers)
                            .pageImpressions(pageImpressions)
                            .pageEngagedUsers(pageEngagedUsers)
                            .postsCount(postsCount)
                            .avgEngagementRate(avgEngagement)
                            .fetchedAt(LocalDateTime.now())
                            .build();

                    pageAnalyticsRepository.save(analytics);
                    log.info("Saved page analytics for {}: followers={}, impressions={}, views={}",
                            page.getPageName(), followers, pageImpressions, pageViews);

                } catch (WebClientResponseException e) {
                    log.error("Failed to fetch Facebook page analytics for {} (HTTP {}): {}",
                            page.getPageName(), e.getStatusCode(), e.getResponseBodyAsString());
                } catch (Exception e) {
                    log.error("Failed to fetch Facebook page analytics for {}: {}", page.getPageName(), e.getMessage());
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  READ methods moved to AnalyticsService
    // ═══════════════════════════════════════════════════════════
}

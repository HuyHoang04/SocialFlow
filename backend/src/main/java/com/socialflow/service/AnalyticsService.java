package com.socialflow.service;

import com.socialflow.constants.ErrorMessages;
import com.socialflow.dto.AnalyticsOverviewResponse;
import com.socialflow.dto.PageAnalyticsResponse;
import com.socialflow.dto.PostAnalyticsResponse;
import com.socialflow.model.*;
import com.socialflow.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final PostRepository postRepository;
    private final PostAnalyticsRepository postAnalyticsRepository;
    private final PageAnalyticsRepository pageAnalyticsRepository;
    private final SocialPageRepository socialPageRepository;
    private final SocialConnectionRepository socialConnectionRepository;

    public AnalyticsOverviewResponse getOverview(UUID brandId) {
        // Latest post analytics per post
        List<PostAnalytics> allPostAnalytics = postAnalyticsRepository
                .findByPostPageConnectionBrandIdOrderByFetchedAtDesc(brandId);
        Map<UUID, PostAnalytics> latestPerPost = new LinkedHashMap<>();
        for (PostAnalytics pa : allPostAnalytics) {
            latestPerPost.putIfAbsent(pa.getPost().getId(), pa);
        }
        Collection<PostAnalytics> latestAnalytics = latestPerPost.values();

        int totalLikes = latestAnalytics.stream().mapToInt(PostAnalytics::getLikes).sum();
        int totalComments = latestAnalytics.stream().mapToInt(PostAnalytics::getComments).sum();
        int totalShares = latestAnalytics.stream().mapToInt(PostAnalytics::getShares).sum();
        int totalImpressions = latestAnalytics.stream().mapToInt(PostAnalytics::getImpressions).sum();
        int totalReach = latestAnalytics.stream().mapToInt(PostAnalytics::getReach).sum();
        double avgEngagement = latestAnalytics.stream()
                .mapToDouble(PostAnalytics::getEngagementRate)
                .average().orElse(0.0);

        // Count total posts from DB for all channels
        int totalPosts = (int) postRepository.countByPageConnectionBrandId(brandId);
        int totalPublished = (int) postRepository.countByStatusAndPageConnectionBrandId(com.socialflow.model.enums.PostStatus.PUBLISHED, brandId);

        // Top posts by engagement (Sort by total interactions desc, then by Rate desc)
        List<PostAnalyticsResponse> topPosts = latestAnalytics.stream()
                .sorted((a, b) -> {
                    int totalA = a.getLikes() + a.getComments() + a.getShares();
                    int totalB = b.getLikes() + b.getComments() + b.getShares();
                    int totalCompare = Integer.compare(totalB, totalA);
                    if (totalCompare != 0) return totalCompare;
                    
                    return Double.compare(b.getEngagementRate(), a.getEngagementRate());
                })
                .limit(10)
                .map(this::toPostAnalyticsResponse)
                .collect(Collectors.toList());

        // Page analytics
        List<PageAnalytics> pageAnalyticsList = pageAnalyticsRepository
                .findByPageConnectionBrandIdOrderByFetchedAtDesc(brandId);
        Map<UUID, PageAnalytics> latestPerPage = new LinkedHashMap<>();
        for (PageAnalytics pa : pageAnalyticsList) {
            latestPerPage.putIfAbsent(pa.getPage().getId(), pa);
        }
        List<PageAnalyticsResponse> pages = latestPerPage.values().stream()
                .map(this::toPageAnalyticsResponse)
                .collect(Collectors.toList());

        return AnalyticsOverviewResponse.builder()
                .totalPosts(totalPosts)
                .totalPublished(totalPublished)
                .totalLikes(totalLikes)
                .totalComments(totalComments)
                .totalShares(totalShares)
                .totalImpressions(totalImpressions)
                .totalReach(totalReach)
                .avgEngagementRate(Math.round(avgEngagement * 100.0) / 100.0)
                .topPosts(topPosts)
                .pages(pages)
                .build();
    }

    public List<PostAnalyticsResponse> getPostAnalyticsByBrand(UUID brandId) {
        List<PostAnalytics> all = postAnalyticsRepository
                .findByPostPageConnectionBrandIdOrderByFetchedAtDesc(brandId);
        Map<UUID, PostAnalytics> latestPerPost = new LinkedHashMap<>();
        for (PostAnalytics pa : all) {
            latestPerPost.putIfAbsent(pa.getPost().getId(), pa);
        }
        return latestPerPost.values().stream()
                .map(this::toPostAnalyticsResponse)
                .collect(Collectors.toList());
    }

    public PostAnalyticsResponse getPostAnalytics(UUID postId) {
        PostAnalytics latest = postAnalyticsRepository.findFirstByPostIdOrderByFetchedAtDesc(postId)
                .orElseThrow(() -> new RuntimeException(ErrorMessages.POST_ANALYTICS_NOT_FOUND + postId));
        return toPostAnalyticsResponse(latest);
    }

    public List<PostAnalyticsResponse> getPostAnalyticsHistory(UUID postId) {
        return postAnalyticsRepository.findByPostIdOrderByFetchedAtDesc(postId).stream()
                .map(this::toPostAnalyticsResponse)
                .collect(Collectors.toList());
    }

    public PageAnalyticsResponse getPageAnalytics(UUID pageId) {
        PageAnalytics latest = pageAnalyticsRepository.findFirstByPageIdOrderByFetchedAtDesc(pageId)
                .orElseThrow(() -> new RuntimeException(ErrorMessages.PAGE_ANALYTICS_NOT_FOUND + pageId));
        return toPageAnalyticsResponse(latest);
    }

    public List<PageAnalyticsResponse> getPageAnalyticsHistory(UUID pageId) {
        return pageAnalyticsRepository.findByPageIdOrderByFetchedAtDesc(pageId).stream()
                .map(this::toPageAnalyticsResponse)
                .collect(Collectors.toList());
    }

    // Mappers
    private PostAnalyticsResponse toPostAnalyticsResponse(PostAnalytics pa) {
        Post post = pa.getPost();
        SocialPage page = post.getPage();
        String platformPostUrl = post.getPublishResults().stream()
                .filter(r -> r.getSuccess() != null && r.getSuccess())
                .map(PublishResult::getPlatformPostUrl)
                .findFirst()
                .orElse(null);

        return PostAnalyticsResponse.builder()
                .id(pa.getId())
                .postId(post.getId())
                .postContent(post.getContent().length() > 120
                        ? post.getContent().substring(0, 120) + "..."
                        : post.getContent())
                .platformPostId(pa.getPlatformPostId())
                .platformPostUrl(platformPostUrl)
                .platform(page != null ? page.getPlatform() : null)
                .pageName(page != null ? page.getPageName() : null)
                .likes(pa.getLikes())
                .comments(pa.getComments())
                .shares(pa.getShares())
                .impressions(pa.getImpressions())
                .reach(pa.getReach())
                .engagedUsers(pa.getEngagedUsers())
                .clicks(pa.getClicks())
                .engagementRate(pa.getEngagementRate())
                .fetchedAt(pa.getFetchedAt())
                .publishedAt(post.getPublishedAt())
                .build();
    }

    private PageAnalyticsResponse toPageAnalyticsResponse(PageAnalytics pa) {
        SocialPage page = pa.getPage();
        SocialConnection conn = page.getConnection();

        return PageAnalyticsResponse.builder()
                .id(pa.getId())
                .pageId(page.getId())
                .pageName(page.getPageName())
                .platform(pa.getPlatform())
                .brandName(conn.getBrand().getName())
                .followers(pa.getFollowers())
                .totalPageLikes(pa.getTotalPageLikes())
                .pageViews(pa.getPageViews())
                .newFollowers(pa.getNewFollowers())
                .pageImpressions(pa.getPageImpressions())
                .pageEngagedUsers(pa.getPageEngagedUsers())
                .postsCount(pa.getPostsCount())
                .avgEngagementRate(pa.getAvgEngagementRate())
                .fetchedAt(pa.getFetchedAt())
                .build();
    }
}

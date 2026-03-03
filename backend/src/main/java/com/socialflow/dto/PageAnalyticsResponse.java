package com.socialflow.dto;

import com.socialflow.model.enums.PlatformType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder
public class PageAnalyticsResponse {
    private UUID id;
    private UUID pageId;
    private String pageName;
    private PlatformType platform;
    private String brandName;
    private Integer followers;
    private Integer totalPageLikes;
    private Integer pageViews;
    private Integer newFollowers;
    private Integer pageImpressions;
    private Integer pageEngagedUsers;
    private Integer postsCount;
    private Double avgEngagementRate;
    private LocalDateTime fetchedAt;
}

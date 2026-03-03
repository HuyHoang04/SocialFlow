package com.socialflow.dto;

import com.socialflow.model.enums.PlatformType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder
public class PostAnalyticsResponse {
    private UUID id;
    private UUID postId;
    private String postContent;
    private String platformPostId;
    private String platformPostUrl;
    private PlatformType platform;
    private String pageName;
    private Integer likes;
    private Integer comments;
    private Integer shares;
    private Integer impressions;
    private Integer reach;
    private Integer engagedUsers;
    private Integer clicks;
    private Double engagementRate;
    private LocalDateTime fetchedAt;
    private LocalDateTime publishedAt;
}

package com.socialflow.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data @Builder
public class AnalyticsOverviewResponse {
    private int totalPosts;
    private int totalPublished;
    private int totalLikes;
    private int totalComments;
    private int totalShares;
    private int totalImpressions;
    private int totalReach;
    private double avgEngagementRate;
    private List<PostAnalyticsResponse> topPosts;
    private List<PageAnalyticsResponse> pages;
}

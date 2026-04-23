package com.socialflow.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrendingConfigRequest {
    private UUID brandId;  // Required: which brand
    private String geo;
    private String source;  // 'google', 'facebook', 'twitter'
    private String categoryId;  // For Google Trends
    private String searchKeyword;  // For Facebook posts
}

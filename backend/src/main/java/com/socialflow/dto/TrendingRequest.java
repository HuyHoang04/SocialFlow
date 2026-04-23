package com.socialflow.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrendingRequest {
    @JsonProperty("geo")
    @Builder.Default
    private String geo = "VN"; // Default to Vietnam
    
    @JsonProperty("category_id")
    private String categoryId; // Optional: 1-20, see google-trends-trending-now-categories.json
    
    @JsonProperty("brand_name")
    private String brandName; // For logging/tracking
}

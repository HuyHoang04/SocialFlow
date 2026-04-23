package com.socialflow.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrendingRequest {
    @JsonProperty("brand_id")
    private UUID brandId;  // Required: which brand's trending data
    
    @JsonProperty("geo")
    @Builder.Default
    private String geo = "VN"; // Default to Vietnam
    
    @JsonProperty("category_id")
    private String categoryId; // Optional: 1-20 for Google Trends
    
    @JsonProperty("search_keyword")
    private String searchKeyword; // For Facebook posts search
    
    @JsonProperty("brand_name")
    private String brandName; // For logging/tracking
}

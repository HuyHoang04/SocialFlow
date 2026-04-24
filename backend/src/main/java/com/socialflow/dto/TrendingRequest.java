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

    @JsonProperty("source")
    @Builder.Default
    private String source = "google"; // 'google' | 'facebook'

    // Legacy fields kept for backward compat / default endpoints
    @JsonProperty("geo")
    private String geo;

    @JsonProperty("category_id")
    private String categoryId;

    @JsonProperty("search_keyword")
    private String searchKeyword;

    @JsonProperty("brand_name")
    private String brandName;
}

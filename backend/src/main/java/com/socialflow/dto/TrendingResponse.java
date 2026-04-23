package com.socialflow.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.gson.JsonObject;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrendingResponse {
    private boolean success;
    
    @JsonProperty("trending_searches")
    private List<Map<String, Object>> trendingSearches;
    
    @JsonProperty("geo")
    private String geo;
    
    @JsonProperty("category_id")
    private String categoryId;
    
    @JsonProperty("raw_response")
    private JsonObject rawResponse; // Full response from SerpAPI for debugging
    
    private String error;
}

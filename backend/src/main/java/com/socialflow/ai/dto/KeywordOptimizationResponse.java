package com.socialflow.ai.dto;

import lombok.*;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Response DTO for keyword optimization endpoint
 * StandardResponse with keywords, hashtags, provider, model, and cost tracking
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KeywordOptimizationResponse {
    
    private Boolean success;
    
    private List<String> keywords;
    
    private List<String> hashtags;
    
    @JsonProperty("trending_topics")
    private List<String> trendingTopics;
    
    private String provider;
    
    private String model;
    
    private Float cost;
    
    private Integer tokens;
    
    private String error;
    
    /**
     * Helper method to check if response is successful
     */
    public boolean isSuccessful() {
        return success != null && success;
    }
    
    /**
     * Helper method to get error message or empty string
     */
    public String getErrorMessage() {
        return error != null ? error : "";
    }
}

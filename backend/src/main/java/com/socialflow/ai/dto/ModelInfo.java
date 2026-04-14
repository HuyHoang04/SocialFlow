package com.socialflow.ai.dto;

import lombok.*;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * DTO representing a single AI model
 * Contains model metadata for display and selection
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModelInfo {
    
    @JsonProperty("id")
    private String id;
    
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("provider")
    private String provider;
    
    @JsonProperty("is_free")
    private Boolean isFree;
    
    @JsonProperty("input_cost")
    private Float inputCost;
    
    @JsonProperty("output_cost")
    private Float outputCost;
    
    @JsonProperty("context_window")
    private Integer contextWindow;
    
    /**
     * Helper method to check if model is free
     */
    public boolean isFreeTier() {
        return isFree != null && isFree;
    }
    
    /**
     * Helper method to get total cost per 1M tokens (input + output)
     */
    public Float getCostPer1MTokens() {
        float input = inputCost != null ? inputCost : 0f;
        float output = outputCost != null ? outputCost : 0f;
        return input + output;
    }
    
    /**
     * Helper method to get display name with free badge
     */
    public String getDisplayName() {
        if (isFreeTier()) {
            return name + " [FREE]";
        }
        return name;
    }
}

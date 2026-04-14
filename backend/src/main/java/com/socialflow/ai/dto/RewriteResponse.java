package com.socialflow.ai.dto;

import lombok.*;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Response DTO for content rewrite endpoint
 * StandardResponse structure with rewritten content, provider, model, and cost tracking
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RewriteResponse {
    
    private Boolean success;
    
    @JsonProperty("rewritten_content")
    private String rewritten;
    
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

package com.socialflow.ai.dto;

import lombok.*;

/**
 * Response DTO for content generation endpoint
 * StandardResponse structure with content, provider, model, and cost tracking
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContentResponse {
    
    private Boolean success;
    
    private String content;
    
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

package com.socialflow.ai.dto;

import lombok.*;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

/**
 * Response DTO for image generation endpoint
 * StandardResponse with generated images, provider, model, and cost tracking
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImageGenerationResponse {
    
    private Boolean success;
    
    private List<Map<String, Object>> images;
    
    private String provider;
    
    private String model;
    
    private Float cost;
    
    @JsonProperty("image_count")
    private Integer imageCount;
    
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
    
    /**
     * Helper method to get generated image count
     */
    public Integer getGeneratedImageCount() {
        return imageCount != null ? imageCount : 0;
    }
}

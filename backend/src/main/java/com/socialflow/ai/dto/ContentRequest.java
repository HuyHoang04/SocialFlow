package com.socialflow.ai.dto;

import lombok.*;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;

/**
 * Request DTO for content generation endpoint
 * Requires provider and model selection for AI endpoint calls
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContentRequest {
    
    @NotBlank(message = "prompt is required")
    private String prompt;
    
    @Builder.Default
    private String tone = "professional";
    
    @Builder.Default
    private String platform = "general";
    
    @JsonProperty("max_words")
    @Builder.Default
    @Min(value = 10, message = "maxWords must be at least 10 words")
    @Max(value = 1500, message = "maxWords cannot exceed 1500 words")
    private Integer maxWords = 150;
    
    @NotBlank(message = "provider is required")
    private String provider;
    
    @NotBlank(message = "model is required")
    private String model;
    
    /**
     * Validate provider is one of: groq, openrouter
     */
    public boolean isValidProvider() {
        return provider != null && 
               (provider.equals("groq") || provider.equals("openrouter"));
    }
    
    /**
     * Validate model is not empty
     */
    public boolean isValidModel() {
        return model != null && !model.isEmpty();
    }
}

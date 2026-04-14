package com.socialflow.ai.dto;

import lombok.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;

/**
 * Request DTO for image generation endpoint
 * Requires provider and model selection for AI endpoint calls
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImageGenerationRequest {
    
    @NotBlank(message = "prompt is required")
    private String prompt;
    
    @Builder.Default
    private String style = "photorealistic";
    
    @Builder.Default
    private String platform = "general";
    
    @Builder.Default
    @Min(256)
    @Max(2048)
    private Integer width = 1024;
    
    @Builder.Default
    @Min(256)
    @Max(2048)
    private Integer height = 1024;
    
    @Builder.Default
    @Min(1)
    @Max(10)
    private Integer count = 1;
    
    @NotBlank(message = "provider is required")
    private String provider;
    
    @NotBlank(message = "model is required")
    private String model;
    
    /**
     * Validate provider is one of: pixazo, openrouter
     */
    public boolean isValidProvider() {
        return provider != null && 
               (provider.equals("pixazo") || provider.equals("openrouter"));
    }
    
    /**
     * Validate model is not empty
     */
    public boolean isValidModel() {
        return model != null && !model.isEmpty();
    }
}

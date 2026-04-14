package com.socialflow.ai.dto;

import lombok.*;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.DecimalMax;

/**
 * Request DTO for RAG (Retrieval-Augmented Generation) content generation endpoint
 * Combines content library search with AI generation
 * Requires provider and model selection for AI endpoint calls
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RagGenerateContentRequest {
    
    @JsonProperty("brand_id")
    @NotBlank(message = "brand_id is required")
    private String brandId;
    
    @NotBlank(message = "prompt is required")
    private String prompt;
    
    @JsonProperty("rag_query")
    private String ragQuery;
    
    @JsonProperty("rag_limit")
    @Builder.Default
    @Min(1)
    @Max(20)
    private Integer ragLimit = 3;
    
    @JsonProperty("rag_threshold")
    @Builder.Default
    @DecimalMin("0.0")
    @DecimalMax("1.0")
    private Float ragThreshold = 0.3f;
    
    @NotBlank(message = "provider is required")
    private String provider;
    
    @NotBlank(message = "model is required")
    private String model;
    
    private String tone;
    
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

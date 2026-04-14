package com.socialflow.ai.dto;

import lombok.*;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

/**
 * Request DTO for embedding generation endpoint
 * Uses multimodal embeddings (text + images)
 * Model defaults to "auto" (nvidia/llama-nemotron-embed-vl-1b-v2)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmbeddingRequest {
    
    @JsonProperty("brand_id")
    @NotBlank(message = "brand_id is required")
    private String brandId;
    
    @NotEmpty(message = "texts is required and cannot be empty")
    private List<String> texts;
    
    private List<String> images;
    
    @Builder.Default
    private String provider = "openrouter";
    
    @Builder.Default
    private String model = "auto";
    
    /**
     * Validate model is not empty
     */
    public boolean isValidModel() {
        return model != null && !model.isEmpty();
    }
}

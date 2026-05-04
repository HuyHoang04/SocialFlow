package com.socialflow.ai.dto;

import lombok.*;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

/**
 * Request DTO for embedding generation endpoint
 * Uses multimodal embeddings (text + images)
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
    
}

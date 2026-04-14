package com.socialflow.ai.dto;

import lombok.*;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Response DTO for embedding generation endpoint
 * Returns embeddings for texts/images (2048 dimensions each)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmbeddingResponse {
    
    private Boolean success;
    
    private List<List<Float>> embeddings;
    
    private String provider;
    
    private String model;
    
    private Float cost;
    
    @JsonProperty("embedding_count")
    private Integer embeddingCount;
    
    @JsonProperty("dimension")
    private Integer dimensions;
    
    @JsonProperty("token_count")
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
    
    /**
     * Helper method to get embedding count
     */
    public Integer getEmbeddingCount() {
        return embeddingCount != null ? embeddingCount : 0;
    }
}

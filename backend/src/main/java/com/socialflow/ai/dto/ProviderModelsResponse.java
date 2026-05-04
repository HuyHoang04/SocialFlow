package com.socialflow.ai.dto;

import lombok.*;
import java.util.List;

/**
 * Response DTO for model listing endpoints
 * Returns available models for a provider
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProviderModelsResponse {
    
    private Boolean success;
    
    private String provider;
    
    private List<ModelInfo> models;
    
    private Integer totalModels;
    
    private Integer freeModelsCount;
    
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
     * Helper method to get total models count
     */
    public Integer getModelCount() {
        return totalModels != null ? totalModels : (models != null ? models.size() : 0);
    }
    
    /**
     * Helper method to get free models count
     */
    public Integer getFreeTierCount() {
        if (freeModelsCount != null) {
            return freeModelsCount;
        }
        if (models != null) {
            return Math.toIntExact(models.stream().filter(m -> m.isFreeTier()).count());
        }
        return 0;
    }
}

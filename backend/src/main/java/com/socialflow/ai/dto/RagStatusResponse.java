package com.socialflow.ai.dto;

import lombok.*;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Map;

/**
 * Response DTO for RAG status endpoint
 * Returns indexing status for a brand's RAG
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RagStatusResponse {
    
    private Boolean success;
    
    @JsonProperty("brand_id")
    private String brandId;
    
    @JsonProperty("status_data")
    private Map<String, Object> statusData;
    
    private String error;
    
    /**
     * Helper method to check if response is successful
     */
    public boolean isSuccessful() {
        return success != null && success;
    }
    
    /**
     * Helper method to get error message
     */
    public String getErrorMessage() {
        return error != null ? error : "";
    }
}

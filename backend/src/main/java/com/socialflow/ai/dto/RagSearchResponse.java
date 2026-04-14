package com.socialflow.ai.dto;

import lombok.*;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

/**
 * Response DTO for RAG search endpoint
 * Returns similar chunks with similarity scores
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RagSearchResponse {
    
    private Boolean success;
    
    private List<Map<String, Object>> results;
    
    private String query;
    
    @JsonProperty("total_results")
    private Integer totalResults;
    
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
     * Helper method to get results count
     */
    public Integer getResultCount() {
        return totalResults != null ? totalResults : 0;
    }
}

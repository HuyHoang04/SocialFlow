package com.socialflow.ai.dto;

import lombok.*;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Response DTO for RAG delete endpoint
 * Returns status of deletion operation
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RagDeleteResponse {
    
    private Boolean success;
    
    private String message;
    
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

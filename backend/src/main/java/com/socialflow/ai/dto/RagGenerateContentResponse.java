package com.socialflow.ai.dto;

import lombok.*;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

/**
 * Response DTO for RAG (Retrieval-Augmented Generation) content generation endpoint
 * Returns generated content with RAG context used (retrieved chunks)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RagGenerateContentResponse {
    
    private Boolean success;
    
    private String content;
    
    @JsonProperty("rag_context")
    private List<Map<String, Object>> ragContext;
    
    @JsonProperty("rag_query_used")
    private String ragQueryUsed;
    
    @JsonProperty("rag_results_count")
    private Integer ragResultsCount;
    
    @JsonProperty("tokens_used")
    private Integer tokensUsed;
    
    @JsonProperty("ai_model")
    private String aiModel;
    
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
     * Helper method to get RAG results count
     */
    public Integer getRagResultCount() {
        return ragResultsCount != null ? ragResultsCount : 0;
    }
}

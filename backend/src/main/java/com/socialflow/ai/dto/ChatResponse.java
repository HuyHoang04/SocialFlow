package com.socialflow.ai.dto;

import lombok.*;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

/**
 * Response DTO for AI Chat endpoint
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatResponse {
    
    private Boolean success;
    
    private String answer;
    
    @JsonProperty("session_id")
    private String sessionId;
    
    @JsonProperty("source_documents")
    private List<Map<String, Object>> sourceDocuments;
    
    @JsonProperty("suggested_entities")
    private AiSuggestedEntities suggestedEntities;
    
    @JsonProperty("suggested_replies")
    private List<String> suggestedReplies;
    
    private String error;
}

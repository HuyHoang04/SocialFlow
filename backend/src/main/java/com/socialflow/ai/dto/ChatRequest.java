package com.socialflow.ai.dto;

import lombok.*;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Request DTO for AI Chat endpoint
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRequest {
    
    @JsonProperty("brand_id")
    private String brandId;
    
    @JsonProperty("user_id")
    private String userId;
    
    @JsonProperty("session_id")
    private String sessionId;
    
    private String message;
    
    @JsonProperty("context_data")
    private String contextData;
    
    @JsonProperty("chat_mode")
    private String chatMode;
    
}

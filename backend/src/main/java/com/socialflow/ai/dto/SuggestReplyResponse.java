package com.socialflow.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonProperty;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SuggestReplyResponse {
    private boolean success;
    private String suggestion;
    private String provider;
    private String model;
    
    @JsonProperty("rag_used")
    private boolean ragUsed;
    
    private String error;
}

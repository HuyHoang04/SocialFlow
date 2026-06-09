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
public class RagContentResponse {
    private boolean success;
    
    @JsonProperty("brand_id")
    private String brandId;
    
    @JsonProperty("library_id")
    private String libraryId;
    
    private String content;
    private String error;
}

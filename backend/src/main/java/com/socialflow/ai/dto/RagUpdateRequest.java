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
public class RagUpdateRequest {
    @JsonProperty("brand_id")
    private String brandId;
    
    private String content;
    private String provider;
    private String model;
}

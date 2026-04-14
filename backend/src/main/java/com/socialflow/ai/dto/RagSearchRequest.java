package com.socialflow.ai.dto;

import lombok.*;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.DecimalMax;

/**
 * Request DTO for RAG search endpoint
 * Searches content library for similar documents
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RagSearchRequest {
    
    @JsonProperty("brand_id")
    @NotBlank(message = "brand_id is required")
    private String brandId;
    
    @NotBlank(message = "query is required")
    private String query;
    
    @Builder.Default
    @Min(1)
    private Integer limit = 5;
    
    @Builder.Default
    @DecimalMin("0.0")
    @DecimalMax("1.0")
    private Float threshold = 0.3f;
    
    private String model;
    
    /**
     * Validate query is not empty
     */
    public boolean isValidQuery() {
        return query != null && !query.isEmpty();
    }
}

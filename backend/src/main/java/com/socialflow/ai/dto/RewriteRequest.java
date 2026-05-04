package com.socialflow.ai.dto;

import lombok.*;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;

/**
 * Request DTO for content rewrite endpoint
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RewriteRequest {
    
    @NotBlank(message = "brandId is required")
    @JsonProperty("brand_id")
    private String brandId;
    
    @NotBlank(message = "content is required")
    private String content;
    
    @NotBlank(message = "tone is required")
    private String tone;
    
    @Builder.Default
    private String platform = "general";
    
    @JsonProperty("max_words")
    @Builder.Default
    @Min(value = 10, message = "maxWords must be at least 10 words")
    @Max(value = 1500, message = "maxWords cannot exceed 1500 words")
    private Integer maxWords = 150;
    
}

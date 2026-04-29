package com.socialflow.ai.dto;

import lombok.*;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import java.util.List;

/**
 * Request DTO for keyword optimization endpoint
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KeywordOptimizationRequest {
    
    @NotBlank(message = "brandId is required")
    @JsonProperty("brand_id")
    private String brandId;
    
    @NotBlank(message = "content is required")
    private String content;
    
    private List<String> keywords;
    
    @Builder.Default
    private String platform = "general";
    
    @JsonProperty("max_hashtags")
    @Builder.Default
    private Integer maxHashtags = 10;
    
    @JsonProperty("max_words")
    @Builder.Default
    @Min(value = 10, message = "maxWords must be at least 10 words")
    @Max(value = 1500, message = "maxWords cannot exceed 1500 words")
    private Integer maxWords = 150;
    
}

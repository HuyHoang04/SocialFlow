package com.socialflow.ai.dto;

import lombok.*;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;

/**
 * Request DTO for image generation endpoint
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImageGenerationRequest {
    
    @NotBlank(message = "brandId is required")
    @JsonProperty("brand_id")
    private String brandId;
    
    @NotBlank(message = "prompt is required")
    private String prompt;
    
    @Builder.Default
    private String style = "photorealistic";
    
    @Builder.Default
    private String platform = "general";
    
    @Builder.Default
    @Min(256)
    @Max(2048)
    private Integer width = 1024;
    
    @Builder.Default
    @Min(256)
    @Max(2048)
    private Integer height = 1024;
    
    @Builder.Default
    @Min(1)
    @Max(10)
    private Integer count = 1;
    
}

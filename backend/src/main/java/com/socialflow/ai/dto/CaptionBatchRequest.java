package com.socialflow.ai.dto;

import lombok.*;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * Request DTO for batch caption generation
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CaptionBatchRequest {

    @NotBlank(message = "brandId is required")
    @JsonProperty("brand_id")
    private String brandId;

    @NotEmpty(message = "platforms are required")
    private List<String> platforms;

    @NotBlank(message = "category is required")
    private String category;

    @Builder.Default
    private String tone = "professional";

    @NotBlank(message = "userBrief is required")
    @JsonProperty("user_brief")
    private String userBrief;

    @JsonProperty("use_rag")
    @Builder.Default
    private Boolean useRag = false;

    @JsonProperty("scheduled_time")
    private String scheduledTime;
    
    // Optional provider/model overrides
    private String provider;
    private String model;
}

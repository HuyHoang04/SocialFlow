package com.socialflow.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BrandSuggestionRequest {
    @NotBlank
    private String brandName;
}

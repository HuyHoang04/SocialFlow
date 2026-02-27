package com.socialflow.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateBrandRequest {
    @NotBlank
    private String name;
    private String description;
    private String logoUrl;
}

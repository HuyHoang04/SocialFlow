package com.socialflow.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateBrandRequest {
    @NotBlank
    private String name;
    
    private String description;
    private String logoUrl;
    private String website;
    private String contactEmail;
    private String phone;
    private String industry;
    private String country;
    private String brandSlogan;
    private String primaryColor;
    private String secondaryColor;
    private String aiVoiceGuidelines;
    private String aiContentGuardrails;
}

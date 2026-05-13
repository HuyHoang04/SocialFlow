package com.socialflow.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BrandSuggestionResponse {
    private String brandSlogan;
    private String suggestedIndustry;
    private String primaryColor;
    private String secondaryColor;
    private String website;
}

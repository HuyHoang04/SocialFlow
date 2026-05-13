package com.socialflow.dto;

import com.socialflow.model.Brand;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateBrandResponse {
    private UUID id;
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
    private Long connectionCount;
    private String token;  // New JWT token with updated brand roles
}

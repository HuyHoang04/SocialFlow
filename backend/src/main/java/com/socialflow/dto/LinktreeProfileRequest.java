package com.socialflow.dto;

import lombok.Data;

/**
 * Request body for creating/updating a BrandLinktreeProfile.
 */
@Data
public class LinktreeProfileRequest {
    private String slug;
    private String bio;
    private String displayName;
    private String websiteLabel;
    private String bgStyle;
    private String bgImageUrl;
    private String buttonStyle;
    private boolean published;
    private String customLinks;
}

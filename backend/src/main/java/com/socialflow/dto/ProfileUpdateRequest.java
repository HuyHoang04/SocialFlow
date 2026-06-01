package com.socialflow.dto;

import lombok.Data;

@Data
public class ProfileUpdateRequest {
    private String bio;           // description / about
    private String coverImageUrl; // URL of new cover photo (Cloudinary or external)
    private String avatarUrl;     // URL of new profile picture
    private String website;       // website URL (where supported)
}

package com.socialflow.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class CreatePostRequest {
    @NotBlank
    private String content;

    // List of page IDs to publish to (for multi-page publish)
    private List<UUID> pageIds;

    // List of uploaded media IDs to attach
    private List<UUID> mediaIds;
}

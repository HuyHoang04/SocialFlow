package com.socialflow.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
public class CreatePostRequest {
    @NotBlank
    private String content;

    // List of page IDs to publish to (for multi-page publish)
    private List<UUID> pageIds;

    // List of media filenames (saved to disk during upload, not yet in DB)
    private List<String> mediaFilenames;

    // ISO-8601 string for scheduled publishing
    private String scheduledTime;

    // Optional campaign reference
    private UUID campaignId;

    // Platform-specific content override (pageId -> custom content)
    private Map<UUID, String> platformContent;
}

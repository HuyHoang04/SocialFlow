package com.socialflow.dto;

import com.socialflow.model.enums.PlatformType;
import com.socialflow.model.enums.PostStatus;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data @Builder
public class PostResponse {
    private UUID id;
    private UUID groupId;
    private String content;
    private PostStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime publishedAt;
    private LocalDateTime scheduledTime;
    private UUID campaignId;
    private String campaignName;
    private UUID createdByUserId;
    private String createdByName;
    private PageInfo page;
    private List<MediaInfo> mediaFiles;
    private List<PublishResultResponse> publishResults;
    private List<PostApprovalResponse> approvals;  // Approval history

    @Data @Builder
    public static class PageInfo {
        private UUID id;
        private String pageName;
        private PlatformType platform;
        private String brandName;
        private UUID brandId;
    }

    @Data @Builder
    public static class PublishResultResponse {
        private UUID id;
        private String platformPostId;
        private String platformPostUrl;
        private Boolean success;
        private String errorMessage;
        private LocalDateTime createdAt;
    }

    @Data @Builder
    public static class MediaInfo {
        private UUID id;
        private String url;
        private String contentType;
        private String originalName;
    }
}

package com.socialflow.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrendingConfigResponse {
    private Long id;
    private UUID brandId;
    private String geo;
    private String source;
    private String categoryId;
    private String searchKeyword;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

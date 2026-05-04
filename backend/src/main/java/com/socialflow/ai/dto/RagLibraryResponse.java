package com.socialflow.ai.dto;

import lombok.*;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

/**
 * Response DTO for RAG library listing endpoint
 * Returns list of uploaded files for a brand
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RagLibraryResponse {
    
    private Boolean success;
    
    @JsonProperty("brand_id")
    private String brandId;
    
    private List<Map<String, Object>> files;
    
    @JsonProperty("total_files")
    private Integer totalFiles;
    
    private String error;
    
    /**
     * Helper method to check if response is successful
     */
    public boolean isSuccessful() {
        return success != null && success;
    }
    
    /**
     * Helper method to get error message
     */
    public String getErrorMessage() {
        return error != null ? error : "";
    }
    
    /**
     * Helper method to get file count
     */
    public Integer getFileCount() {
        return totalFiles != null ? totalFiles : 0;
    }
}

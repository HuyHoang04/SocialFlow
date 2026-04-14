package com.socialflow.ai.dto;

import lombok.*;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Response DTO for RAG upload endpoint
 * Returns details of uploaded file and generated embeddings
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RagUploadResponse {
    
    private Boolean success;
    
    @JsonProperty("library_id")
    private String libraryId;
    
    @JsonProperty("file_name")
    private String fileName;
    
    @JsonProperty("file_type")
    private String fileType;
    
    private String category;
    
    @JsonProperty("extracted_chars")
    private Integer extractedChars;
    
    @JsonProperty("text_preview")
    private String textPreview;
    
    @JsonProperty("total_chunks")
    private Integer totalChunks;
    
    @JsonProperty("embeddings_saved")
    private Integer embeddingsSaved;
    
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
}

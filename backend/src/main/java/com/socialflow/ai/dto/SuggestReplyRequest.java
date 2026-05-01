package com.socialflow.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonProperty;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SuggestReplyRequest {
    @JsonProperty("brand_id")
    private String brandId;
    
    @JsonProperty("message_content")
    private String messageContent;
    
    @JsonProperty("platform")
    @Builder.Default
    private String platform = "generic";
    
    @JsonProperty("message_type")
    @Builder.Default
    private String messageType = "message";
    
    @JsonProperty("customer_name")
    private String customerName;
    
    @JsonProperty("brand_name")
    private String brandName;
    
    @JsonProperty("brand_description")
    private String brandDescription;
    
    private String provider;
    private String model;
    
    @JsonProperty("max_words")
    @Builder.Default
    private int maxWords = 100;
}

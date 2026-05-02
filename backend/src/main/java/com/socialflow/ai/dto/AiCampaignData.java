package com.socialflow.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Represents AI-generated campaign metadata inside the suggested_entities payload.
 * Maps to the "campaign" key in the JSON block emitted by the LLM.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiCampaignData {

    /** Campaign name. A value of "string" (the LLM placeholder) is treated as absent. */
    private String name;

    private String description;

    /** ISO date string "YYYY-MM-DD". Null if no date was suggested. */
    private String startDate;

    /** ISO date string "YYYY-MM-DD". Null if no date was suggested. */
    private String endDate;
}

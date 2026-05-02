package com.socialflow.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

/**
 * Typed container for the "suggested_entities" field in the Python → Java callback payload.
 *
 * <p>Example JSON from Python:</p>
 * <pre>{@code
 * {
 *   "campaign": { "name": "Summer Sale", "startDate": "2025-06-01", "endDate": "2025-06-30" },
 *   "posts": [
 *     {
 *       "content": "Post body...",
 *       "mediaFilenames": ["abc.png"],
 *       "scheduledTime": "2025-06-01T09:00:00Z",
 *       "platform_suggestion": "Facebook",
 *       "image_prompt": "A summer beach scene..."
 *     }
 *   ]
 * }
 * }</pre>
 *
 * <p>Replaces the previous {@code Map<String, Object>} to enable Jackson schema validation
 * and eliminate unsafe manual casting throughout the service layer.</p>
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiSuggestedEntities {

    /**
     * Optional campaign wrapper. Null if the AI only generated standalone posts.
     * A campaign with name "string" (LLM placeholder) is treated as absent.
     */
    private AiCampaignData campaign;

    /** One or more AI-generated posts. Never null — may be empty. */
    private List<AiPostData> posts;
}

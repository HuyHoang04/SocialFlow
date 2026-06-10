package com.socialflow.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIPreferencesDTO {
    private String voiceGuidelines;
    private String contentGuardrails;
}

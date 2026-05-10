package com.socialflow.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RejectPostRequest {
    @NotBlank(message = "Rejection reason/comment is required")
    private String comment;
}

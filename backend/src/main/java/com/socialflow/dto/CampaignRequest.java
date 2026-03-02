package com.socialflow.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class CampaignRequest {
    private String name;
    private String description;
    private LocalDate startDate;
    private LocalDate endDate;
}

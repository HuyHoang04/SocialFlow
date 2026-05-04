package com.socialflow.ai.dto;

import lombok.*;
import java.time.LocalDateTime;

/**
 * Response DTO for health check endpoint
 * Returns service status and provider availability
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HealthResponse {
    
    private Boolean success;
    
    private String status;
    
    private String message;
    
    private Boolean pythonServiceHealthy;
    
    private Boolean groqHealthy;
    
    private Boolean openrouterHealthy;
    
    private Boolean pixazoHealthy;
    
    private LocalDateTime timestamp;
    
    private String error;
    
    /**
     * Helper method to check if all services are healthy
     */
    public boolean isAllHealthy() {
        return (pythonServiceHealthy != null && pythonServiceHealthy) &&
               (groqHealthy != null && groqHealthy) &&
               (openrouterHealthy != null && openrouterHealthy) &&
               (pixazoHealthy != null && pixazoHealthy);
    }
    
    /**
     * Helper method to get overall status message
     */
    public String getOverallStatus() {
        if (isAllHealthy()) {
            return "All services operational";
        }
        StringBuilder sb = new StringBuilder();
        if (pythonServiceHealthy == null || !pythonServiceHealthy) {
            sb.append("Python Service down, ");
        }
        if (groqHealthy == null || !groqHealthy) {
            sb.append("Groq down, ");
        }
        if (openrouterHealthy == null || !openrouterHealthy) {
            sb.append("OpenRouter down, ");
        }
        if (pixazoHealthy == null || !pixazoHealthy) {
            sb.append("Pixazo down, ");
        }
        String result = sb.toString();
        return result.endsWith(", ") ? result.substring(0, result.length() - 2) : result;
    }
}

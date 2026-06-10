package com.socialflow.config;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;
import java.time.Duration;

/**
 * Configuration for RestTemplate used by AI Service Client
 * Provides properly configured RestTemplate bean with:
 * - Connection timeout: 30 seconds
 * - Read timeout: 180 seconds
 * - Proper error handling
 */
@Configuration
public class RestTemplateConfig {
    
    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
            .setConnectTimeout(Duration.ofSeconds(30))
            .setReadTimeout(Duration.ofSeconds(180))
            .build();
    }
}

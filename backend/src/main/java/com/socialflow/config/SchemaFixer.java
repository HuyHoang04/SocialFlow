package com.socialflow.config;

import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;
import org.springframework.jdbc.core.JdbcTemplate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class SchemaFixer {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void fixSchema() {
        try {
            log.info("Attempting to drop outdated constraint on social_posts...");
            // Drop constraint to fix Hibernate ddl-auto=update bug when adding new enum values
            jdbcTemplate.execute("ALTER TABLE social_posts DROP CONSTRAINT IF EXISTS social_posts_status_check;");
            log.info("Successfully dropped social_posts_status_check constraint.");
        } catch (Exception e) {
            log.warn("Could not drop constraint (it might not exist or no permission): {}", e.getMessage());
        }
    }
}

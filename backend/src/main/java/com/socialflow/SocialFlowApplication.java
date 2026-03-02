package com.socialflow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SocialFlowApplication {
    public static void main(String[] args) {
        SpringApplication.run(SocialFlowApplication.class, args);
    }
}

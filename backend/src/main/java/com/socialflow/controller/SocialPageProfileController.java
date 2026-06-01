package com.socialflow.controller;

import com.socialflow.dto.ProfileUpdateRequest;
import com.socialflow.model.User;
import com.socialflow.service.SocialPageProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/social-pages")
@RequiredArgsConstructor
public class SocialPageProfileController {

    private final SocialPageProfileService profileService;

    @PutMapping("/{pageId}/profile")
    public ResponseEntity<Map<String, Object>> updateProfile(
            @PathVariable UUID pageId,
            @RequestBody ProfileUpdateRequest request,
            @AuthenticationPrincipal User user) {
        Map<String, Object> result = profileService.updateProfile(pageId, request);
        return ResponseEntity.ok(result);
    }
}

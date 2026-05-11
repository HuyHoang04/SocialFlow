package com.socialflow.controller;

import com.socialflow.model.User;
import com.socialflow.repository.UserRepository;
import com.socialflow.service.CloudinaryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserRepository userRepository;
    private final CloudinaryService cloudinaryService;

    /**
     * Get current user's profile.
     */
    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getProfile(@AuthenticationPrincipal User user) {
        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("id", user.getId().toString());
        profile.put("email", user.getEmail());
        profile.put("name", user.getName());
        profile.put("avatarUrl", user.getAvatarUrl());
        profile.put("createdAt", user.getCreatedAt().toString());
        return ResponseEntity.ok(profile);
    }

    /**
     * Update current user's name.
     */
    @PutMapping("/profile")
    public ResponseEntity<Map<String, Object>> updateProfile(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, String> body) {
        String name = body.get("name");
        if (name != null && !name.isBlank()) {
            user.setName(name.trim());
            userRepository.save(user);
        }
        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("id", user.getId().toString());
        profile.put("email", user.getEmail());
        profile.put("name", user.getName());
        profile.put("avatarUrl", user.getAvatarUrl());
        return ResponseEntity.ok(profile);
    }

    /**
     * Upload user avatar to Cloudinary.
     */
    @PostMapping("/avatar")
    public ResponseEntity<Map<String, Object>> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User user) throws IOException {
        if (file.isEmpty()) {
            throw new RuntimeException("File is empty");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new RuntimeException("Only image files are allowed");
        }

        // Upload to Cloudinary
        String avatarUrl = cloudinaryService.uploadAvatar(file, user.getId().toString());

        // Save URL to user
        user.setAvatarUrl(avatarUrl);
        userRepository.save(user);

        log.info("👤 Avatar uploaded for user {}: {}", user.getEmail(), avatarUrl);

        return ResponseEntity.ok(Map.of(
                "avatarUrl", avatarUrl,
                "message", "Avatar uploaded successfully"
        ));
    }

    /**
     * Delete user avatar.
     */
    @DeleteMapping("/avatar")
    public ResponseEntity<Map<String, String>> deleteAvatar(@AuthenticationPrincipal User user) {
        if (user.getAvatarUrl() != null) {
            cloudinaryService.deleteAvatar(user.getId().toString());
            user.setAvatarUrl(null);
            userRepository.save(user);
            log.info("👤 Avatar deleted for user {}", user.getEmail());
        }
        return ResponseEntity.ok(Map.of("message", "Avatar deleted"));
    }
}

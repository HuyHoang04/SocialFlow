package com.socialflow.controller;

import com.socialflow.dto.CreatePostRequest;
import com.socialflow.dto.PostResponse;
import com.socialflow.dto.SubmitForApprovalRequest;
import com.socialflow.model.User;
import com.socialflow.service.PostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;
    private final com.socialflow.service.bot.EngagementBotService engagementBotService;

    @GetMapping("/posts")
    public ResponseEntity<List<PostResponse>> getPosts(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) UUID brandId) {
        if (brandId != null) {
            return ResponseEntity.ok(postService.getPostsByBrand(brandId));
        }
        return ResponseEntity.ok(postService.getPostsByUser(user));
    }

    @GetMapping("/pages/{pageId}/posts")
    public ResponseEntity<List<PostResponse>> getPostsByPage(@PathVariable UUID pageId) {
        return ResponseEntity.ok(postService.getPostsByPage(pageId));
    }

    @GetMapping("/posts/{id}")
    public ResponseEntity<PostResponse> getPost(@PathVariable UUID id) {
        return ResponseEntity.ok(postService.getPostById(id));
    }

    @PostMapping("/posts")
    public ResponseEntity<List<PostResponse>> createPost(@Valid @RequestBody CreatePostRequest request, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(postService.createPost(request, user));
    }

    @PutMapping("/posts/{id}")
    public ResponseEntity<PostResponse> updatePost(@PathVariable UUID id, @Valid @RequestBody CreatePostRequest request, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(postService.updatePost(id, request, user));
    }

    @PostMapping("/posts/{id}/publish")
    public ResponseEntity<PostResponse> publishPost(@PathVariable UUID id, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(postService.publishPost(id, user));
    }

    @PostMapping("/posts/{id}/submit-approval")
    public ResponseEntity<Void> submitForApproval(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody SubmitForApprovalRequest request) {
        postService.submitForApproval(id, request.getAssignedToUserId(), user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/posts/{id}/engagement-bot")
    public ResponseEntity<java.util.Map<String, String>> runEngagementBot(
            @PathVariable String id,
            @RequestBody java.util.Map<String, String> request) {
        try {
            engagementBotService.runEngagementBot(id, request.get("brandId"));
            return ResponseEntity.ok(java.util.Map.of("status", "success", "message", "Bot engagement initiated successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("status", "error", "message", e.getMessage()));
        }
    }

    @DeleteMapping("/posts/{id}")
    public ResponseEntity<Void> deletePost(@PathVariable UUID id, @AuthenticationPrincipal User user) {
        postService.deletePost(id, user);
        return ResponseEntity.noContent().build();
    }
}

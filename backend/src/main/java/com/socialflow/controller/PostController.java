package com.socialflow.controller;

import com.socialflow.dto.CreatePostRequest;
import com.socialflow.dto.PostResponse;
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

    @GetMapping("/posts")
    public ResponseEntity<List<PostResponse>> getPosts(@AuthenticationPrincipal User user) {
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
    public ResponseEntity<List<PostResponse>> createPost(@Valid @RequestBody CreatePostRequest request) {
        return ResponseEntity.ok(postService.createPost(request));
    }

    @PostMapping("/posts/{id}/publish")
    public ResponseEntity<PostResponse> publishPost(@PathVariable UUID id) {
        return ResponseEntity.ok(postService.publishPost(id));
    }

    @DeleteMapping("/posts/{id}")
    public ResponseEntity<Void> deletePost(@PathVariable UUID id) {
        postService.deletePost(id);
        return ResponseEntity.noContent().build();
    }
}

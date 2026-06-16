package com.socialflow.controller;

import com.socialflow.dto.VideoProjectDTO;
import com.socialflow.service.VideoProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/brands/{brandId}/video-projects")
@RequiredArgsConstructor
public class VideoProjectController {

    private final VideoProjectService videoProjectService;

    @GetMapping
    public ResponseEntity<List<VideoProjectDTO>> getProjects(@PathVariable UUID brandId) {
        return ResponseEntity.ok(videoProjectService.getProjectsByBrand(brandId));
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<VideoProjectDTO> getProject(
            @PathVariable UUID brandId,
            @PathVariable UUID projectId) {
        return ResponseEntity.ok(videoProjectService.getProject(projectId));
    }

    @PostMapping
    public ResponseEntity<VideoProjectDTO> createProject(
            @PathVariable UUID brandId,
            @RequestBody VideoProjectDTO dto) {
        return ResponseEntity.ok(videoProjectService.createProject(brandId, dto));
    }

    @PutMapping("/{projectId}")
    public ResponseEntity<VideoProjectDTO> updateProject(
            @PathVariable UUID brandId,
            @PathVariable UUID projectId,
            @RequestBody VideoProjectDTO dto) {
        return ResponseEntity.ok(videoProjectService.updateProject(projectId, dto));
    }

    @DeleteMapping("/{projectId}")
    public ResponseEntity<Void> deleteProject(
            @PathVariable UUID brandId,
            @PathVariable UUID projectId) {
        videoProjectService.deleteProject(projectId);
        return ResponseEntity.noContent().build();
    }
}

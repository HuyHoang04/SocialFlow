package com.socialflow.controller;

import com.socialflow.constants.ErrorMessages;
import com.socialflow.model.PostMedia;
import com.socialflow.repository.PostMediaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.socialflow.model.User;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.*;
import java.util.*;

@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
@Slf4j
public class MediaController {

    private final PostMediaRepository mediaRepository;
    private final com.socialflow.service.CloudinaryService cloudinaryService;

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    private Path uploadPath;

    @PostConstruct
    public void init() {
        uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(uploadPath);
            log.info("Upload directory: {}", uploadPath);
        } catch (IOException e) {
            throw new RuntimeException(ErrorMessages.UPLOAD_DIR_CREATE_FAILED, e);
        }
    }

    /**
     * Upload a media file (image or video).
     * Returns the saved PostMedia metadata.
     * Media is saved locally but not persisted to database until linked to a post.
     */
    @PostMapping("/upload")
    public Map<String, Object> uploadFile(@RequestParam("file") MultipartFile file, @AuthenticationPrincipal User user) throws IOException {
        if (file.isEmpty()) {
            throw new RuntimeException(ErrorMessages.FILE_EMPTY);
        }

        String contentType = file.getContentType();
        log.info("Upload attempt - FileName: {}, ContentType: {}, Size: {}", file.getOriginalFilename(), contentType, file.getSize());
        
        // If content-type is missing, try to infer from filename
        if (contentType == null || contentType.isEmpty()) {
            String originalName = file.getOriginalFilename();
            if (originalName != null && (originalName.endsWith(".jpg") || originalName.endsWith(".jpeg"))) {
                contentType = "image/jpeg";
            } else if (originalName != null && originalName.endsWith(".png")) {
                contentType = "image/png";
            } else if (originalName != null && originalName.endsWith(".gif")) {
                contentType = "image/gif";
            } else if (originalName != null && originalName.endsWith(".webp")) {
                contentType = "image/webp";
            } else if (originalName != null && originalName.endsWith(".mp4")) {
                contentType = "video/mp4";
            } else if (originalName != null && originalName.endsWith(".mov")) {
                contentType = "video/quicktime";
            } else {
                contentType = "image/jpeg"; // Default to JPEG for AI-generated images
            }
            log.info("Content-type inferred from filename: {}", contentType);
        }
        
        if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) {
            log.error("Invalid file type: {}", contentType);
            throw new RuntimeException(ErrorMessages.INVALID_FILE_TYPE);
        }

        // Upload to Cloudinary
        try {
            String secureUrl = cloudinaryService.uploadMedia(file, "socialflow/posts");
            log.info("✓ Uploaded file to Cloudinary: {}", secureUrl);

            PostMedia postMedia = new PostMedia();
            postMedia.setFilename(file.getOriginalFilename());
            postMedia.setOriginalName(file.getOriginalFilename());
            postMedia.setContentType(contentType);
            postMedia.setFileSize(file.getSize());
            postMedia.setUrl(secureUrl);
            postMedia.setUploader(user);
            
            PostMedia savedMedia = mediaRepository.save(postMedia);
            log.info("Saved media metadata to database: id={}", savedMedia.getId());

            return Map.of(
                    "id", savedMedia.getId().toString(),
                    "filename", file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown",
                    "url", secureUrl,
                    "contentType", contentType,
                    "originalName", file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown",
                    "fileSize", file.getSize()
            );
        } catch (Exception e) {
            log.error("✗ Failed to upload to Cloudinary: {}", e.getMessage());
            throw new RuntimeException("Upload to Cloudinary failed: " + e.getMessage());
        }
    }

    /**
     * Serve uploaded media files.
     */
    @GetMapping("/{filename}")
    public ResponseEntity<Resource> serveFile(@PathVariable String filename) throws IOException {
        Path filePath = uploadPath.resolve(filename).normalize();

        if (!filePath.startsWith(uploadPath)) {
            return ResponseEntity.badRequest().build();
        }

        Resource resource = new UrlResource(filePath.toUri());
        if (!resource.exists()) {
            return ResponseEntity.notFound().build();
        }

        String contentType = Files.probeContentType(filePath);
        if (contentType == null) contentType = "application/octet-stream";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .body(resource);
    }

    /**
     * Get all media for the current user
     */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getUserMedia(@AuthenticationPrincipal User user) {
        List<PostMedia> mediaList = mediaRepository.findByUploaderIdOrderByCreatedAtDesc(user.getId());
        
        List<Map<String, Object>> response = mediaList.stream().map(m -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", m.getId().toString());
            map.put("url", m.getUrl());
            map.put("filename", m.getFilename());
            map.put("originalName", m.getOriginalName());
            map.put("contentType", m.getContentType());
            map.put("fileSize", m.getFileSize());
            map.put("createdAt", m.getCreatedAt().toString());
            if (m.getPost() != null) {
                map.put("postId", m.getPost().getId().toString());
            }
            return map;
        }).toList();

        return ResponseEntity.ok(response);
    }

    /**
     * Delete a media file
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMedia(@PathVariable UUID id, @AuthenticationPrincipal User user) {
        PostMedia media = mediaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(ErrorMessages.MEDIA_NOT_FOUND + id));

        if (!media.getUploader().getId().equals(user.getId())) {
            throw new RuntimeException(ErrorMessages.MEDIA_UNAUTHORIZED);
        }

        if (media.getPost() != null) {
            throw new RuntimeException(ErrorMessages.MEDIA_ATTACHED_TO_POST);
        }

        // Delete from filesystem
        try {
            Path filePath = uploadPath.resolve(media.getFilename()).normalize();
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            log.error("Failed to delete file from filesystem: {}", media.getFilename(), e);
        }

        // Delete from database
        mediaRepository.delete(media);
        log.info("Deleted media {} by user {}", id, user.getEmail());

        return ResponseEntity.noContent().build();
    }
}

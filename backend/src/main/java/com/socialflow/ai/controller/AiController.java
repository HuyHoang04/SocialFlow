package com.socialflow.ai.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.stream.Collectors;
import java.io.IOException;

import com.socialflow.ai.dto.*;
import com.socialflow.ai.service.AiServiceClient;

/**
 * REST Controller for AI Service Integration
 * Exposes all 14 AI endpoints through Java backend
 * 
 * Base path: /api/ai
 * 
 * Endpoints:
 * - POST /generate-content - Text generation
 * - POST /rewrite - Content rewrite
 * - POST /keyword-optimize - Keyword optimization
 * - POST /generate-image - Image generation
 * - POST /embeddings - Embedding generation
 * - GET /health - Service health check
 * - GET /models - List available models
 * - POST /rag/upload - Upload file to content library
 * - POST /rag/search - RAG search
 * - DELETE /rag/delete/{itemId} - Delete from RAG
 * - GET /rag/status - Get RAG status
 * - GET /rag/library - List RAG library
 * - POST /rag/generate-content - RAG content generation
 * - POST /rag/generate-with-images - RAG with images
 */
@Slf4j
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {
    
    private final AiServiceClient aiServiceClient;
    
    // ==================== TEXT GENERATION ====================
    
    /**
     * Generate content using AI model
     * POST /api/ai/generate-content
     */
    @PostMapping("/generate-content")
    public ResponseEntity<?> generateContent(
            @Valid @RequestBody ContentRequest request,
            BindingResult bindingResult) {
        try {
            // Validate request
            if (bindingResult.hasErrors()) {
                return handleValidationErrors(bindingResult);
            }
            
            // Validate provider and model
            if (!request.isValidProvider()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Invalid provider: " + request.getProvider() + ". Must be 'groq' or 'openrouter'"
                ));
            }
            
            if (!request.isValidModel()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Model is required and cannot be empty"
                ));
            }
            
            log.info("→ Generate content | Provider: {} | Model: {} | Tone: {}", 
                     request.getProvider(), request.getModel(), request.getTone());
            
            ContentResponse response = aiServiceClient.generateContent(request);
            
            if (!response.isSuccessful()) {
                log.warn("✗ Generate content failed: {}", response.getErrorMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }
            
            log.info("✓ Generate content successful | Cost: ${}", response.getCost());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("✗ Generate content error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", "Internal server error: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Rewrite content using AI model
     * POST /api/ai/rewrite
     */
    @PostMapping("/rewrite")
    public ResponseEntity<?> rewriteContent(
            @Valid @RequestBody RewriteRequest request,
            BindingResult bindingResult) {
        try {
            if (bindingResult.hasErrors()) {
                return handleValidationErrors(bindingResult);
            }
            
            if (!request.isValidProvider()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Invalid provider. Must be 'groq' or 'openrouter'"
                ));
            }
            
            if (!request.isValidModel()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Model is required"
                ));
            }
            
            log.info("→ Rewrite content | Provider: {} | Model: {} | Tone: {}", 
                     request.getProvider(), request.getModel(), request.getTone());
            
            RewriteResponse response = aiServiceClient.rewriteContent(request);
            
            if (!response.isSuccessful()) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }
            
            log.info("✓ Rewrite content successful | Cost: ${}", response.getCost());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("✗ Rewrite content error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", "Internal server error: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Optimize keywords in content
     * POST /api/ai/keyword-optimize
     */
    @PostMapping("/keyword-optimize")
    public ResponseEntity<?> optimizeKeywords(
            @Valid @RequestBody KeywordOptimizationRequest request,
            BindingResult bindingResult) {
        try {
            if (bindingResult.hasErrors()) {
                return handleValidationErrors(bindingResult);
            }
            
            if (!request.isValidProvider()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Invalid provider. Must be 'groq' or 'openrouter'"
                ));
            }
            
            if (!request.isValidModel()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Model is required"
                ));
            }
            
            log.info("→ Keyword optimize | Provider: {} | Model: {} | Platform: {}", 
                     request.getProvider(), request.getModel(), request.getPlatform());
            
            KeywordOptimizationResponse response = aiServiceClient.optimizeKeywords(request);
            
            if (!response.isSuccessful()) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }
            
            log.info("✓ Keyword optimization successful | Keywords: {} | Hashtags: {} | Cost: ${}", 
                     response.getKeywords().size(), response.getHashtags().size(), response.getCost());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("✗ Keyword optimization error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", "Internal server error: " + e.getMessage()
            ));
        }
    }
    
    // ==================== IMAGE GENERATION ====================
    
    /**
     * Generate image using AI model
     * POST /api/ai/generate-image
     */
    @PostMapping("/generate-image")
    public ResponseEntity<?> generateImage(
            @Valid @RequestBody ImageGenerationRequest request,
            BindingResult bindingResult) {
        try {
            if (bindingResult.hasErrors()) {
                return handleValidationErrors(bindingResult);
            }
            
            if (!request.isValidProvider()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Invalid provider. Must be 'pixazo' or 'openrouter'"
                ));
            }
            
            if (!request.isValidModel()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Model is required"
                ));
            }
            
            log.info("→ Generate image | Provider: {} | Model: {} | Count: {} | Size: {}x{}", 
                     request.getProvider(), request.getModel(), request.getCount(),
                     request.getWidth(), request.getHeight());
            
            ImageGenerationResponse response = aiServiceClient.generateImage(request);
            
            if (!response.isSuccessful()) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }
            
            log.info("✓ Image generation successful | Count: {} | Cost: ${}", 
                     response.getImageCount(), response.getCost());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("✗ Image generation error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", "Internal server error: " + e.getMessage()
            ));
        }
    }
    
    // ==================== EMBEDDINGS ====================
    
    /**
     * Generate embeddings for texts/images
     * POST /api/ai/embeddings
     */
    @PostMapping("/embeddings")
    public ResponseEntity<?> generateEmbeddings(
            @Valid @RequestBody EmbeddingRequest request,
            BindingResult bindingResult) {
        try {
            if (bindingResult.hasErrors()) {
                return handleValidationErrors(bindingResult);
            }
            
            if (!request.isValidModel()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Model is invalid"
                ));
            }
            
            log.info("→ Generate embeddings | Brand: {} | Texts: {} | Model: {}", 
                     request.getBrandId(), request.getTexts().size(), request.getModel());
            
            EmbeddingResponse response = aiServiceClient.generateEmbeddings(request);
            
            if (!response.isSuccessful()) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }
            
            log.info("✓ Embedding generation successful | Count: {} | Dimensions: {} | Cost: ${}", 
                     response.getEmbeddingCount(), response.getDimensions(), response.getCost());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("✗ Embedding generation error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", "Internal server error: " + e.getMessage()
            ));
        }
    }
    
    // ==================== HEALTH CHECK ====================
    
    /**
     * Check AI service health status
     * GET /api/ai/health
     */
    @GetMapping("/health")
    public ResponseEntity<?> checkHealth() {
        try {
            log.info("→ Health check");
            
            HealthResponse response = aiServiceClient.checkHealth();
            
            log.info("✓ Health check completed | Status: {}", response.getStatus());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("✗ Health check error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "status", "unhealthy",
                "error", "Internal server error: " + e.getMessage()
            ));
        }
    }
    
    // ==================== MODEL LISTING ====================
    
    /**
     * List all available models
     * GET /api/ai/models
     */
    @GetMapping("/models")
    public ResponseEntity<?> listModels() {
        try {
            log.info("→ List all models");
            
            ProviderModelsResponse response = aiServiceClient.listAllModels();
            
            log.info("✓ List models successful | Total: {} | Free: {}", 
                     response.getModelCount(), response.getFreeTierCount());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("✗ List models error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", "Failed to list models: " + e.getMessage()
            ));
        }
    }
    
    // ==================== RAG ENDPOINTS ====================
    
    /**
     * Search RAG content library
     * POST /api/ai/rag/search
     */
    @PostMapping("/rag/search")
    public ResponseEntity<?> searchRag(
            @Valid @RequestBody RagSearchRequest request,
            BindingResult bindingResult) {
        try {
            // Validate request
            if (bindingResult.hasErrors()) {
                return handleValidationErrors(bindingResult);
            }
            
            if (!request.isValidQuery()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Query is required and cannot be empty"
                ));
            }
            
            log.info("→ RAG search | Brand: {} | Query: {} | Limit: {} | Threshold: {}", 
                     request.getBrandId(), request.getQuery(), request.getLimit(), request.getThreshold());
            
            RagSearchResponse response = aiServiceClient.searchRag(request);
            
            if (!response.isSuccessful()) {
                log.warn("✗ RAG search failed: {}", response.getErrorMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }
            
            log.info("✓ RAG search successful | Results: {}", response.getTotalResults());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("✗ RAG search error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", "RAG search failed: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Delete item from RAG library
     * DELETE /api/ai/rag/delete/{itemId}
     */
    @DeleteMapping("/rag/delete/{itemId}")
    public ResponseEntity<RagDeleteResponse> deleteFromRag(
            @PathVariable String itemId,
            @RequestParam String brandId) {
        try {
            if (brandId == null || brandId.isEmpty()) {
                return ResponseEntity.badRequest().body(RagDeleteResponse.builder()
                    .success(false)
                    .error("brand_id is required")
                    .build());
            }
            
            log.info("→ Delete from RAG | Brand: {} | Item: {}", brandId, itemId);
            
            RagDeleteResponse response = aiServiceClient.deleteFromRag(brandId, itemId);
            
            if (response.isSuccessful()) {
                log.info("✓ Delete from RAG successful");
                return ResponseEntity.ok(response);
            } else {
                log.warn("✗ Delete from RAG failed: {}", response.getErrorMessage());
                return ResponseEntity.badRequest().body(response);
            }
            
        } catch (Exception e) {
            log.error("✗ Delete from RAG error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                RagDeleteResponse.builder()
                    .success(false)
                    .error("Delete failed: " + e.getMessage())
                    .build());
        }
    }
    
    /**
     * Get RAG index status for brand
     * GET /api/ai/rag/status
     */
    @GetMapping("/rag/status")
    public ResponseEntity<RagStatusResponse> getRagStatus(@RequestParam String brandId) {
        try {
            if (brandId == null || brandId.isEmpty()) {
                return ResponseEntity.badRequest().body(RagStatusResponse.builder()
                    .success(false)
                    .error("brand_id is required")
                    .build());
            }
            
            log.info("→ Get RAG status | Brand: {}", brandId);
            
            RagStatusResponse response = aiServiceClient.getRagStatus(brandId);
            
            if (response != null && response.isSuccessful()) {
                log.info("✓ Get RAG status successful");
                return ResponseEntity.ok(response);
            } else {
                log.warn("✗ Get RAG status failed: {}", response != null ? response.getErrorMessage() : "Unknown error");
                return ResponseEntity.badRequest().body(response != null ? response : 
                    RagStatusResponse.builder().success(false).error("Unknown error").build());
            }
            
        } catch (Exception e) {
            log.error("✗ Get RAG status error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                RagStatusResponse.builder()
                    .success(false)
                    .error("Get status failed: " + e.getMessage())
                    .build());
        }
    }
    
    /**
     * List RAG content library for brand
     * GET /api/ai/rag/library
     */
    @GetMapping("/rag/library")
    public ResponseEntity<RagLibraryResponse> listRagLibrary(
            @RequestParam String brandId,
            @RequestParam(defaultValue = "10") Integer limit,
            @RequestParam(defaultValue = "0") Integer offset) {
        try {
            if (brandId == null || brandId.isEmpty()) {
                return ResponseEntity.badRequest().body(RagLibraryResponse.builder()
                    .success(false)
                    .error("brand_id is required")
                    .build());
            }
            
            log.info("→ List RAG library | Brand: {} | Limit: {} | Offset: {}", 
                     brandId, limit, offset);
            
            RagLibraryResponse response = aiServiceClient.listRagLibrary(brandId, limit, offset);
            
            if (response != null && response.isSuccessful()) {
                log.info("✓ List RAG library successful | Total files: {}", response.getTotalFiles());
                return ResponseEntity.ok(response);
            } else {
                log.warn("✗ List RAG library failed: {}", response != null ? response.getErrorMessage() : "Unknown error");
                return ResponseEntity.badRequest().body(response != null ? response : 
                    RagLibraryResponse.builder().success(false).error("Unknown error").build());
            }
            
        } catch (Exception e) {
            log.error("✗ List RAG library error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                RagLibraryResponse.builder()
                    .success(false)
                    .error("List library failed: " + e.getMessage())
                    .build());
        }
    }
    
    /**
     * Generate content using RAG
     * POST /api/ai/rag/generate-content
     */
    @PostMapping("/rag/generate-content")
    public ResponseEntity<?> generateContentWithRag(
            @Valid @RequestBody RagGenerateContentRequest request,
            BindingResult bindingResult) {
        try {
            if (bindingResult.hasErrors()) {
                return handleValidationErrors(bindingResult);
            }
            
            if (!request.isValidProvider()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Invalid provider. Must be 'groq' or 'openrouter'"
                ));
            }
            
            if (!request.isValidModel()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Model is required"
                ));
            }
            
            log.info("→ RAG generate content | Brand: {} | Provider: {} | Model: {} | RAG Limit: {}", 
                     request.getBrandId(), request.getProvider(), request.getModel(), request.getRagLimit());
            
            RagGenerateContentResponse response = aiServiceClient.generateContentWithRag(request);
            
            if (!response.isSuccessful()) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }
            
            int contentLength = (response.getContent() != null) ? response.getContent().length() : 0;
            log.info("✓ RAG generate content successful | Content length: {} | RAG results: {}", 
                     contentLength, response.getRagResultsCount());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("✗ RAG generate content error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", "RAG generation failed: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Generate content using RAG with images
     * POST /api/ai/rag/generate-with-images
     */
    @PostMapping("/rag/generate-with-images")
    public ResponseEntity<?> generateContentWithRagAndImages(
            @Valid @RequestBody RagGenerateContentRequest request,
            BindingResult bindingResult) {
        try {
            if (bindingResult.hasErrors()) {
                return handleValidationErrors(bindingResult);
            }
            
            if (!request.isValidProvider()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Invalid provider. Must be 'groq' or 'openrouter'"
                ));
            }
            
            if (!request.isValidModel()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Model is required"
                ));
            }
            
            log.info("→ RAG generate content with images | Brand: {} | Provider: {} | Model: {}", 
                     request.getBrandId(), request.getProvider(), request.getModel());
            
            RagGenerateContentResponse response = aiServiceClient.generateContentWithRagAndImages(request);
            
            if (!response.isSuccessful()) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }
            
            log.info("✓ RAG generate content with images successful");
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("✗ RAG generate content with images error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", "RAG generation with images failed: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Upload file to RAG content library
     * POST /api/ai/rag/upload
     */
    @PostMapping("/rag/upload")
    public ResponseEntity<RagUploadResponse> uploadToRag(
            @RequestParam String brandId,
            @RequestParam(required = false) String category,
            @RequestParam MultipartFile file) {
        try {
            if (brandId == null || brandId.isEmpty()) {
                return ResponseEntity.badRequest().body(RagUploadResponse.builder()
                    .success(false)
                    .error("brand_id is required")
                    .build());
            }
            
            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest().body(RagUploadResponse.builder()
                    .success(false)
                    .error("File is required")
                    .build());
            }
            
            String fileName = file.getOriginalFilename();
            byte[] fileContent = file.getBytes();
            
            log.info("→ Upload to RAG | Brand: {} | File: {} | Size: {} bytes | Category: {}", 
                     brandId, fileName, fileContent.length, category);
            
            RagUploadResponse response = aiServiceClient.uploadToRag(brandId, category, fileContent, fileName);
            
            if (response != null && response.isSuccessful()) {
                log.info("✓ Upload to RAG successful | Library ID: {} | Chunks: {}", 
                         response.getLibraryId(), response.getTotalChunks());
                return ResponseEntity.status(HttpStatus.CREATED).body(response);
            } else {
                log.warn("✗ Upload to RAG failed: {}", response != null ? response.getErrorMessage() : "Unknown error");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response != null ? response : 
                    RagUploadResponse.builder().success(false).error("Unknown error").build());
            }
            
        } catch (IOException e) {
            log.error("✗ Upload to RAG file read error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                RagUploadResponse.builder()
                    .success(false)
                    .error("Failed to read file: " + e.getMessage())
                    .build());
        } catch (Exception e) {
            log.error("✗ Upload to RAG error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                RagUploadResponse.builder()
                    .success(false)
                    .error("Upload failed: " + e.getMessage())
                    .build());
        }
    }
    
    // ==================== HELPER METHODS ====================
    
    /**
     * Handle validation errors from @Valid
     */
    private ResponseEntity<?> handleValidationErrors(BindingResult result) {
        String errorMessage = result.getAllErrors().stream()
            .map(error -> error.getDefaultMessage())
            .collect(Collectors.joining(", "));
        
        log.warn("Validation error: {}", errorMessage);
        return ResponseEntity.badRequest().body(Map.of(
            "success", false,
            "error", "Validation failed: " + errorMessage
        ));
    }
}

package com.socialflow.ai.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import com.socialflow.ai.dto.*;

import java.util.Map;

/**
 * REST Client for Python AI Service
 * Provides methods to call all 14 AI endpoints from the Python microservice
 * 
 * Endpoints:
 * - POST /generate-content - Text generation
 * - POST /rewrite-content - Content rewrite
 * - POST /optimize-keywords - Keyword optimization
 * - POST /generate-image - Image generation
 * - POST /embed - Embedding generation
 * - GET /health - Health check
 * - GET /models - List available models
 * - POST /rag/upload - Upload content to RAG library
 * - POST /rag/search - Search RAG library
 * - DELETE /rag/library/{brand_id}/{library_id} - Delete from RAG library
 * - GET /rag/status/{brand_id} - Get RAG status
 * - GET /rag/library/{brand_id} - List RAG library
 * - POST /rag/generate-content - RAG-augmented generation
 * - POST /embedding-models - Get embedding models (placeholder endpoint)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiServiceClient {
    
    private final RestTemplate restTemplate;
    
    @Value("${ai.service.url:http://localhost:5000}")
    private String pythonServiceUrl;
    
    // ==================== TEXT GENERATION ENDPOINTS ====================
    
    /**
     * Generate content using AI model
     * POST /generate-content
     */
    public ContentResponse generateContent(ContentRequest request) {
        try {
            log.info("Calling Python AI Service: POST /generate-content | Provider: {} | Model: {} | Max Words: {}", 
                     request.getProvider(), request.getModel(), request.getMaxWords());
            
            String url = pythonServiceUrl + "/generate-content";
            HttpEntity<ContentRequest> entity = new HttpEntity<>(request, getHeaders());
            
            ResponseEntity<ContentResponse> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                ContentResponse.class
            );
            
            ContentResponse body = response.getBody();
            int contentLength = (body != null && body.getContent() != null) ? body.getContent().length() : 0;
            log.info("✓ Generate content successful | Content length: {}", contentLength);
            return body;
            
        } catch (RestClientException e) {
            log.error("✗ Generate content failed: {}", e.getMessage());
            return ContentResponse.builder()
                .success(false)
                .error("Failed to call Python service: " + e.getMessage())
                .build();
        }
    }
    
    /**
     * Rewrite content using AI model
     * POST /rewrite
     */
    public RewriteResponse rewriteContent(RewriteRequest request) {
        try {
            log.info("Calling Python AI Service: POST /rewrite-content | Provider: {} | Model: {} | Max Words: {}", 
                     request.getProvider(), request.getModel(), request.getMaxWords());
            
            String url = pythonServiceUrl + "/rewrite-content";
            HttpEntity<RewriteRequest> entity = new HttpEntity<>(request, getHeaders());
            
            ResponseEntity<RewriteResponse> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                RewriteResponse.class
            );
            
            RewriteResponse body = response.getBody();
            int rewrittenLength = (body != null && body.getRewritten() != null) ? body.getRewritten().length() : 0;
            log.info("✓ Rewrite content successful | Rewritten length: {}", rewrittenLength);
            return body;
            
        } catch (RestClientException e) {
            log.error("✗ Rewrite content failed: {}", e.getMessage());
            return RewriteResponse.builder()
                .success(false)
                .error("Failed to call Python service: " + e.getMessage())
                .build();
        }
    }
    
    /**
     * Optimize keywords in content
     * POST /keyword-optimize
     */
    public KeywordOptimizationResponse optimizeKeywords(KeywordOptimizationRequest request) {
        try {
            log.info("Calling Python AI Service: POST /optimize-keywords | Provider: {} | Model: {} | Max Words: {}", 
                     request.getProvider(), request.getModel(), request.getMaxWords());
            
            String url = pythonServiceUrl + "/optimize-keywords";
            HttpEntity<KeywordOptimizationRequest> entity = new HttpEntity<>(request, getHeaders());
            
            ResponseEntity<KeywordOptimizationResponse> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                KeywordOptimizationResponse.class
            );
            
            KeywordOptimizationResponse body = response.getBody();
            int keywordsSize = (body != null && body.getKeywords() != null) ? body.getKeywords().size() : 0;
            int hashtagsSize = (body != null && body.getHashtags() != null) ? body.getHashtags().size() : 0;
            log.info("✓ Keyword optimization successful | Keywords: {} | Hashtags: {}", keywordsSize, hashtagsSize);
            return body;
            
        } catch (RestClientException e) {
            log.error("✗ Keyword optimization failed: {}", e.getMessage());
            return KeywordOptimizationResponse.builder()
                .success(false)
                .error("Failed to call Python service: " + e.getMessage())
                .build();
        }
    }
    
    // ==================== IMAGE GENERATION ENDPOINTS ====================
    
    /**
     * Generate image using AI model
     * POST /generate-image
     */
    public ImageGenerationResponse generateImage(ImageGenerationRequest request) {
        try {
            log.info("Calling Python AI Service: POST /generate-image | Provider: {} | Model: {}", 
                     request.getProvider(), request.getModel());
            
            String url = pythonServiceUrl + "/generate-image";
            HttpEntity<ImageGenerationRequest> entity = new HttpEntity<>(request, getHeaders());
            
            ResponseEntity<ImageGenerationResponse> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                ImageGenerationResponse.class
            );
            
            log.info("✓ Image generation successful | Count: {}", 
                     response.getBody() != null ? response.getBody().getImageCount() : 0);
            return response.getBody();
            
        } catch (RestClientException e) {
            log.error("✗ Image generation failed: {}", e.getMessage());
            return ImageGenerationResponse.builder()
                .success(false)
                .error("Failed to call Python service: " + e.getMessage())
                .build();
        }
    }
    
    // ==================== EMBEDDING ENDPOINTS ====================
    
    /**
     * Generate embeddings for texts/images
     * POST /embed
     */
    public EmbeddingResponse generateEmbeddings(EmbeddingRequest request) {
        try {
            log.info("Calling Python AI Service: POST /embed | Texts: {} | Model: {}", 
                     request.getTexts().size(), request.getModel());
            
            String url = pythonServiceUrl + "/embed";
            HttpEntity<EmbeddingRequest> entity = new HttpEntity<>(request, getHeaders());
            
            ResponseEntity<EmbeddingResponse> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                EmbeddingResponse.class
            );
            
            log.info("✓ Embedding generation successful | Count: {} | Dimensions: {}", 
                     response.getBody() != null ? response.getBody().getEmbeddingCount() : 0,
                     response.getBody() != null ? response.getBody().getDimensions() : 0);
            return response.getBody();
            
        } catch (RestClientException e) {
            log.error("✗ Embedding generation failed: {}", e.getMessage());
            return EmbeddingResponse.builder()
                .success(false)
                .error("Failed to call Python service: " + e.getMessage())
                .build();
        }
    }
    
    // ==================== HEALTH CHECK ENDPOINTS ====================
    
    /**
     * Check service health status
     * GET /health
     */
    public HealthResponse checkHealth() {
        try {
            log.info("Calling Python AI Service: GET /health");
            
            String url = pythonServiceUrl + "/health";
            
            ResponseEntity<HealthResponse> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                new HttpEntity<>(getHeaders()),
                HealthResponse.class
            );
            
            log.info("✓ Health check successful | Status: {}", 
                     response.getBody() != null ? response.getBody().getStatus() : "unknown");
            return response.getBody();
            
        } catch (RestClientException e) {
            log.error("✗ Health check failed: {}", e.getMessage());
            return HealthResponse.builder()
                .success(false)
                .status("unhealthy")
                .error("Failed to connect to Python service: " + e.getMessage())
                .build();
        }
    }
    
    // ==================== MODEL LISTING ENDPOINTS ====================
    
    /**
     * List available models for all providers
     * GET /models
     */
    public ProviderModelsResponse listAllModels() {
        try {
            log.info("Calling Python AI Service: GET /models");
            
            String url = pythonServiceUrl + "/models";
            
            ResponseEntity<ProviderModelsResponse> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                new HttpEntity<>(getHeaders()),
                ProviderModelsResponse.class
            );
            
            log.info("✓ List models successful | Total: {}", 
                     response.getBody() != null ? response.getBody().getModelCount() : 0);
            return response.getBody();
            
        } catch (RestClientException e) {
            log.error("✗ List models failed: {}", e.getMessage());
            return ProviderModelsResponse.builder()
                .success(false)
                .error("Failed to call Python service: " + e.getMessage())
                .build();
        }
    }
    
    // ==================== RAG ENDPOINTS ====================
    
    /**
     * Upload file to RAG content library
     * POST /rag/upload
     * Multipart form data: brand_id, category (optional), file
     */
    public Map<String, Object> uploadToRag(String brandId, String category, byte[] fileContent, String fileName) {
        try {
            log.info("Calling Python AI Service: POST /rag/upload | Brand: {} | File: {} | Size: {} bytes", 
                     brandId, fileName, fileContent.length);
            
            String url = pythonServiceUrl + "/rag/upload";
            
            // Build multipart form data
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("brand_id", brandId);
            
            if (category != null && !category.isEmpty()) {
                body.add("category", category);
            }
            
            // Add file with ByteArrayResource
            body.add("file", new ByteArrayResource(fileContent) {
                @Override
                public String getFilename() {
                    return fileName;
                }
            });
            
            // Set headers for multipart request
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            
            HttpEntity<MultiValueMap<String, Object>> entity = new HttpEntity<>(body, headers);
            
            ResponseEntity<Object> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                Object.class
            );
            
            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) response.getBody();
            
            // Extract library_id from response
            if (result != null && (boolean) result.getOrDefault("success", false)) {
                log.info("✓ RAG upload successful | Library ID: {} | Chunks: {}", 
                         result.get("library_id"), result.get("total_chunks"));
            } else {
                log.warn("✗ RAG upload failed: {}", result != null ? result.get("error") : "Unknown error");
            }
            
            return result;
            
        } catch (Exception e) {
            log.error("✗ RAG upload failed: {}", e.getMessage());
            return Map.of(
                "success", false,
                "error", "Failed to upload file: " + e.getMessage()
            );
        }
    }
    
    /**
     * Search RAG content library
     * POST /rag/search
     */
    public RagSearchResponse searchRag(String brandId, String query, Integer limit, Float threshold) {
        try {
            log.info("Calling Python AI Service: POST /rag/search | Brand: {} | Query: {} | Limit: {}", 
                     brandId, query, limit);
            
            String url = pythonServiceUrl + "/rag/search";
            
            RagSearchRequest request = RagSearchRequest.builder()
                .brandId(brandId)
                .query(query)
                .limit(limit != null ? limit : 5)
                .threshold(threshold != null ? threshold : 0.3f)
                .build();
            
            HttpEntity<RagSearchRequest> entity = new HttpEntity<>(request, getHeaders());
            
            ResponseEntity<RagSearchResponse> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                RagSearchResponse.class
            );
            
            log.info("✓ RAG search successful | Results: {}", 
                     response.getBody() != null ? response.getBody().getTotalResults() : 0);
            return response.getBody();
            
        } catch (RestClientException e) {
            log.error("✗ RAG search failed: {}", e.getMessage());
            return RagSearchResponse.builder()
                .success(false)
                .error("Failed to call Python service: " + e.getMessage())
                .build();
        }
    }
    
    /**
     * Delete item from RAG library
     * DELETE /rag/library/{brand_id}/{library_id}
     */
    public Map<String, Object> deleteFromRag(String brandId, String itemId) {
        try {
            log.info("Calling Python AI Service: DELETE /rag/library/{}/{} | Brand: {} | Item: {}", 
                     brandId, itemId, brandId, itemId);
            
            String url = UriComponentsBuilder.fromHttpUrl(pythonServiceUrl)
                .path("/rag/library/{brand_id}/{library_id}")
                .buildAndExpand(brandId, itemId)
                .toUriString();
            
            ResponseEntity<Object> response = restTemplate.exchange(
                url,
                HttpMethod.DELETE,
                new HttpEntity<>(getHeaders()),
                Object.class
            );
            
            @SuppressWarnings("unchecked")
            Map<String, Object> body = (Map<String, Object>) response.getBody();
            log.info("✓ RAG delete successful");
            return body;
            
        } catch (RestClientException e) {
            log.error("✗ RAG delete failed: {}", e.getMessage());
            return Map.of(
                "success", false,
                "error", "Failed to call Python service: " + e.getMessage()
            );
        }
    }
    
    /**
     * Get RAG index status
     * GET /rag/status/{brand_id}
     */
    public Map<String, Object> getRagStatus(String brandId) {
        try {
            log.info("Calling Python AI Service: GET /rag/status/{} | Brand: {}", brandId, brandId);
            
            String url = UriComponentsBuilder.fromHttpUrl(pythonServiceUrl)
                .path("/rag/status/{brand_id}")
                .buildAndExpand(brandId)
                .toUriString();
            
            ResponseEntity<Object> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                new HttpEntity<>(getHeaders()),
                Object.class
            );
            
            @SuppressWarnings("unchecked")
            Map<String, Object> body = (Map<String, Object>) response.getBody();
            log.info("✓ Get RAG status successful");
            return body;
            
        } catch (RestClientException e) {
            log.error("✗ Get RAG status failed: {}", e.getMessage());
            return Map.of(
                "success", false,
                "error", "Failed to call Python service: " + e.getMessage()
            );
        }
    }
    
    /**
     * List RAG content library
     * GET /rag/library/{brand_id}
     */
    public Map<String, Object> listRagLibrary(String brandId, Integer limit, Integer offset) {
        try {
            log.info("Calling Python AI Service: GET /rag/library/{} | Brand: {} | Limit: {} | Offset: {}", 
                     brandId, brandId, limit, offset);
            
            String url = UriComponentsBuilder.fromHttpUrl(pythonServiceUrl)
                .path("/rag/library/{brand_id}")
                .buildAndExpand(brandId)
                .toUriString();
            
            ResponseEntity<Object> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                new HttpEntity<>(getHeaders()),
                Object.class
            );
            
            @SuppressWarnings("unchecked")
            Map<String, Object> body = (Map<String, Object>) response.getBody();
            log.info("✓ List RAG library successful");
            return body;
            
        } catch (RestClientException e) {
            log.error("✗ List RAG library failed: {}", e.getMessage());
            return Map.of(
                "success", false,
                "error", "Failed to call Python service: " + e.getMessage()
            );
        }
    }
    
    /**
     * Generate content using RAG
     * POST /rag/generate-content
     */
    public RagGenerateContentResponse generateContentWithRag(RagGenerateContentRequest request) {
        try {
            log.info("Calling Python AI Service: POST /rag/generate-content | Brand: {} | Provider: {} | Model: {}", 
                     request.getBrandId(), request.getProvider(), request.getModel());
            
            String url = pythonServiceUrl + "/rag/generate-content";
            HttpEntity<RagGenerateContentRequest> entity = new HttpEntity<>(request, getHeaders());
            
            ResponseEntity<RagGenerateContentResponse> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                RagGenerateContentResponse.class
            );
            
            log.info("✓ RAG generate content successful | Content length: {} | RAG results: {}", 
                     response.getBody() != null ? response.getBody().getContent().length() : 0,
                     response.getBody() != null ? response.getBody().getRagResultsCount() : 0);
            return response.getBody();
            
        } catch (RestClientException e) {
            log.error("✗ RAG generate content failed: {}", e.getMessage());
            return RagGenerateContentResponse.builder()
                .success(false)
                .error("Failed to call Python service: " + e.getMessage())
                .build();
        }
    }
    
    /**
     * Generate content using RAG with images
     * POST /rag/generate-content
     */
    public RagGenerateContentResponse generateContentWithRagAndImages(RagGenerateContentRequest request) {
        try {
            log.info("Calling Python AI Service: POST /rag/generate-content | Brand: {} | Provider: {} | Model: {}", 
                     request.getBrandId(), request.getProvider(), request.getModel());
            
            String url = pythonServiceUrl + "/rag/generate-content";
            HttpEntity<RagGenerateContentRequest> entity = new HttpEntity<>(request, getHeaders());
            
            ResponseEntity<RagGenerateContentResponse> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                RagGenerateContentResponse.class
            );
            
            log.info("✓ RAG generate content with images successful");
            return response.getBody();
            
        } catch (RestClientException e) {
            log.error("✗ RAG generate content with images failed: {}", e.getMessage());
            return RagGenerateContentResponse.builder()
                .success(false)
                .error("Failed to call Python service: " + e.getMessage())
                .build();
        }
    }
    
    // ==================== HELPER METHODS ====================
    
    /**
     * Get HTTP headers with JSON content type
     */
    private HttpHeaders getHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Content-Type", "application/json");
        headers.set("Accept", "application/json");
        return headers;
    }
}

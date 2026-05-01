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

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.socialflow.model.AiModelConfig;
import com.socialflow.ai.dto.*;

import java.util.Map;
import java.util.HashMap;
import java.util.Optional;

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
    private final AiModelConfigService aiModelConfigService;
    private final ObjectMapper objectMapper;
    
    @Value("${ai.service.url:http://localhost:5000}")
    private String pythonServiceUrl;
    
    // ==================== TEXT GENERATION ENDPOINTS ====================
    
    /**
     * Generate content using AI model
     * POST /generate-content
     */
    public ContentResponse generateContent(ContentRequest request) {
        try {
            log.info("Calling Python AI Service: POST /generate-content | Max Words: {}", 
                     request.getMaxWords());
            
            String url = pythonServiceUrl + "/generate-content";
            Map<String, Object> payload = injectConfig(request, request.getBrandId(), "text");
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, getHeaders());
            
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
            log.info("Calling Python AI Service: POST /rewrite-content | Max Words: {}", 
                     request.getMaxWords());
            
            String url = pythonServiceUrl + "/rewrite-content";
            Map<String, Object> payload = injectConfig(request, request.getBrandId(), "text");
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, getHeaders());
            
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
            log.info("Calling Python AI Service: POST /optimize-keywords | Max Words: {}", 
                     request.getMaxWords());
            
            String url = pythonServiceUrl + "/optimize-keywords";
            Map<String, Object> payload = injectConfig(request, request.getBrandId(), "text");
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, getHeaders());
            
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
            log.info("Calling Python AI Service: POST /generate-image");
            
            String url = pythonServiceUrl + "/generate-image";
            Map<String, Object> payload = injectConfig(request, request.getBrandId(), "image");
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, getHeaders());
            
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
            log.info("Calling Python AI Service: POST /embed | Texts: {}", 
                     request.getTexts().size());
            
            String url = pythonServiceUrl + "/embed";
            Map<String, Object> payload = injectConfig(request, request.getBrandId(), "embedding");
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, getHeaders());
            
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
    public Object listAllModels() {
        try {
            log.info("Calling Python AI Service: GET /models");
            
            String url = pythonServiceUrl + "/models";
            
            ResponseEntity<Object> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                new HttpEntity<>(getHeaders()),
                Object.class
            );
            
            log.info("✓ List models successful");
            return response.getBody();
            
        } catch (RestClientException e) {
            log.error("✗ List models failed: {}", e.getMessage());
            return Map.of(
                "success", false,
                "error", "Failed to call Python service: " + e.getMessage()
            );
        }
    }
    
    /**
     * List available image models for all providers
     * GET /image-models
     */
    public Object listImageModels() {
        try {
            log.info("Calling Python AI Service: GET /image-models");
            
            String url = pythonServiceUrl + "/image-models";
            
            ResponseEntity<Object> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                new HttpEntity<>(getHeaders()),
                Object.class
            );
            
            log.info("✓ List image models successful");
            return response.getBody();
            
        } catch (RestClientException e) {
            log.error("✗ List image models failed: {}", e.getMessage());
            return Map.of(
                "success", false,
                "error", "Failed to call Python service: " + e.getMessage()
            );
        }
    }
    
    /**
     * List available embedding models for RAG
     * GET /embedding-models
     */
    public Object listEmbeddingModels() {
        try {
            log.info("Calling Python AI Service: GET /embedding-models");
            
            String url = pythonServiceUrl + "/embedding-models";
            
            ResponseEntity<Object> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                new HttpEntity<>(getHeaders()),
                Object.class
            );
            
            log.info("✓ List embedding models successful");
            return response.getBody();
            
        } catch (RestClientException e) {
            log.error("✗ List embedding models failed: {}", e.getMessage());
            return Map.of(
                "success", false,
                "error", "Failed to call Python service: " + e.getMessage()
            );
        }
    }
    
    /**
     * Refresh available models from providers
     * POST /refresh-models
     */
    public Object refreshModels() {
        try {
            log.info("Calling Python AI Service: POST /refresh-models");
            
            String url = pythonServiceUrl + "/refresh-models";
            
            ResponseEntity<Object> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                new HttpEntity<>(getHeaders()),
                Object.class
            );
            
            log.info("✓ Refresh models successful");
            return response.getBody();
            
        } catch (RestClientException e) {
            log.error("✗ Refresh models failed: {}", e.getMessage());
            return Map.of(
                "success", false,
                "error", "Failed to call Python service: " + e.getMessage()
            );
        }
    }
    
    // ==================== RAG ENDPOINTS ====================
    
    /**
     * Upload file to RAG content library
     * POST /rag/upload?brand_id=...&category=...&provider=...&model=...
     * Multipart form data: file
     */
    public RagUploadResponse uploadToRag(String brandId, String category, byte[] fileContent, String fileName) {
        try {
            log.info("Calling Python AI Service: POST /rag/upload | Brand: {} | File: {} | Size: {} bytes", 
                     brandId, fileName, fileContent.length);
            
            // Build URL with all query parameters
            String url = pythonServiceUrl + "/rag/upload?brand_id=" + brandId;
            
            if (category != null && !category.isEmpty()) {
                url += "&category=" + category;
            }
            
            AiModelConfig config = aiModelConfigService.getConfigByBrandIdStr(brandId);
            if (config != null) {
                if (config.getEmbeddingProvider() != null) url += "&provider=" + config.getEmbeddingProvider();
                if (config.getEmbeddingModel() != null) url += "&model=" + config.getEmbeddingModel();
            }
            
            log.info("Request URL: {}", url);
            
            // Build multipart form data (only file)
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            
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
            
            ResponseEntity<RagUploadResponse> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                RagUploadResponse.class
            );
            
            RagUploadResponse result = response.getBody();
            
            if (result != null && result.isSuccessful()) {
                log.info("✓ RAG upload successful | Library ID: {} | Chunks: {}", 
                         result.getLibraryId(), result.getTotalChunks());
            } else {
                log.warn("✗ RAG upload failed: {}", result != null ? result.getErrorMessage() : "Unknown error");
            }
            
            return result != null ? result : RagUploadResponse.builder()
                .success(false)
                .error("No response from service")
                .build();
            
        } catch (Exception e) {
            log.error("✗ RAG upload failed: {}", e.getMessage());
            return RagUploadResponse.builder()
                .success(false)
                .error("Failed to upload file: " + e.getMessage())
                .build();
        }
    }
    
    /**
     * Search RAG content library
     * POST /rag/search
     */
    public RagSearchResponse searchRag(RagSearchRequest request) {
        try {
            log.info("Calling Python AI Service: POST /rag/search | Brand: {} | Query: {} | Limit: {}", 
                     request.getBrandId(), request.getQuery(), request.getLimit());
            
            String url = pythonServiceUrl + "/rag/search";
            Map<String, Object> payload = injectConfig(request, request.getBrandId(), "embedding");
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, getHeaders());
            
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
    public RagDeleteResponse deleteFromRag(String brandId, String itemId) {
        try {
            log.info("Calling Python AI Service: DELETE /rag/library/{}/{} | Brand: {} | Item: {}", 
                     brandId, itemId, brandId, itemId);
            
            String url = UriComponentsBuilder.fromHttpUrl(pythonServiceUrl)
                .path("/rag/library/{brand_id}/{library_id}")
                .buildAndExpand(brandId, itemId)
                .toUriString();
            
            ResponseEntity<RagDeleteResponse> response = restTemplate.exchange(
                url,
                HttpMethod.DELETE,
                new HttpEntity<>(getHeaders()),
                RagDeleteResponse.class
            );
            
            log.info("✓ RAG delete successful");
            return response.getBody();
            
        } catch (RestClientException e) {
            log.error("✗ RAG delete failed: {}", e.getMessage());
            return RagDeleteResponse.builder()
                .success(false)
                .error("Failed to call Python service: " + e.getMessage())
                .build();
        }
    }
    
    /**
     * Get RAG index status
     * GET /rag/status/{brand_id}
     */
    public RagStatusResponse getRagStatus(String brandId) {
        try {
            log.info("Calling Python AI Service: GET /rag/status/{} | Brand: {}", brandId, brandId);
            
            String url = pythonServiceUrl + "/rag/status/" + brandId;
            
            ResponseEntity<RagStatusResponse> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                new HttpEntity<>(getHeaders()),
                RagStatusResponse.class
            );
            
            log.info("✓ Get RAG status successful");
            return response.getBody();
            
        } catch (RestClientException e) {
            log.error("✗ Get RAG status failed: {}", e.getMessage());
            return RagStatusResponse.builder()
                .success(false)
                .error("Failed to call Python service: " + e.getMessage())
                .build();
        }
    }
    
    /**
     * List RAG content library
     * GET /rag/library/{brand_id}
     */
    public RagLibraryResponse listRagLibrary(String brandId, Integer limit, Integer offset) {
        try {
            log.info("Calling Python AI Service: GET /rag/library/{} | Brand: {} | Limit: {} | Offset: {}", 
                     brandId, brandId, limit, offset);
            
            String url = UriComponentsBuilder.fromHttpUrl(pythonServiceUrl)
                .path("/rag/library/{brand_id}")
                .queryParamIfPresent("limit", Optional.ofNullable(limit))
                .queryParamIfPresent("offset", Optional.ofNullable(offset))
                .buildAndExpand(brandId)
                .toUriString();
            
            ResponseEntity<RagLibraryResponse> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                new HttpEntity<>(getHeaders()),
                RagLibraryResponse.class
            );
            
            log.info("✓ List RAG library successful");
            return response.getBody();
            
        } catch (RestClientException e) {
            log.error("✗ List RAG library failed: {}", e.getMessage());
            return RagLibraryResponse.builder()
                .success(false)
                .error("Failed to call Python service: " + e.getMessage())
                .build();
            
        }
    }
    
    /**
     * Generate content using RAG
     * POST /rag/generate-content
     */
    public RagGenerateContentResponse generateContentWithRag(RagGenerateContentRequest request) {
        try {
            log.info("Calling Python AI Service: POST /rag/generate-content | Brand: {}", 
                     request.getBrandId());
            
            String url = pythonServiceUrl + "/rag/generate-content";
            Map<String, Object> payload = injectConfig(request, request.getBrandId(), "rag");
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, getHeaders());
            
            ResponseEntity<RagGenerateContentResponse> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                RagGenerateContentResponse.class
            );
            
            log.info("✓ RAG generate content successful | Content length: {} | RAG results: {}", 
                     (response.getBody() != null && response.getBody().getContent() != null) ? response.getBody().getContent().length() : 0,
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
            log.info("Calling Python AI Service: POST /rag/generate-with-images | Brand: {}", request.getBrandId());
            
            String url = pythonServiceUrl + "/rag/generate-with-images";
            Map<String, Object> payload = injectConfig(request, request.getBrandId(), "rag");
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, getHeaders());
            
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
    
    // ==================== CHAT ENDPOINTS ====================
    
    /**
     * Send message to AI Chat
     * POST /chat/send
     */
    public ChatResponse sendChatMessage(ChatRequest request) {
        try {
            log.info("Calling Python AI Service: POST /chat/send | Brand: {} | User: {} | Session: {}", 
                     request.getBrandId(), request.getUserId(), request.getSessionId());
            
            String url = pythonServiceUrl + "/chat/send";
            Map<String, Object> payload = injectConfig(request, request.getBrandId(), "chat");
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, getHeaders());
            
            ResponseEntity<ChatResponse> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                ChatResponse.class
            );
            
            log.info("✓ Chat message sent successful");
            return response.getBody();
            
        } catch (RestClientException e) {
            log.error("✗ Chat message failed: {}", e.getMessage());
            return ChatResponse.builder()
                .success(false)
                .error("Failed to call Python chat service: " + e.getMessage())
                .build();
        }
    }
    
    /**
     * Get chat session history
     * GET /chat/session/{session_id}
     */
    public Object getChatHistory(String sessionId) {
        try {
            log.info("Calling Python AI Service: GET /chat/session/{}", sessionId);
            
            String url = pythonServiceUrl + "/chat/session/" + sessionId;
            
            ResponseEntity<Object> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                new HttpEntity<>(getHeaders()),
                Object.class
            );
            
            log.info("✓ Get chat history successful");
            return response.getBody();
            
        } catch (RestClientException e) {
            log.error("✗ Get chat history failed: {}", e.getMessage());
            return Map.of(
                "success", false,
                "error", "Failed to call Python chat service: " + e.getMessage()
            );
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
    
    /**
     * Helper to inject AI configuration into request map
     */
    private Map<String, Object> injectConfig(Object request, String brandId, String type) {
        Map<String, Object> map = objectMapper.convertValue(request, new TypeReference<Map<String, Object>>() {});
        
        // Helper to check if a value is missing or empty
        java.util.function.BiConsumer<String, String> putIfMissing = (key, value) -> {
            Object current = map.get(key);
            if (value != null && !value.isEmpty() && (current == null || current.toString().isEmpty())) {
                map.put(key, value);
            }
        };

        if (brandId != null && !brandId.isEmpty()) {
            AiModelConfig config = aiModelConfigService.getConfigByBrandIdStr(brandId);
            if (config != null) {
                // Primary model injection (provider/model)
                if ("text".equals(type) || "chat".equals(type) || "rag".equals(type)) {
                    putIfMissing.accept("provider", config.getTextProvider());
                    putIfMissing.accept("model", config.getTextModel());
                } else if ("image".equals(type)) {
                    putIfMissing.accept("provider", config.getImageProvider());
                    putIfMissing.accept("model", config.getImageModel());
                } else if ("embedding".equals(type)) {
                    putIfMissing.accept("provider", config.getEmbeddingProvider());
                    putIfMissing.accept("model", config.getEmbeddingModel());
                }
                
                // Agent/Sidekick models for multi-modal endpoints
                if ("chat".equals(type)) {
                    putIfMissing.accept("image_provider", config.getImageProvider());
                    putIfMissing.accept("image_model", config.getImageModel());
                    putIfMissing.accept("embedding_provider", config.getEmbeddingProvider());
                    putIfMissing.accept("embedding_model", config.getEmbeddingModel());
                }
                
                if ("rag".equals(type)) {
                    putIfMissing.accept("embedding_provider", config.getEmbeddingProvider());
                    putIfMissing.accept("embedding_model", config.getEmbeddingModel());
                }
            }
        }
        
        // Fallback to system defaults if still missings
        if ("image".equals(type)) {
            putIfMissing.accept("provider", "pixazo");
            putIfMissing.accept("model", "flux-1-schnell");
        } else if ("embedding".equals(type)) {
            putIfMissing.accept("provider", "openrouter");
            putIfMissing.accept("model", "nvidia/llama-nemotron-embed-vl-1b-v2:free");
        } else { 
            putIfMissing.accept("provider", "openrouter");
            putIfMissing.accept("model", "nvidia/nemotron-3-nano-30b-a3b:free");
        }
        
        return map;
    }
}

import { useState, useCallback } from 'react';
import { api } from './api';

// ============================================================================
// AI Content Generation Hook
// ============================================================================

interface GenerateContentParams {
  brand_id: string;
  prompt: string;
  provider?: string;
  model?: string;
  tone?: string;
  platform?: string;
  max_words?: number;
}

interface GenerateContentResult {
  content?: string;
  tokens?: number;
  provider?: string;
  model?: string;
  cost?: number;
  error?: string;
  success?: boolean;
}

export function useGenerateContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (params: GenerateContentParams): Promise<GenerateContentResult> => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.generateContent(params);
      if (!result.success) {
        throw new Error(result.error || 'Generation failed');
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return { error: message, success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  return { generate, loading, error };
}

// ============================================================================
// Content Rewrite Hook
// ============================================================================

interface RewriteContentParams {
  brand_id: string;
  content: string;
  tone: 'professional' | 'casual' | 'humorous' | 'inspirational' | 'technical';
  provider?: string;
  model?: string;
  platform?: string;
  max_words?: number;
}

interface RewriteContentResult {
  original_content?: string;
  rewritten_content?: string;
  tone_applied?: string;
  tokens?: number;
  provider?: string;
  model?: string;
  cost?: number;
  error?: string;
  success?: boolean;
}

export function useRewriteContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rewrite = useCallback(async (params: RewriteContentParams): Promise<RewriteContentResult> => {
    setLoading(true);
    setError(null);
    try {
      if (!params.content.trim()) {
        throw new Error('Content is required');
      }
      const result = await api.rewriteContent(params);
      if (!result.success) {
        throw new Error(result.error || 'Rewrite failed');
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return { error: message, success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  return { rewrite, loading, error };
}

// ============================================================================
// Keyword/Hashtag Optimization Hook
// ============================================================================

interface OptimizeKeywordsParams {
  brand_id: string;
  content: string;
  keywords?: string[];
  platform?: string;
  max_hashtags?: number;
  provider?: string;
  model?: string;
  max_words?: number;
}

interface OptimizeKeywordsResult {
  hashtags?: string[];
  keywords?: string[];
  trending_topics?: string[];
  tokens?: number;
  provider?: string;
  model?: string;
  cost?: number;
  error?: string;
  success?: boolean;
}

export function useOptimizeKeywords() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optimize = useCallback(async (params: OptimizeKeywordsParams): Promise<OptimizeKeywordsResult> => {
    setLoading(true);
    setError(null);
    try {
      if (!params.content.trim()) {
        throw new Error('Content is required');
      }
      const result = await api.optimizeKeywords(params);
      if (!result.success) {
        throw new Error(result.error || 'Optimization failed');
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return { error: message, success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  return { optimize, loading, error };
}

// ============================================================================
// Image Generation Hook
// ============================================================================

interface GenerateImageParams {
  brand_id: string;
  prompt: string;
  provider?: string;
  model?: string;
  style?: string;
  platform?: string;
  width?: number;
  height?: number;
  count?: number;
}

interface GeneratedImage {
  url?: string;
  base64?: string;
  prompt_used?: string;
  model?: string;
  seed?: string;
  finish_reason?: string;
}

interface GenerateImageResult {
  images?: GeneratedImage[];
  image_count?: number;
  tokens?: number;
  provider?: string;
  model?: string;
  cost?: number;
  error?: string;
  success?: boolean;
}

export function useGenerateImage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (params: GenerateImageParams): Promise<GenerateImageResult> => {
    setLoading(true);
    setError(null);
    try {
      if (!params.prompt.trim()) {
        throw new Error('Image prompt is required');
      }
      const result = await api.generateImage(params);
      if (!result.success) {
        throw new Error(result.error || 'Image generation failed');
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return { error: message, success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  return { generate, loading, error };
}

// ============================================================================
// RAG Upload File Hook
// ============================================================================

interface RagUploadResult {
  success: boolean;
  library_id?: string;
  file_name?: string;
  file_type?: string;
  category?: string;
  extracted_chars?: number;
  text_preview?: string;
  total_chunks?: number;
  embeddings_saved?: number;
  error?: string;
}

export function useRagUploadFile() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const upload = useCallback(async (
    brandId: string,
    file: File,
    category?: string
  ): Promise<RagUploadResult> => {
    setLoading(true);
    setError(null);
    setProgress(0);
    try {
      // Validate file
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error(`File size exceeds 10MB limit`);
      }

      const validTypes = ['application/pdf', 'text/plain', 'text/markdown', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(file.type)) {
        throw new Error(`File type not supported. Use PDF, TXT, MD, or DOCX`);
      }

      setProgress(50);
      const result = await api.ragUploadFile(brandId, file, category);
      setProgress(100);

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }, []);

  return { upload, loading, error, progress };
}

// ============================================================================
// RAG Search Hook
// ============================================================================

interface RagSearchResult {
  chunk_id: number;
  chunk_text: string;
  similarity_score: number;
  file_name: string;
  category: string;
}

interface RagSearchResponse {
  success: boolean;
  results?: RagSearchResult[];
  query?: string;
  total_results?: number;
  error?: string;
}

export function useRagSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (
    brandId: string,
    query: string,
    limit?: number,
    threshold?: number
  ): Promise<RagSearchResponse> => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.ragSearch({
        brand_id: brandId,
        query,
        limit: limit || 5,
        threshold: threshold || 0.3,
      });

      if (!result.success) {
        throw new Error(result.error || 'Search failed');
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  return { search, loading, error };
}

// ============================================================================
// RAG List Library Hook
// ============================================================================

interface LibraryFile {
  library_id: string;
  file_name: string;
  file_type: string;
  category: string;
  file_size: number;
  created_at: string;
  chunk_count: number;
}

interface RagLibraryResponse {
  success: boolean;
  brand_id?: string;
  files?: LibraryFile[];
  total_files?: number;
  error?: string;
}

export function useRagLibrary() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [total, setTotal] = useState(0);

  const list = useCallback(async (
    brandId: string,
    limit?: number,
    offset?: number
  ): Promise<RagLibraryResponse> => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.ragListLibrary(brandId, limit || 10, offset || 0);

      if (!result.success) {
        throw new Error(result.error || 'Failed to load library');
      }

      setFiles(result.files || []);
      setTotal(result.total_files || 0);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load library';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteFile = useCallback(async (libraryId: string, brandId: string): Promise<boolean> => {
    try {
      await api.ragDeleteFile(brandId, libraryId);
      // Refresh list by removing deleted file
      setFiles(files.filter(f => f.library_id !== libraryId));
      setTotal(total - 1);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      setError(message);
      return false;
    }
  }, [files, total]);

  return { list, deleteFile, files, total, loading, error };
}

// ============================================================================
// RAG Status Hook
// ============================================================================

interface RagStatusData {
  total_files: number;
  total_chunks: number;
  indexed_chunks: number;
  last_updated: string;
  status: 'INDEXING' | 'READY' | 'FAILED' | 'EMPTY';
}

interface RagStatusResponse {
  success: boolean;
  brand_id?: string;
  status_data?: RagStatusData;
  error?: string;
}

export function useRagStatus(brandId: string, pollInterval: number = 3000) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<RagStatusData | null>(null);

  const fetch = useCallback(async (): Promise<RagStatusResponse> => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.ragGetStatus(brandId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch status');
      }

      setStatus(result.status_data || null);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch status';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  // Auto-poll until READY
  const startPolling = useCallback(async () => {
    let isReady = false;
    let attempts = 0;
    const maxAttempts = 60; // 3 minutes max

    while (!isReady && attempts < maxAttempts) {
      const result = await fetch();
      if (result.status_data?.status === 'READY') {
        isReady = true;
      } else if (result.status_data?.status === 'FAILED') {
        throw new Error('RAG indexing failed');
      }
      attempts++;

      if (!isReady) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    return isReady;
  }, [fetch, pollInterval]);

  return { fetch, startPolling, status, loading, error };
}

// ============================================================================
// RAG Generate Content Hook
// ============================================================================

interface RagContextChunk {
  chunk_text: string;
  similarity_score: number;
}

interface RagGenerateContentResult {
  success: boolean;
  content?: string;
  rag_context?: RagContextChunk[];
  rag_query_used?: string;
  rag_results_count?: number;
  tokens_used?: number;
  ai_model?: string;
  error?: string;
}

export function useRagGenerateContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (data: {
    brand_id: string;
    prompt: string;
    rag_query?: string;
    rag_limit?: number;
    rag_threshold?: number;
    provider?: string;
    model?: string;
    tone?: string;
  }): Promise<RagGenerateContentResult> => {
    setLoading(true);
    setError(null);
    try {
      // Validate RAG is ready
      const statusResult = await api.ragGetStatus(data.brand_id);
      if (!statusResult.success || statusResult.status_data?.status !== 'READY') {
        throw new Error('Content library not ready. Please upload files first.');
      }

      const result = await api.ragGenerateContent(data);

      if (!result.success) {
        throw new Error(result.error || 'Content generation failed');
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  return { generate, loading, error };
}

// ============================================================================
// RAG Generate with Images Hook
// ============================================================================

interface RagGenerateWithImagesResult extends RagGenerateContentResult {
  images?: Array<{
    url: string;
    prompt_used: string;
    model: string;
  }>;
}

export function useRagGenerateWithImages() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (data: {
    brand_id: string;
    prompt: string;
    rag_query?: string;
    rag_limit?: number;
    rag_threshold?: number;
    provider?: string;
    model?: string;
    tone?: string;
    image_model?: string;
  }): Promise<RagGenerateWithImagesResult> => {
    setLoading(true);
    setError(null);
    try {
      // Validate RAG is ready
      const statusResult = await api.ragGetStatus(data.brand_id);
      if (!statusResult.success || statusResult.status_data?.status !== 'READY') {
        throw new Error('Content library not ready. Please upload files first.');
      }

      const result = await api.ragGenerateContentWithImages(data);

      if (!result.success) {
        throw new Error(result.error || 'Content generation failed');
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  return { generate, loading, error };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getSimilarityColor(score: number): string {
  if (score >= 0.6) return '#00d2a0'; // Green
  if (score >= 0.4) return '#ffa726'; // Orange
  return '#ff6b6b'; // Red
}

export function getFileTypeLabel(fileType: string): string {
  const labels: Record<string, string> = {
    pdf: 'PDF',
    txt: 'Text',
    md: 'Markdown',
    docx: 'Word',
    doc: 'Document',
  };
  return labels[fileType?.toLowerCase()] || fileType;
}

export function validateFileType(file: File): boolean {
  const validTypes = ['application/pdf', 'text/plain', 'text/markdown', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  return validTypes.includes(file.type);
}

// ============================================================================
// Model Management Hooks
// ============================================================================

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  type: 'text' | 'image' | 'embedding';
  description?: string;
}

interface ModelResponse {
  text_models?: ModelInfo[];
  image_models?: ModelInfo[];
  default_text_model?: string;
  default_image_model?: string;
  error?: string;
  success?: boolean;
}

export function useGetModels() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);

  const fetch = useCallback(async (): Promise<ModelResponse> => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getModels();
      if (result.success && result.text_models) {
        setModels(result.text_models);
      } else {
        throw new Error(result.error || 'Failed to fetch models');
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return { error: message, success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetch, models, loading, error };
}

export function useGetImageModels() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);

  const fetch = useCallback(async (): Promise<ModelResponse> => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getImageModels();
      if (result.success && result.image_models) {
        setModels(result.image_models);
      } else {
        throw new Error(result.error || 'Failed to fetch image models');
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return { error: message, success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetch, models, loading, error };
}

export function useRefreshModels() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<ModelResponse> => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.refreshModels();
      if (!result.success) {
        throw new Error(result.error || 'Failed to refresh models');
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return { error: message, success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  return { refresh, loading, error };
}

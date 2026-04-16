// ============================================================================
// AI SERVICE TYPES
// ============================================================================

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  pricing?: {
    input_cost_per_1m: number;
    output_cost_per_1m: number;
  };
  context_window?: number;
  max_output_tokens?: number;
}

export interface ImageModel {
  id: string;
  name: string;
  provider: string;
  pricing?: {
    cost_per_image: number;
  };
  sizes?: string[];
}

export interface GenerateContentRequest {
  prompt: string;
  provider?: 'groq' | 'openrouter';
  model?: string;
  tone?: 'professional' | 'casual' | 'premium' | 'aspirational' | 'funny';
  platform?: 'facebook' | 'twitter' | 'linkedin' | 'bluesky' | 'threads';
  max_words?: number;
}

export interface GenerateContentResponse {
  success: boolean;
  content?: string;
  tokens?: number;
  provider?: string;
  model?: string;
  cost?: number;
  error?: string;
}

export interface RewriteContentRequest {
  content: string;
  tone: 'professional' | 'casual' | 'humorous' | 'inspirational' | 'technical';
  provider?: 'groq' | 'openrouter';
  model?: string;
  platform?: 'facebook' | 'twitter' | 'linkedin' | 'bluesky' | 'threads';
  max_words?: number;
}

export interface RewriteContentResponse {
  success: boolean;
  original_content?: string;
  rewritten_content?: string;
  tone_applied?: string;
  tokens?: number;
  provider?: string;
  model?: string;
  cost?: number;
  error?: string;
}

export interface KeywordOptimizationRequest {
  content: string;
  keywords?: string[];
  platform?: 'facebook' | 'twitter' | 'linkedin' | 'bluesky' | 'threads';
  max_hashtags?: number;
  provider?: 'groq' | 'openrouter';
  model?: string;
  max_words?: number;
}

export interface KeywordOptimizationResponse {
  success: boolean;
  hashtags?: string[];
  keywords?: string[];
  trending_topics?: string[];
  tokens?: number;
  provider?: string;
  model?: string;
  cost?: number;
  error?: string;
}

export interface GenerateImageRequest {
  prompt: string;
  provider?: 'pixazo' | 'openrouter';
  model?: string;
  style?: string;
  platform?: 'facebook' | 'twitter' | 'linkedin' | 'bluesky' | 'threads';
  width?: number;
  height?: number;
  count?: number;
}

export interface GenerateImageResponse {
  success: boolean;
  images?: Array<{
    url?: string;
    base64?: string;
    prompt_used?: string;
    model?: string;
    seed?: string;
    finish_reason?: string;
  }>;
  image_count?: number;
  tokens?: number;
  provider?: string;
  model?: string;
  cost?: number;
  error?: string;
}

// ============================================================================
// RAG (RETRIEVAL-AUGMENTED GENERATION) TYPES
// ============================================================================

export interface RagSearchRequest {
  brand_id: string;
  query: string;
  limit?: number;
  threshold?: number;
  model?: string;
}

export interface RagSearchResult {
  chunk_id: number;
  chunk_text: string;
  similarity_score: number;
  file_name: string;
  category: string;
}

export interface RagSearchResponse {
  success: boolean;
  results?: RagSearchResult[];
  query?: string;
  total_results?: number;
  error?: string;
}

export interface RagUploadRequest {
  brand_id: string;
  file: File;
  category?: `BRAND_GUIDELINES` | `FAQ` | `POSTS` | `COMPETITOR_ANALYSIS` | `OTHER`;
}

export interface RagUploadResponse {
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

export interface LibraryFile {
  library_id: string;
  file_name: string;
  file_type: string;
  category: string;
  file_size: number;
  created_at: string;
  chunk_count: number;
}

export interface RagLibraryResponse {
  success: boolean;
  brand_id?: string;
  files?: LibraryFile[];
  total_files?: number;
  error?: string;
}

export interface RagStatusData {
  total_files: number;
  total_chunks: number;
  indexed_chunks: number;
  last_updated: string;
  status: 'INDEXING' | 'READY' | 'FAILED' | 'EMPTY';
}

export interface RagStatusResponse {
  success: boolean;
  brand_id?: string;
  status_data?: RagStatusData;
  error?: string;
}

export interface RagDeleteResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface RagContextChunk {
  chunk_text: string;
  similarity_score: number;
}

export interface RagGenerateContentRequest {
  brand_id: string;
  prompt: string;
  rag_query?: string;
  rag_limit?: number;
  rag_threshold?: number;
  provider?: 'groq' | 'openrouter';
  model?: string;
  tone?: string;
}

export interface RagGenerateContentResponse {
  success: boolean;
  content?: string;
  rag_context?: RagContextChunk[];
  rag_query_used?: string;
  rag_results_count?: number;
  tokens_used?: number;
  ai_model?: string;
  error?: string;
}

export interface RagGenerateWithImagesRequest extends RagGenerateContentRequest {
  image_model?: string;
}

export interface GeneratedImage {
  url: string;
  prompt_used: string;
  model: string;
}

export interface RagGenerateWithImagesResponse extends RagGenerateContentResponse {
  images?: GeneratedImage[];
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface LoadingState {
  loading: boolean;
  error: string | null;
}

export interface FileUploadState extends LoadingState {
  progress: number;
}

export interface SearchState extends LoadingState {
  results: RagSearchResult[];
  query: string;
}

export interface GenerationState extends LoadingState {
  content: string | null;
  context: RagContextChunk[];
  model: string | null;
}

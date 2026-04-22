'use client';
import { Suspense } from 'react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';
import AppShell from '@/components/AppShell';
import {
    PlatformIcon, IconCamera, IconFilm, IconSend, IconClock, IconSave, IconX,
} from '@/components/Icons';
import { FacebookPostPreview, TwitterPostPreview, InstagramPreviews, BlueskyPostPreview, LinkedInPostPreview, ThreadsPostPreview } from '@automattic/social-previews';
import '@automattic/social-previews/style.css';
import '@/styles/create-page.css';

interface PageItem {
    id: string;
    pageName: string;
    platform: string;
    connectionName: string;
    platformPageId: string;
}

interface UploadedMedia {
    id: string;
    filename: string;
    url: string;
    contentType: string;
    originalName: string;
    fileSize: number;
}

// Platform Preview Component using @automattic/social-previews
function PlatformPreview({ 
    platform, 
    pageInfo, 
    caption, 
    mediaFiles, 
    onEdit, 
    hasCustomContent 
}: {
    platform: string;
    pageInfo: any;
    caption: string;
    mediaFiles: UploadedMedia[];
    onEdit: () => void;
    hasCustomContent: boolean;
}) {
    const platformLower = platform.toLowerCase();
    const currentMedia = mediaFiles.length > 0 ? mediaFiles[0] : null;
    const allMediaArray = mediaFiles.length > 0 ? mediaFiles.map(file => ({
        url: file.url,
        type: file.contentType,
        alt: file.originalName
    })) : undefined;

    return (
        <div className="mockup-wrapper">
            {platformLower === 'facebook' && (
                <div style={{ padding: '16px 0' }}>
                    <FacebookPostPreview
                        url=""
                        title={caption || 'New Post'}
                        customText={caption}
                        image={currentMedia?.url}
                        media={allMediaArray}
                        user={{ displayName: pageInfo.pageName }}
                    />
                </div>
            )}

            {platformLower === 'twitter' && (
                <div style={{ padding: '16px 0' }}>
                    <TwitterPostPreview
                        url=""
                        title={caption || 'Tweet'}
                        text={caption}
                        name={pageInfo.pageName}
                        screenName={`@${pageInfo.pageName.toLowerCase().replace(/\s+/g, '')}`}
                        profileImage="https://abs.twimg.com/sticky/default_profile_images/default_profile_bigger.png"
                        date={Date.now()}
                        image={currentMedia?.url}
                        media={mediaFiles.length > 0 ? mediaFiles.slice(0, 4).map(file => ({
                            url: file.url,
                            alt: file.originalName,
                            type: file.contentType
                        })) : undefined}
                    />
                </div>
            )}

            {platformLower === 'instagram' && (
                <div style={{ padding: '16px 0' }}>
                    <InstagramPreviews
                        url=""
                        name={pageInfo.pageName}
                        profileImage="https://via.placeholder.com/40?text=PP"
                        caption={caption}
                        image={currentMedia?.url}
                        media={allMediaArray}
                    />
                </div>
            )}

            {platformLower === 'tiktok' && (
                <div className="mockup-tiktok">
                    <div style={{ position: 'relative' }}>
                        {mediaFiles.length > 0 ? (
                            <img src={mediaFiles[0].url} alt="preview" style={{ width: '100%', borderRadius: 12, aspectRatio: '9/16', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ width: '100%', aspectRatio: '9/16', background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>
                                <span style={{ fontSize: 32, color: 'var(--text-muted)' }}>🎵</span>
                            </div>
                        )}
                        <div style={{ position: 'absolute', bottom: 32, right: 12, display: 'flex', flexDirection: 'column', gap: 16, color: 'white', textAlign: 'center' }}>
                            <div>❤️<br/><span style={{ fontSize: 10 }}>234</span></div>
                            <div>💬<br/><span style={{ fontSize: 10 }}>45</span></div>
                            <div>↗️<br/><span style={{ fontSize: 10 }}>89</span></div>
                        </div>
                    </div>
                    <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-primary)' }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{pageInfo.pageName}</div>
                        <p style={{ margin: 0, lineHeight: 1.4 }}>{caption || 'Your TikTok caption...'}</p>
                    </div>
                </div>
            )}

            {platformLower === 'bluesky' && (
                <div style={{ padding: '16px 0' }}>
                    <BlueskyPostPreview
                        url=""
                        title={caption || 'Bluesky Post'}
                        customText={caption}
                        image={currentMedia?.url}
                        media={allMediaArray}
                        user={{
                            displayName: pageInfo.pageName,
                            avatarUrl: "https://via.placeholder.com/48?text=BS",
                            address: `@${pageInfo.pageName.toLowerCase().replace(/\s+/g, '')}`
                        }}
                    />
                </div>
            )}

            {platformLower === 'linkedin' && (
                <div style={{ padding: '16px 0' }}>
                    <LinkedInPostPreview
                        url="#"
                        title={caption || 'LinkedIn Post'}
                        description={caption}
                        name={pageInfo.pageName}
                        profileImage="https://via.placeholder.com/48?text=LI"
                        image={currentMedia?.url}
                        media={allMediaArray}
                    />
                </div>
            )}

            {platformLower === 'threads' && (
                <div style={{ padding: '16px 0' }}>
                    <ThreadsPostPreview
                        url=""
                        title={caption || 'Threads Post'}
                        name={pageInfo.pageName}
                        profileImage="https://via.placeholder.com/48?text=TH"
                        image={currentMedia?.url}
                        media={allMediaArray}
                    />
                </div>
            )}

            {/* Fallback for unsupported platforms */}
            {!['facebook', 'twitter', 'instagram', 'tiktok', 'bluesky', 'linkedin', 'threads'].includes(platformLower) && (
                <div style={{ 
                    padding: '16px', 
                    background: 'var(--bg-glass)', 
                    borderRadius: 'var(--radius)', 
                    border: '1px solid var(--border)',
                    textAlign: 'center',
                    color: 'var(--text-muted)'
                }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>📱</div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Platform Preview</div>
                    <p style={{ margin: 0, fontSize: 11, lineHeight: 1.4 }}>
                        Preview not available for <strong>{platform}</strong>
                    </p>
                    <p style={{ margin: '8px 0 0 0', fontSize: 11, color: 'var(--accent)' }}>
                        Caption: {caption || '(no caption)'}
                    </p>
                </div>
            )}

            {/* Edit button and custom content indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <button 
                    onClick={onEdit}
                    style={{
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-glass)',
                        color: 'var(--accent)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                    }}
                >
                    Custom Edit for {platform}
                </button>
                {hasCustomContent && (
                    <span style={{ fontSize: 11, color: 'var(--accent-light)', fontWeight: 600 }}>
                         Custom content
                    </span>
                )}
            </div>
        </div>
    );
}

function CreatePostContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const postId = searchParams.get('postId');
    const { selectedBrand: brand } = useBrand();
    const [pages, setPages] = useState<PageItem[]>([]);
    const [selectedPages, setSelectedPages] = useState<string[]>([]);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [isEditingPost, setIsEditingPost] = useState(false);
    const [editingPostId, setEditingPostId] = useState<string | null>(null);

    // Campaigns state
    const [campaigns, setCampaigns] = useState<{ id: string, name: string }[]>([]);
    const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);

    // Media state
    const [mediaFiles, setMediaFiles] = useState<UploadedMedia[]>([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);

    // Platform-specific content state
    const [platformContent, setPlatformContent] = useState<{ [pageId: string]: string }>({});
    const [selectedPageForPreview, setSelectedPageForPreview] = useState<string | null>(null);
    const [editingModal, setEditingModal] = useState<{ isOpen: boolean; pageId: string | null }>({ isOpen: false, pageId: null });
    const [tempEditContent, setTempEditContent] = useState('');

    // AI modal state
    const [aiModal, setAiModal] = useState<{ isOpen: boolean; type: 'generate' | 'enhance' | 'hashtags' | null }>({ isOpen: false, type: null });
    const [aiOptions, setAiOptions] = useState({
        provider: 'groq',
        model: '',
        tone: 'casual',
        length: 'medium',
        customPrompt: '',
        useRag: false
    });
    const [aiLoading, setAiLoading] = useState(false);
    const [availableModels, setAvailableModels] = useState<{ id: string; name: string; provider: string }[]>([]);
    const [generatedContent, setGeneratedContent] = useState<string>('');
    const [isGenerationComplete, setIsGenerationComplete] = useState(false);

    // Image generation state
    const [imageModal, setImageModal] = useState<{ isOpen: boolean; mode: 'generate' | 'search' | null }>({ isOpen: false, mode: null });
    const [imagePrompt, setImagePrompt] = useState('');
    const [imageSearchQuery, setImageSearchQuery] = useState('');
    const [imageCount, setImageCount] = useState(1);
    const [imageProvider, setImageProvider] = useState('pixazo');
    const [imageModel, setImageModel] = useState('flux-1-schnell');
    const [imageModels, setImageModels] = useState<{ id: string; name: string; provider: string }[]>([]);
    const [generatedImages, setGeneratedImages] = useState<any[]>([]);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set()); // Track selected image indices
    const [imageLoading, setImageLoading] = useState(false);
    const [isImageGenerationComplete, setIsImageGenerationComplete] = useState(false);

    useEffect(() => {
        if (!brand) return;
        setLoading(true);
        Promise.all([
            api.getAllPagesForBrand(brand.id).then(p => { setPages(p); setSelectedPages([]); }),
            api.getCampaigns(brand.id).then(c => { setCampaigns(c); setSelectedCampaign(''); }),
            api.getModels().then(m => {
                console.log('Models response:', m);
                // Handle different response formats
                let modelsList: any[] = [];
                
                // If response has groq/openrouter fields (from Python API)
                if (m?.groq || m?.openrouter) {
                    const groqModels = m.groq || {};
                    const openrouterModels = m.openrouter || {};
                    
                    console.log('Groq models:', groqModels);
                    console.log('OpenRouter models:', openrouterModels);
                    
                    // Convert from object to array: { "model-id": {...}, ... } -> [{ id, name, provider }, ...]
                    modelsList = [
                        ...Object.entries(groqModels).map(([modelId, modelInfo]: any) => ({
                            id: modelId,
                            name: modelInfo?.name || modelId,
                            provider: 'groq'
                        })),
                        ...Object.entries(openrouterModels).map(([modelId, modelInfo]: any) => ({
                            id: modelId,
                            name: modelInfo?.name || modelId,
                            provider: 'openrouter'
                        }))
                    ];
                } else {
                    // Fallback for other formats
                    modelsList = Array.isArray(m) ? m : m?.models || m?.data || [];
                }
                
                console.log('Final models list:', modelsList);
                setAvailableModels(modelsList);
                // Set default model for first provider
                const groqModel = modelsList.find?.((md: any) => md.provider === 'groq');
                if (groqModel) setAiOptions(prev => ({ ...prev, model: groqModel.id }));
            }).catch((err) => {
                console.error('Failed to fetch models:', err);
                // If API fails, just use empty list
                setAvailableModels([]);
            }),
            api.getImageModels?.().then(m => {
                console.log('Image models response:', m);
                let imgModelsList: any[] = [];
                
                if (m?.pixazo || m?.openrouter) {
                    const pixazoModels = m.pixazo || {};
                    const openrouterImgModels = m.openrouter || {};
                    
                    imgModelsList = [
                        ...Object.entries(pixazoModels).map(([modelId, modelInfo]: any) => ({
                            id: modelId,
                            name: modelInfo?.name || modelId,
                            provider: 'pixazo'
                        })),
                        ...Object.entries(openrouterImgModels).map(([modelId, modelInfo]: any) => ({
                            id: modelId,
                            name: modelInfo?.name || modelId,
                            provider: 'openrouter'
                        }))
                    ];
                } else {
                    imgModelsList = Array.isArray(m) ? m : m?.models || m?.data || [];
                }
                
                setImageModels(imgModelsList);
                const pixazoModel = imgModelsList.find?.((md: any) => md.provider === 'pixazo');
                if (pixazoModel) setImageModel(pixazoModel.id);
            }).catch(() => setImageModels([]))
        ]).finally(() => setLoading(false));
    }, [brand]);

    // Load post data if editing
    useEffect(() => {
        if (!postId || !brand) return;
        
        setLoading(true);
        api.getPost(postId)
            .then((post: any) => {
                setContent(post.content);
                setEditingPostId(postId);
                setIsEditingPost(true);
                if (post.mediaFiles && post.mediaFiles.length > 0) {
                    setMediaFiles(post.mediaFiles.map((m: any) => ({
                        id: m.id,
                        filename: m.url.split('/').pop() || '',  // Extract filename from URL
                        url: m.url,
                        contentType: m.contentType,
                        originalName: m.originalName,
                        fileSize: 0  // Not provided by API
                    })));
                }
                if (post.page) {
                    setSelectedPages([post.page.id]);
                    setSelectedPageForPreview(post.page.id);
                }
                if (post.campaign) {
                    setSelectedCampaign(post.campaign.id);
                }
                if (post.scheduledTime) {
                    setScheduledTime(post.scheduledTime);
                }
            })
            .catch((err: any) => setError(err instanceof Error ? err.message : 'Failed to load post'))
            .finally(() => setLoading(false));
    }, [postId, brand]);

    // Auto-replicate content when pages are selected
    useEffect(() => {
        if (selectedPages.length > 0 && content.trim() && Object.keys(platformContent).length === 0) {
            const newPlatformContent: { [key: string]: string } = {};
            selectedPages.forEach(pageId => {
                newPlatformContent[pageId] = content;
            });
            setPlatformContent(newPlatformContent);
            if (!selectedPageForPreview) setSelectedPageForPreview(selectedPages[0]);
        }
    }, [selectedPages]);

    const togglePage = (id: string) => {
        const newSelected = selectedPages.includes(id)
            ? selectedPages.filter(p => p !== id)
            : [...selectedPages, id];
        
        setSelectedPages(newSelected);
        
        // Remove from platformContent if deselected
        if (!newSelected.includes(id)) {
            setPlatformContent(prev => {
                const updated = { ...prev };
                delete updated[id];
                return updated;
            });
            if (selectedPageForPreview === id && newSelected.length > 0) {
                setSelectedPageForPreview(newSelected[0]);
            }
        }
    };

    const handleEditPlatform = (pageId: string) => {
        const currentContent = platformContent[pageId] || content;
        setTempEditContent(currentContent);
        setEditingModal({ isOpen: true, pageId });
    };

    const savePlatformContent = () => {
        if (editingModal.pageId) {
            setPlatformContent(prev => ({
                ...prev,
                [editingModal.pageId!]: tempEditContent
            }));
        }
        setEditingModal({ isOpen: false, pageId: null });
        setTempEditContent('');
    };

    const platformIcon = (p: string) => {
        return <PlatformIcon platform={p} size={18} />;
    };

    const getPageInfo = (pageId: string) => {
        return pages.find(p => p.id === pageId);
    };

    const getCurrentPreviewContent = () => {
        if (!selectedPageForPreview) return content;
        return platformContent[selectedPageForPreview] || content;
    };

    // ===== AI Functions =====
    const handleAiGenerate = async () => {
        setAiLoading(true);
        try {
            if (aiOptions.useRag && brand) {
                // Use RAG endpoint
                const result = await api.ragGenerateContent({
                    brand_id: brand.id,
                    prompt: aiOptions.customPrompt || 'Generate an engaging social media caption',
                    provider: aiOptions.provider,
                    model: aiOptions.model,
                    tone: aiOptions.tone,
                    rag_limit: 5,
                    rag_threshold: 0.7
                });
                setGeneratedContent(result.caption || result.content);
                setIsGenerationComplete(true);
            } else {
                // Use regular generation
                const result = await api.generateContent({
                    prompt: aiOptions.customPrompt || 'Generate an engaging social media caption',
                    provider: aiOptions.provider,
                    model: aiOptions.model,
                    tone: aiOptions.tone,
                    platform: selectedPages.length > 0 ? pages.find(p => p.id === selectedPages[0])?.platform : undefined,
                    max_words: aiOptions.length === 'short' ? 50 : aiOptions.length === 'long' ? 300 : 150
                });
                setGeneratedContent(result.caption || result.content);
                setIsGenerationComplete(true);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'AI generation failed');
        } finally {
            setAiLoading(false);
        }
    };

    const confirmGeneratedContent = () => {
        setContent(generatedContent);
        setGeneratedContent('');
        setIsGenerationComplete(false);
        setAiModal({ isOpen: false, type: null });
    };

    const cancelGeneration = () => {
        setGeneratedContent('');
        setIsGenerationComplete(false);
        setAiModal({ isOpen: false, type: null });
    };

    const handleGenerateImage = async () => {
        if (!imagePrompt.trim()) return setError('Please enter image prompt');
        setImageLoading(true);
        try {
            const result = await api.generateImage({
                prompt: imagePrompt,
                provider: imageProvider,
                model: imageModel,
                count: imageCount
            });
            // Extract images array from response
            console.log('Generate image response:', result);
            const images = result?.images || (Array.isArray(result) ? result : []);
            setGeneratedImages(images);
            setIsImageGenerationComplete(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Image generation failed');
        } finally {
            setImageLoading(false);
        }
    };

    const confirmGeneratedImages = async () => {
        if (generatedImages.length === 0) return;
        try {
            // Add first generated image to media (user can add more by regenerating)
            await addImageToMedia(generatedImages[0].url || generatedImages[0]);
            setIsImageGenerationComplete(false);
            setGeneratedImages([]);
            setImagePrompt('');
            setImageCount(1);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to add image');
        }
    };

    const regenerateImages = async () => {
        setIsImageGenerationComplete(false);
        await handleGenerateImage();
    };

    const cancelImageGeneration = () => {
        setIsImageGenerationComplete(false);
        setGeneratedImages([]);
        setImageModal({ isOpen: false, mode: null });
    };

    const handleSearchPhotos = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            setSelectedImages(new Set());
            return;
        }
        setImageLoading(true);
        try {
            console.log('🔍 Searching photos for:', query);
            const results = await api.searchStockPhotos(query, 12);
            console.log('📷 Search results:', results);
            setSearchResults(results);
            setSelectedImages(new Set()); // Reset selection on new search
        } catch (err: unknown) {
            console.error('❌ Search failed:', err);
            setError(err instanceof Error ? err.message : 'Photo search failed');
        } finally {
            setImageLoading(false);
        }
    };

    // Real-time search as user types
    useEffect(() => {
        if (imageModal.mode === 'search' && imageSearchQuery.trim()) {
            handleSearchPhotos(imageSearchQuery);
        } else if (!imageSearchQuery.trim()) {
            setSearchResults([]);
            setSelectedImages(new Set());
        }
    }, [imageSearchQuery, imageModal.mode]);

    const toggleImageSelection = (idx: number) => {
        const newSelected = new Set(selectedImages);
        if (newSelected.has(idx)) {
            newSelected.delete(idx);
        } else {
            newSelected.add(idx);
        }
        setSelectedImages(newSelected);
    };

    const addSelectedImages = async () => {
        if (selectedImages.size === 0) return;
        
        try {
            setUploading(true);
            const selectedImagesList = Array.from(selectedImages)
                .sort((a, b) => a - b)
                .map(idx => searchResults[idx]);
            
            // Add all selected images
            for (const img of selectedImagesList) {
                await addImageToMedia(img.url);
            }
            
            // Clear and close
            setImageModal({ isOpen: false, mode: null });
            setImageSearchQuery('');
            setSelectedImages(new Set());
            setSearchResults([]);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to add images');
        } finally {
            setUploading(false);
        }
    };

    const addImageToMedia = async (imageUrl: string, alt: string = 'Generated/Stock Image') => {
        try {
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status}`);
            }
            
            const blob = await response.blob();
            // Determine correct MIME type from blob or URL
            let mimeType = blob.type || 'image/jpeg';
            if (!mimeType || mimeType === '') {
                if (imageUrl.endsWith('.png')) mimeType = 'image/png';
                else if (imageUrl.endsWith('.gif')) mimeType = 'image/gif';
                else if (imageUrl.endsWith('.webp')) mimeType = 'image/webp';
                else mimeType = 'image/jpeg';
            }
            
            const filename = `image-${Date.now()}.${mimeType.split('/')[1] || 'jpg'}`;
            const file = new File([blob], filename, { type: mimeType });
            
            // Use existing upload handler
            setUploading(true);
            const result = await api.uploadMedia(file);
            setMediaFiles(prev => [...prev, result]);
            setImageModal({ isOpen: false, mode: null });
            setImagePrompt('');
            setImageSearchQuery('');
            setGeneratedImages([]);
            setSearchResults([]);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to add image');
        } finally {
            setUploading(false);
        }
    };

    const handleAiEnhance = async () => {
        setAiLoading(true);
        try {
            const result = await api.rewriteContent({
                content: content,
                tone: aiOptions.tone,
                provider: aiOptions.provider,
                model: aiOptions.model,
                platform: selectedPages.length > 0 ? pages.find(p => p.id === selectedPages[0])?.platform : undefined,
                max_words: aiOptions.length === 'short' ? 50 : aiOptions.length === 'long' ? 300 : 150
            });
            setContent(result.rewritten || result.content);
            setAiModal({ isOpen: false, type: null });
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'AI enhancement failed');
        } finally {
            setAiLoading(false);
        }
    };

    const handleAiHashtags = async () => {
        setAiLoading(true);
        try {
            const result = await api.optimizeKeywords({
                content: content,
                provider: aiOptions.provider,
                model: aiOptions.model,
                max_hashtags: aiOptions.length === 'short' ? 3 : aiOptions.length === 'long' ? 15 : 8
            });
            setContent(content + '\n\n' + (result.hashtags || result.keywords || []).map((tag: string) => `#${tag}`).join(' '));
            setAiModal({ isOpen: false, type: null });
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to generate hashtags');
        } finally {
            setAiLoading(false);
        }
    };

    const insertText = (before: string, after: string = '') => {
        const textarea = document.querySelector('.caption-textarea') as HTMLTextAreaElement;
        if (!textarea) return;
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = content.substring(start, end);
        const newContent = content.substring(0, start) + before + selected + after + content.substring(end);
        setContent(newContent);
    };

    // ===== Media Upload =====
    const handleFileUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setUploading(true);
        setError('');

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
                    setError('Only image and video files are allowed');
                    continue;
                }
                if (file.size > 50 * 1024 * 1024) {
                    setError('File too large (max 50MB)');
                    continue;
                }
                const result = await api.uploadMedia(file);
                setMediaFiles(prev => [...prev, result]);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeMedia = (id: string) => {
        setMediaFiles(prev => prev.filter(m => m.id !== id));
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        handleFileUpload(e.dataTransfer.files);
    };

    // ===== Publish/Schedule/Draft =====
    const handleSubmit = async () => {
        if (!content.trim()) return setError('Please enter post content');
        if (selectedPages.length === 0) return setError('Please select at least one page');

        let ISOStringTime = undefined;
        if (scheduledTime) {
            const date = new Date(scheduledTime);
            if (date <= new Date()) return setError('Scheduled time must be in the future');
            ISOStringTime = date.toISOString();
        }

        setError('');
        setPublishing(true);
        try {
            const postData = {
                content,
                pageIds: selectedPages,
                mediaFilenames: mediaFiles.map(m => m.filename),
                scheduledTime: ISOStringTime,
                campaignId: selectedCampaign || undefined,
                platformContent // Include platform-specific content
            };

            if (isEditingPost && editingPostId) {
                // Update existing draft
                await api.updatePost(editingPostId, postData);
                
                // If not scheduled, publish immediately
                if (!ISOStringTime) {
                    await api.publishPost(editingPostId);
                }
            } else {
                // Create new post
                const posts = await api.createPost(postData);
                
                // If not scheduled, publish immediately
                if (!ISOStringTime) {
                    await Promise.all(posts.map((p: { id: string }) => api.publishPost(p.id)));
                }
            }
            router.push('/dashboard');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Publish failed');
        } finally {
            setPublishing(false);
        }
    };

    const handleSaveDraft = async () => {
        if (!content.trim()) return setError('Please enter post content');
        if (selectedPages.length === 0) return setError('Please select at least one page');
        setError('');
        try {
            const postData = {
                content,
                pageIds: selectedPages,
                mediaFilenames: mediaFiles.map(m => m.filename),
                campaignId: selectedCampaign || undefined,
                platformContent // Include platform-specific content
            };

            if (isEditingPost && editingPostId) {
                await api.updatePost(editingPostId, postData);
            } else {
                await api.createPost(postData);
            }
            router.push('/dashboard');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Save failed');
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <AppShell>
            <div className="create-page-container">
                {/* Header with title and action buttons */}
                <div className="create-header">
                    <h1 className="create-title">{isEditingPost ? 'Edit Draft' : 'Create Post'}</h1>
                    <div className="create-actions">
                        <button 
                            className="btn-action save" 
                            onClick={handleSaveDraft}
                            disabled={publishing || !content.trim() || selectedPages.length === 0}
                        >
                            <IconSave size={14} /> {isEditingPost ? 'Update Draft' : 'Save Draft'}
                        </button>
                        <button 
                            className="btn-action publish" 
                            onClick={handleSubmit}
                            disabled={publishing || !content.trim() || selectedPages.length === 0}
                        >
                            {publishing ? (
                                scheduledTime ? <><IconClock size={14} /> Scheduling...</> : <><IconSend size={14} /> Publishing...</>
                            ) : (
                                scheduledTime ? <><IconClock size={14} /> Schedule</> : <><IconSend size={14} /> Publish</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Error alert */}
                {error && <div className="error-alert">{error}</div>}

                {/* Main content grid - Left: Editor, Right: Preview */}
                <div className="create-main-grid">
                    {/* ===== LEFT COLUMN: EDITOR ===== */}
                    <div className="create-left-column">
                        {/* SECTION 1: COMMON EDITOR */}
                        <div className="composer-card">
                            <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                                    Common Caption (Replicate to all selected platforms)
                                </label>

                                {/* Text Format Toolbar */}
                                <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                                    <button onClick={() => insertText('**', '**')} style={{ padding: '6px 10px', fontSize: 12, background: 'var(--bg-glass)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }} title="Bold">B</button>
                                    <button onClick={() => insertText('_', '_')} style={{ padding: '6px 10px', fontSize: 12, background: 'var(--bg-glass)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 4, cursor: 'pointer', fontStyle: 'italic' }} title="Italic">I</button>
                                    <button onClick={() => insertText('[', '](url)')} style={{ padding: '6px 10px', fontSize: 12, background: 'var(--bg-glass)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 4, cursor: 'pointer' }} title="Link">🔗</button>
                                    <button onClick={() => insertText(' #')} style={{ padding: '6px 10px', fontSize: 12, background: 'var(--bg-glass)', border: '1px solid var(--border)', color: 'var(--accent)', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }} title="Hashtag">#tag</button>
                                    <div style={{ flex: 1 }} />
                                    <button onClick={() => setAiModal({ isOpen: true, type: 'generate' })} style={{ padding: '6px 12px', fontSize: 12, background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }} title="Generate Caption">✨ Generate</button>
                                    <button onClick={() => setAiModal({ isOpen: true, type: 'enhance' })} style={{ padding: '6px 12px', fontSize: 12, background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }} title="Enhance Caption">⚡ Enhance</button>
                                    <button onClick={() => setAiModal({ isOpen: true, type: 'hashtags' })} style={{ padding: '6px 12px', fontSize: 12, background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }} title="Suggest Hashtags">🏷️ Hashtags</button>
                                </div>

                                <textarea 
                                    className="caption-textarea"
                                    value={content}
                                    onChange={e => {
                                        setContent(e.target.value);
                                        // Auto-replicate updates to platformContent
                                        const updated: { [key: string]: string } = {};
                                        selectedPages.forEach(pageId => {
                                            updated[pageId] = e.target.value;
                                        });
                                        setPlatformContent(updated);
                                    }}
                                    placeholder="Write your common caption here..."
                                    rows={5}
                                />
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, textAlign: 'right' }}>
                                    {content.length} characters
                                </div>
                            </div>

                            {/* Platform selector - horizontal pill buttons */}
                            <div className="platforms-section">
                                {loading ? (
                                    <div style={{ textAlign: 'center', padding: '12px 0' }}>
                                        <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                                    </div>
                                ) : pages.length === 0 ? (
                                    <div style={{ padding: '12px 0', fontSize: 13, color: 'var(--text-muted)' }}>
                                        No connected pages. <a href="/accounts" style={{ color: 'var(--accent)' }}>Connect platforms</a>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {pages.map(page => (
                                            <button
                                                key={page.id}
                                                onClick={() => togglePage(page.id)}
                                                className={`platform-pill ${selectedPages.includes(page.id) ? 'active' : ''}`}
                                                title={`${page.pageName} (${page.platform})`}
                                            >
                                                {platformIcon(page.platform)}
                                                <span style={{ fontSize: 12, marginLeft: 4 }}>{page.pageName.substring(0, 15)}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Media upload section */}
                        <div className="composer-card" style={{ marginTop: 20 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 12 }}>
                                Media (optional)
                            </label>
                            
                            {/* Quick image tools */}
                            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                                <button 
                                    onClick={() => setImageModal({ isOpen: true, mode: 'generate' })}
                                    style={{
                                        padding: '8px 14px',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        background: 'var(--accent)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        transition: 'var(--transition)'
                                    }}
                                    onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
                                    onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
                                >
                                    🎨 Generate Image
                                </button>
                                <button 
                                    onClick={() => setImageModal({ isOpen: true, mode: 'search' })}
                                    style={{
                                        padding: '8px 14px',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        background: 'var(--bg-glass)',
                                        color: 'var(--accent)',
                                        border: '1px solid var(--accent)',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        transition: 'var(--transition)'
                                    }}
                                    onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(108, 92, 231, 0.1)')}
                                    onMouseOut={(e) => (e.currentTarget.style.background = 'var(--bg-glass)')}
                                >
                                    🖼️ Stock Photos
                                </button>
                            </div>

                            <div className="media-section">
                                <div
                                    className={`media-upload-zone ${dragOver ? 'drag-over' : ''}`}
                                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*,video/*"
                                        multiple
                                        onChange={e => handleFileUpload(e.target.files)}
                                        style={{ display: 'none' }}
                                    />
                                    {uploading ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                            <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Uploading...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ marginBottom: 6 }}><IconCamera size={24} color="var(--text-muted)" /></div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                                                Add photo or video
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                                or drag and drop
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Media previews */}
                                {mediaFiles.length > 0 && (
                                    <div className="media-grid">
                                        {mediaFiles.map(media => (
                                            <div key={media.id} className="media-preview">
                                                {media.contentType.startsWith('image/') ? (
                                                    <img
                                                        src={media.url}
                                                        alt={media.originalName}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                ) : (
                                                    <div style={{
                                                        width: '100%', height: '100%',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        background: 'var(--bg-glass)',
                                                    }}>
                                                        <IconFilm size={24} color="var(--text-muted)" />
                                                    </div>
                                                )}
                                                <button
                                                    className="media-remove"
                                                    onClick={(e) => { e.stopPropagation(); removeMedia(media.id); }}
                                                    title="Remove"
                                                >
                                                    <IconX size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Schedule & Campaign section */}
                        <div className="composer-card" style={{ marginTop: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                    Schedule:
                                </label>
                                <input
                                    type="datetime-local"
                                    value={scheduledTime}
                                    onChange={(e) => setScheduledTime(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: '8px 12px',
                                        fontSize: 12,
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'var(--bg-glass)',
                                        color: 'var(--text-primary)',
                                        fontFamily: 'inherit',
                                    }}
                                />
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                Leave empty to publish immediately
                            </div>

                            {campaigns.length > 0 && (
                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
                                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, fontWeight: 600 }}>
                                        Campaign (optional)
                                    </label>
                                    <select 
                                        value={selectedCampaign || ''}
                                        onChange={e => setSelectedCampaign(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            fontSize: 12,
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-sm)',
                                            background: 'var(--bg-glass)',
                                            color: 'var(--text-primary)',
                                            fontFamily: 'inherit',
                                        }}
                                    >
                                        <option style={{color:"black"}} value="">No Campaign</option>
                                        {campaigns.map(c => (
                                            <option style={{color:"black"}} key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ===== RIGHT COLUMN: PLATFORM PREVIEWS ===== */}
                    {selectedPages.length > 0 && (
                        <div className="create-right-column">
                            <div className="platform-preview-section">
                                {/* Platform tabs */}
                                <div className="platform-tabs">
                                    {selectedPages.map(pageId => {
                                        const pageInfo = getPageInfo(pageId);
                                        if (!pageInfo) return null;
                                        const isActive = selectedPageForPreview === pageId;
                                        const hasCustom = platformContent[pageId] && platformContent[pageId] !== content;
                                        
                                        return (
                                            <button
                                                key={pageId}
                                                className={`platform-tab ${isActive ? 'active' : ''} ${hasCustom ? 'custom' : ''}`}
                                                onClick={() => setSelectedPageForPreview(pageId)}
                                            >
                                                {platformIcon(pageInfo.platform)}
                                                <span>{pageInfo.pageName.substring(0, 12)}</span>
                                                {hasCustom && <span className="custom-badge">✓</span>}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Active platform preview */}
                                {selectedPageForPreview && getPageInfo(selectedPageForPreview) && (
                                    <div className="platform-preview-container">
                                        <PlatformPreview 
                                            platform={getPageInfo(selectedPageForPreview)!.platform}
                                            pageInfo={getPageInfo(selectedPageForPreview)!}
                                            caption={getCurrentPreviewContent()}
                                            mediaFiles={mediaFiles}
                                            onEdit={() => handleEditPlatform(selectedPageForPreview)}
                                            hasCustomContent={!!platformContent[selectedPageForPreview] && platformContent[selectedPageForPreview] !== content}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Edit Platform Modal */}
                {editingModal.isOpen && editingModal.pageId && (
                    <div className="modal-overlay" onClick={() => setEditingModal({ isOpen: false, pageId: null })}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                                    Customize for {getPageInfo(editingModal.pageId)?.pageName}
                                </h2>
                                <button 
                                    className="modal-close"
                                    onClick={() => setEditingModal({ isOpen: false, pageId: null })}
                                >
                                    <IconX size={18} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <textarea
                                    value={tempEditContent}
                                    onChange={e => setTempEditContent(e.target.value)}
                                    placeholder="Edit caption for this platform..."
                                    rows={8}
                                    style={{
                                        width: '100%',
                                        padding: 12,
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'var(--bg-glass)',
                                        color: 'var(--text-primary)',
                                        fontFamily: 'inherit',
                                        fontSize: 14,
                                        resize: 'vertical',
                                    }}
                                />
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textAlign: 'right' }}>
                                    {tempEditContent.length} characters
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button 
                                    className="btn-modal-cancel"
                                    onClick={() => setEditingModal({ isOpen: false, pageId: null })}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className="btn-modal-save"
                                    onClick={savePlatformContent}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* AI Modal */}
                {aiModal.isOpen && aiModal.type && (
                    <div className="modal-overlay" onClick={() => setAiModal({ isOpen: false, type: null })}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                                    {aiModal.type === 'generate' && '✨ Generate Caption'}
                                    {aiModal.type === 'enhance' && '⚡ Enhance Caption'}
                                    {aiModal.type === 'hashtags' && '🏷️ Suggest Hashtags'}
                                </h2>
                                <button 
                                    className="modal-close"
                                    onClick={() => setAiModal({ isOpen: false, type: null })}
                                >
                                    <IconX size={18} />
                                </button>
                            </div>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {/* Provider Selection */}
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                                        AI Provider
                                    </label>
                                    <select 
                                        value={aiOptions.provider}
                                        onChange={e => {
                                            setAiOptions({ ...aiOptions, provider: e.target.value });
                                            const firstModel = availableModels?.find(m => m.provider === e.target.value);
                                            if (firstModel) setAiOptions(prev => ({ ...prev, model: firstModel.id }));
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-sm)',
                                            background: 'var(--bg-glass)',
                                            color: 'var(--text-primary)',
                                            fontSize: 14,
                                            fontFamily: 'inherit',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {availableModels && availableModels.length > 0 ? (
                                            Array.from(new Set(availableModels.map(m => m.provider))).map(provider => (
                                                <option style={{color:"black"}} key={provider} value={provider}>
                                                    {provider.charAt(0).toUpperCase() + provider.slice(1)}
                                                </option>
                                            ))
                                        ) : (
                                            <option style={{color:"black"}} value="groq">Loading models...</option>
                                        )}
                                    </select>
                                </div>

                                {/* Model Selection */}
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                                        AI Model
                                    </label>
                                    <select 
                                        value={aiOptions.model}
                                        onChange={e => setAiOptions({ ...aiOptions, model: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-sm)',
                                            background: 'var(--bg-glass)',
                                            color: 'var(--text-primary)',
                                            fontSize: 14,
                                            fontFamily: 'inherit',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {availableModels && availableModels.length > 0 ? (
                                            availableModels
                                                .filter(m => m.provider === aiOptions.provider)
                                                .map(m => (
                                                    <option style={{color:"black"}} key={m.id} value={m.id}>
                                                        {m.name}
                                                    </option>
                                                ))
                                        ) : (
                                            <option style={{color:"black"}} value="">No models available</option>
                                        )}
                                    </select>
                                </div>

                                {/* Tone Selection */}
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                                        Tone
                                    </label>
                                    <select 
                                        value={aiOptions.tone}
                                        onChange={e => setAiOptions({ ...aiOptions, tone: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-sm)',
                                            background: 'var(--bg-glass)',
                                            color: 'var(--text-primary)',
                                            fontSize: 14,
                                            fontFamily: 'inherit',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option style={{color:"black"}} value="casual">Casual & Friendly</option>
                                        <option style={{color:"black"}} value="professional">Professional</option>
                                        <option style={{color:"black"}} value="exciting">Exciting & Energetic</option>
                                        <option style={{color:"black"}} value="humorous">Humorous</option>
                                        <option style={{color:"black"}} value="informative">Informative</option>
                                    </select>
                                </div>

                                {/* Length Selection */}
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                                        Length
                                    </label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        {['short', 'medium', 'long'].map(len => (
                                            <button
                                                key={len}
                                                onClick={() => setAiOptions({ ...aiOptions, length: len })}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px 12px',
                                                    border: aiOptions.length === len ? '2px solid var(--accent)' : '1px solid var(--border)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    background: aiOptions.length === len ? 'var(--accent)' : 'var(--bg-glass)',
                                                    color: aiOptions.length === len ? 'white' : 'var(--text-primary)',
                                                    fontSize: 12,
                                                    fontWeight: aiOptions.length === len ? 600 : 500,
                                                    cursor: 'pointer',
                                                    textTransform: 'capitalize'
                                                }}
                                            >
                                                {len}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Custom Prompt */}
                                {(aiModal.type === 'generate' || aiModal.type === 'enhance') && (
                                    <div>
                                        <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                                            Custom Prompt (optional)
                                        </label>
                                        <textarea
                                            value={aiOptions.customPrompt}
                                            onChange={e => setAiOptions({ ...aiOptions, customPrompt: e.target.value })}
                                            placeholder={aiModal.type === 'generate' ? 'E.g., Create a caption about our new product launch...' : 'E.g., Make it more funny and engaging...'}
                                            rows={3}
                                            style={{
                                                width: '100%',
                                                padding: 12,
                                                border: '1px solid var(--border)',
                                                borderRadius: 'var(--radius-sm)',
                                                background: 'var(--bg-glass)',
                                                color: 'var(--text-primary)',
                                                fontFamily: 'inherit',
                                                fontSize: 14,
                                                resize: 'vertical',
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Generated Result Preview */}
                                {isGenerationComplete && (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 12,
                                        padding: 12,
                                        border: '2px solid var(--accent)',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'rgba(108, 92, 231, 0.05)'
                                    }}>
                                        <div>
                                            <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                                Original
                                            </label>
                                            <div style={{
                                                padding: 10,
                                                background: 'var(--bg-glass)',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: 13,
                                                color: 'var(--text-muted)',
                                                lineHeight: 1.5,
                                                minHeight: 60,
                                                maxHeight: 100,
                                                overflow: 'auto'
                                            }}>
                                                {content || '(empty)'}
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                                Generated
                                            </label>
                                            <div style={{
                                                padding: 10,
                                                background: 'var(--bg-glass)',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: 13,
                                                color: 'var(--text-primary)',
                                                lineHeight: 1.5,
                                                minHeight: 60,
                                                maxHeight: 100,
                                                overflow: 'auto',
                                                fontWeight: 500
                                            }}>
                                                {generatedContent}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* RAG Toggle - Only show for Generate and before generation */}
                                {aiModal.type === 'generate' && !isGenerationComplete && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-glass)' }}>
                                        <input
                                            type="checkbox"
                                            id="rag-toggle"
                                            checked={aiOptions.useRag}
                                            onChange={e => setAiOptions({ ...aiOptions, useRag: e.target.checked })}
                                            style={{ cursor: 'pointer', width: 16, height: 16 }}
                                        />
                                        <label htmlFor="rag-toggle" style={{ cursor: 'pointer', flex: 1, margin: 0, fontSize: 13, color: 'var(--text-primary)' }}>
                                            Use Content Library (RAG)
                                        </label>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            📚 Reference brand content
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                {isGenerationComplete ? (
                                    <>
                                        <button 
                                            className="btn-modal-cancel"
                                            onClick={cancelGeneration}
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            className="btn-modal-save"
                                            onClick={handleAiGenerate}
                                            disabled={aiLoading}
                                            style={{ opacity: aiLoading ? 0.6 : 1 }}
                                        >
                                            {aiLoading ? 'Regenerating...' : 'Regenerate'}
                                        </button>
                                        <button 
                                            className="btn-modal-save"
                                            onClick={confirmGeneratedContent}
                                            style={{ background: 'var(--accent)' }}
                                        >
                                            Accept
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button 
                                            className="btn-modal-cancel"
                                            onClick={() => setAiModal({ isOpen: false, type: null })}
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            className="btn-modal-save"
                                            onClick={aiModal.type === 'generate' ? handleAiGenerate : aiModal.type === 'enhance' ? handleAiEnhance : handleAiHashtags}
                                            disabled={aiLoading}
                                            style={{ opacity: aiLoading ? 0.6 : 1 }}
                                        >
                                            {aiLoading ? 'Generating...' : 'Generate'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Image Modal - Generate or Search */}
                {imageModal.isOpen && imageModal.mode && (
                    <div className="modal-overlay" onClick={() => setImageModal({ isOpen: false, mode: null })}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflow: 'auto' }}>
                            <div className="modal-header">
                                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                                    {imageModal.mode === 'generate' ? '🎨 Generate Image' : '🖼️ Search Stock Photos'}
                                </h2>
                                <button 
                                    className="modal-close"
                                    onClick={() => setImageModal({ isOpen: false, mode: null })}
                                >
                                    <IconX size={18} />
                                </button>
                            </div>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {/* Provider & Model Selection - Only for Generate and not showing preview */}
                                {imageModal.mode === 'generate' && !isImageGenerationComplete && (
                                    <>
                                        <div>
                                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                                                Image Provider
                                            </label>
                                            <select 
                                                value={imageProvider}
                                                onChange={e => {
                                                    setImageProvider(e.target.value);
                                                    // Set default model for new provider
                                                    const defaultModel = imageModels.find(m => m.provider === e.target.value);
                                                    if (defaultModel) setImageModel(defaultModel.id);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    background: 'var(--bg-glass)',
                                                    color: 'var(--text-primary)',
                                                    fontSize: 14,
                                                    fontFamily: 'inherit',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {Array.from(new Set(imageModels.map(m => m.provider))).map(provider => (
                                                    <option style={{color:"black"}} key={provider} value={provider}>
                                                        {provider.charAt(0).toUpperCase() + provider.slice(1)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                                                Image Model
                                            </label>
                                            <select 
                                                value={imageModel}
                                                onChange={e => setImageModel(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    background: 'var(--bg-glass)',
                                                    color: 'var(--text-primary)',
                                                    fontSize: 14,
                                                    fontFamily: 'inherit',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {imageModels
                                                    .filter(m => m.provider === imageProvider)
                                                    .map(m => (
                                                        <option style={{color:"black"}} key={m.id} value={m.id}>
                                                            {m.name}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                                                Number of Images
                                            </label>
                                            <select 
                                                value={imageCount}
                                                onChange={e => setImageCount(parseInt(e.target.value))}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    background: 'var(--bg-glass)',
                                                    color: 'var(--text-primary)',
                                                    fontSize: 14,
                                                    fontFamily: 'inherit',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {[1, 2, 3, 4].map(n => (
                                                    <option style={{color:"black"}} key={n} value={n}>{n} {n === 1 ? 'image' : 'images'}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                )}

                                {/* Search/Prompt input - Hide when showing preview */}
                                {!isImageGenerationComplete && (
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                                        {imageModal.mode === 'generate' ? 'Describe the image you want' : 'Search for photos'}
                                    </label>
                                    <input
                                        type="text"
                                        value={imageModal.mode === 'generate' ? imagePrompt : imageSearchQuery}
                                        onChange={e => imageModal.mode === 'generate' ? setImagePrompt(e.target.value) : setImageSearchQuery(e.target.value)}
                                        placeholder={imageModal.mode === 'generate' ? 'E.g., sunset over ocean with palm trees' : 'E.g., coffee, nature, urban'}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            fontSize: 14,
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-sm)',
                                            background: 'var(--bg-glass)',
                                            color: 'var(--text-primary)',
                                            fontFamily: 'inherit'
                                        }}
                                    />
                                </div>
                                )}

                                {/* Results Grid - Only show when complete */}
                                {isImageGenerationComplete && (generatedImages.length > 0 || searchResults.length > 0) && (
                                    <div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 10 }}>
                                            {imageModal.mode === 'generate' ? 'Generated Images' : `Select images (${selectedImages.size} selected)`}
                                        </div>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                            gap: 12
                                        }}>
                                            {(imageModal.mode === 'generate' ? generatedImages : searchResults).map((img, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => imageModal.mode === 'search' && toggleImageSelection(idx)}
                                                    style={{
                                                        cursor: imageModal.mode === 'search' ? 'pointer' : 'default',
                                                        borderRadius: 'var(--radius-sm)',
                                                        overflow: 'hidden',
                                                        border: imageModal.mode === 'search' && selectedImages.has(idx) ? '2px solid var(--accent)' : '1px solid var(--border)',
                                                        transition: 'var(--transition)',
                                                        position: 'relative',
                                                        background: imageModal.mode === 'search' && selectedImages.has(idx) ? 'rgba(108, 92, 231, 0.1)' : 'transparent'
                                                    }}
                                                    onMouseOver={(e) => (e.currentTarget.style.opacity = '0.8')}
                                                    onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
                                                >
                                                    <img 
                                                        src={img.thumbUrl || img.url}
                                                        alt={img.alt || 'image'}
                                                        style={{
                                                            width: '100%',
                                                            aspectRatio: '1',
                                                            objectFit: 'cover'
                                                        }}
                                                    />
                                                    {imageModal.mode === 'search' && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: 8,
                                                            left: 8,
                                                            width: 20,
                                                            height: 20,
                                                            border: '2px solid var(--accent)',
                                                            borderRadius: 4,
                                                            background: selectedImages.has(idx) ? 'var(--accent)' : 'transparent',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            cursor: 'pointer',
                                                            transition: 'var(--transition)'
                                                        }}>
                                                            {selectedImages.has(idx) && <span style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>✓</span>}
                                                        </div>
                                                    )}
                                                    {imageModal.mode === 'search' && img.photographer && (
                                                        <div style={{
                                                            padding: '6px',
                                                            fontSize: 10,
                                                            color: 'var(--text-muted)',
                                                            background: 'var(--bg-glass)',
                                                            textAlign: 'center',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                        }}>
                                                            by {img.photographer}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {/* Stock photos search results (no preview state) */}
                                {imageModal.mode === 'search' && !isImageGenerationComplete && (
                                    <>
                                        {imageLoading && (
                                            <div style={{ 
                                                textAlign: 'center', 
                                                padding: '20px', 
                                                color: 'var(--text-secondary)',
                                                fontSize: 14
                                            }}>
                                                Searching photos...
                                            </div>
                                        )}
                                        {!imageLoading && searchResults.length === 0 && imageSearchQuery.trim() && (
                                            <div style={{ 
                                                textAlign: 'center', 
                                                padding: '20px', 
                                                color: 'var(--text-secondary)',
                                                fontSize: 14
                                            }}>
                                                No photos found
                                            </div>
                                        )}
                                        {searchResults.length > 0 && (
                                            <div>
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 10 }}>
                                                    Select images to add ({selectedImages.size} selected)
                                                </div>
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                                    gap: 12
                                                }}>
                                                    {searchResults.map((img, idx) => (
                                                        <div
                                                            key={idx}
                                                            onClick={() => toggleImageSelection(idx)}
                                                            style={{
                                                                cursor: 'pointer',
                                                                borderRadius: 'var(--radius-sm)',
                                                                overflow: 'hidden',
                                                                border: selectedImages.has(idx) ? '2px solid var(--accent)' : '1px solid var(--border)',
                                                                transition: 'var(--transition)',
                                                                position: 'relative',
                                                                background: selectedImages.has(idx) ? 'rgba(108, 92, 231, 0.1)' : 'transparent'
                                                            }}
                                                            onMouseOver={(e) => (e.currentTarget.style.opacity = '0.8')}
                                                            onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
                                                        >
                                                            <img 
                                                                src={img.thumbUrl || img.url}
                                                                alt={img.alt || 'image'}
                                                                style={{
                                                                    width: '100%',
                                                                    aspectRatio: '1',
                                                                    objectFit: 'cover'
                                                                }}
                                                            />
                                                            <div style={{
                                                                position: 'absolute',
                                                                top: 8,
                                                                left: 8,
                                                                width: 20,
                                                                height: 20,
                                                                border: '2px solid var(--accent)',
                                                                borderRadius: 4,
                                                                background: selectedImages.has(idx) ? 'var(--accent)' : 'transparent',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer',
                                                                transition: 'var(--transition)'
                                                            }}>
                                                                {selectedImages.has(idx) && <span style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>✓</span>}
                                                            </div>
                                                            {img.photographer && (
                                                                <div style={{
                                                                    padding: '6px',
                                                                    fontSize: 10,
                                                                    color: 'var(--text-muted)',
                                                                    background: 'var(--bg-glass)',
                                                                    textAlign: 'center',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                }}>
                                                                    by {img.photographer}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button 
                                    className="btn-modal-cancel"
                                    onClick={() => {
                                        if (isImageGenerationComplete) {
                                            cancelImageGeneration();
                                        } else {
                                            setImageModal({ isOpen: false, mode: null });
                                            setImageSearchQuery('');
                                            setSelectedImages(new Set());
                                            setSearchResults([]);
                                        }
                                    }}
                                >
                                    {isImageGenerationComplete ? 'Discard' : 'Cancel'}
                                </button>
                                {isImageGenerationComplete && imageModal.mode === 'generate' && (
                                    <button 
                                        className="btn-modal-action"
                                        onClick={regenerateImages}
                                        disabled={imageLoading}
                                        style={{ 
                                            opacity: imageLoading ? 0.6 : 1,
                                            background: 'var(--text-secondary)',
                                            color: 'white',
                                            padding: '10px 16px',
                                            border: 'none',
                                            borderRadius: 'var(--radius-sm)',
                                            cursor: 'pointer',
                                            fontSize: 14,
                                            fontWeight: 600
                                        }}
                                    >
                                        {imageLoading ? 'Generating...' : 'Regenerate'}
                                    </button>
                                )}
                                <button 
                                    className={isImageGenerationComplete || imageModal.mode === 'search' ? 'btn-modal-save' : ''}
                                    onClick={
                                        imageModal.mode === 'search' 
                                            ? addSelectedImages
                                            : isImageGenerationComplete 
                                            ? confirmGeneratedImages 
                                            : handleGenerateImage
                                    }
                                    disabled={imageLoading || (imageModal.mode === 'search' && selectedImages.size === 0) || (isImageGenerationComplete && generatedImages.length === 0)}
                                    style={{ 
                                        opacity: (imageLoading || (imageModal.mode === 'search' && selectedImages.size === 0) || (isImageGenerationComplete && generatedImages.length === 0)) ? 0.6 : 1,
                                        ...(isImageGenerationComplete || imageModal.mode === 'search' ? {
                                            background: 'var(--accent)',
                                            color: 'white',
                                            padding: '10px 16px',
                                            border: 'none',
                                            borderRadius: 'var(--radius-sm)',
                                            cursor: 'pointer',
                                            fontSize: 14,
                                            fontWeight: 600
                                        } : {})
                                    }}
                                >
                                    {imageLoading ? 'Loading...' : (
                                        imageModal.mode === 'search' 
                                            ? `Add Selected (${selectedImages.size})`
                                            : isImageGenerationComplete 
                                            ? 'Accept'
                                            : 'Generate'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    );
}

export default function CreatePostPage() {
    return (
        <Suspense fallback={<div className="loading-center"><div className="spinner" /></div>}>
            <CreatePostContent />
        </Suspense>
    );
}

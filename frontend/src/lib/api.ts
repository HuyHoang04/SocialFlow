const API_BASE = '/api';
const NEXT_PUBLIC_UNSPLASH_ACCESS_KEY = process.env.NEXT_PUBLIC_UNPLASH_ACCESS_KEY || '';
const NEXT_PUBLIC_UNSPLASH_SECRET_KEY = process.env.NEXT_PUBLIC_UNSPLASH_SECRET_KEY || '';

function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('sf_token');
}

/**
 * Decode the JWT exp claim (client-side only, no signature verify).
 * Returns true if the token is missing or its exp is in the past.
 */
export function isTokenExpired(): boolean {
    const token = getToken();
    if (!token) return true;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (!payload.exp) return false; // no exp claim — treat as valid
        return Date.now() >= payload.exp * 1000;
    } catch {
        return true; // malformed token
    }
}

/**
 * Get brand roles from JWT token (e.g., { "brandId1": "ADMIN", "brandId2": "MANAGER" })
 */
export function getBrandRolesFromToken(): Record<string, string> | null {
    const token = getToken();
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.brandRoles || null;
    } catch {
        return null;
    }
}

/**
 * Get user's role in a specific brand from token
 */
export function getRoleInBrand(brandId: string): string | null {
    const brandRoles = getBrandRolesFromToken();
    return brandRoles ? brandRoles[brandId] || null : null;
}

/**
 * Check if user is ADMIN in a specific brand from token
 */
export function isAdminInBrand(brandId: string): boolean {
    return getRoleInBrand(brandId) === 'ADMIN';
}

/**
 * Check if user is MANAGER or ADMIN in a specific brand (can manage team)
 */
export function canManageBrand(brandId: string): boolean {
    const role = getRoleInBrand(brandId);
    return role === 'ADMIN' || role === 'MANAGER';
}

export function setToken(token: string) {
    localStorage.setItem('sf_token', token);
}

export function removeToken() {
    localStorage.removeItem('sf_token');
}

export function getUser(): { email: string; name: string; userId: string } | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('sf_user');
    return raw ? JSON.parse(raw) : null;
}

export function setUser(user: { email: string; name: string; userId: string }) {
    localStorage.setItem('sf_user', JSON.stringify(user));
}

export function logout() {
    removeToken();
    localStorage.removeItem('sf_user');
    localStorage.removeItem('sf_selected_brand');
    window.location.href = '/login';
}

/** Shared 401 handler for raw fetch() calls (uploadMedia, ragUploadFile, etc.) */
async function handleFetchResponse(res: Response): Promise<void> {
    if (res.status === 401) {
        logout();
        throw new Error('Unauthorized');
    }
    if (!res.ok) {
        const t = await res.text();
        try {
            const j = JSON.parse(t);
            throw new Error(j.message || j.error || t || res.statusText);
        } catch (e) {
            if (e instanceof SyntaxError) throw new Error(t || res.statusText);
            throw e;
        }
    }
}

async function request(path: string, options: RequestInit = {}) {
    const token = getToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (res.status === 401) {
        logout();
        throw new Error('Unauthorized');
    }
    if (!res.ok) {
        const text = await res.text();
        try {
            const json = JSON.parse(text);
            throw new Error(json.message || json.error || text || res.statusText);
        } catch (e) {
            if (e instanceof SyntaxError) throw new Error(text || res.statusText);
            throw e;
        }
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

// Auth
export const api = {
    register: (data: { name: string; email: string; password: string }) =>
        request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

    login: (data: { email: string; password: string }) =>
        request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

    // Brands
    getBrands: () => request('/brands'),
    createBrand: (data: { name: string; description?: string }) =>
        request('/brands', { method: 'POST', body: JSON.stringify(data) }),
    updateBrand: (id: string, data: { name: string; description?: string; logoUrl?: string }) =>
        request(`/brands/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteBrand: (id: string) => request(`/brands/${id}`, { method: 'DELETE' }),

    // Connections
    getConnections: (brandId: string) => request(`/brands/${brandId}/connections`),
    getOAuthUrl: (platform: string, brandId: string) =>
        request(`/oauth/${platform}/url?brandId=${brandId}`),
    deleteConnection: (id: string) => request(`/connections/${id}`, { method: 'DELETE' }),

    // Pages
    getPages: (connId: string) => request(`/connections/${connId}/pages`),
    getAllPagesForBrand: (brandId: string) => request(`/brands/${brandId}/pages`),

    // Posts
    getPosts: () => request('/posts'),
    getPost: (id: string) => request(`/posts/${id}`),
    getPostsByPage: (pageId: string) => request(`/pages/${pageId}/posts`),
    createPost: (data: { content: string; pageIds: string[]; mediaFilenames?: string[]; scheduledTime?: string; campaignId?: string; platformContent?: { [pageId: string]: string } }) =>
        request('/posts', { method: 'POST', body: JSON.stringify(data) }),
    updatePost: (id: string, data: { content: string; pageIds: string[]; mediaFilenames?: string[]; scheduledTime?: string; campaignId?: string; platformContent?: { [pageId: string]: string } }) =>
        request(`/posts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    publishPost: (id: string) => request(`/posts/${id}/publish`, { method: 'POST' }),
    deletePost: (id: string) => request(`/posts/${id}`, { method: 'DELETE' }),

    getBrandConnections: (brandId: string) => request(`/brands/${brandId}/connections`),

    // Facebook SDK connect (sends token from FB.login popup)
    facebookConnect: (data: { accessToken: string; brandId: string }) =>
        request('/oauth/facebook/connect', { method: 'POST', body: JSON.stringify(data) }),

    // Bluesky connect (handle + app password, no OAuth)
    blueskyConnect: (data: { handle: string; appPassword: string; brandId: string }) =>
        request('/oauth/bluesky/connect', { method: 'POST', body: JSON.stringify(data) }),

    // Media upload
    uploadMedia: async (file: File) => {
        const token = getToken();
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE}/media/upload`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
        });
        await handleFetchResponse(res);
        return res.json();
    },

    getMedia: () => request('/media'),
    deleteMedia: (id: string) => request(`/media/${id}`, { method: 'DELETE' }),

    // Campaigns
    getCampaigns: (brandId: string) => request(`/brands/${brandId}/campaigns`),
    createCampaign: (brandId: string, data: { name: string; description?: string; startDate?: string; endDate?: string }) =>
        request(`/brands/${brandId}/campaigns`, { method: 'POST', body: JSON.stringify(data) }),
    deleteCampaign: (id: string) => request(`/campaigns/${id}`, { method: 'DELETE' }),

    // Inbox
    syncInbox: (brandId: string) => request(`/brands/${brandId}/inbox/sync`, { method: 'POST' }),
    getInbox: (brandId: string) => request(`/brands/${brandId}/inbox`),
    replyToInboxMessage: (id: string, content: string) => request(`/inbox/${id}/reply`, { method: 'POST', body: JSON.stringify({ content }) }),
    markInboxMessageRead: (id: string) => request(`/inbox/${id}/read`, { method: 'PUT' }),
    getAiReplySuggestion: (id: string) => request(`/inbox/${id}/suggest-reply`),

    // Analytics
    syncAnalytics: (brandId: string) => request(`/analytics/brands/${brandId}/sync`, { method: 'POST' }),
    syncPostAnalytics: (brandId: string) => request(`/analytics/brands/${brandId}/sync/posts`, { method: 'POST' }),
    syncPageAnalytics: (brandId: string) => request(`/analytics/brands/${brandId}/sync/pages`, { method: 'POST' }),
    getAnalyticsOverview: (brandId: string) => request(`/analytics/brands/${brandId}/overview`),
    getPostAnalyticsByBrand: (brandId: string) => request(`/analytics/brands/${brandId}/posts`),
    getPostAnalytics: (postId: string) => request(`/analytics/posts/${postId}`),
    getPostAnalyticsHistory: (postId: string) => request(`/analytics/posts/${postId}/history`),
    getPageAnalytics: (pageId: string) => request(`/analytics/pages/${pageId}`),
    getPageAnalyticsHistory: (pageId: string) => request(`/analytics/pages/${pageId}/history`),

    // ============= AI SERVICE ENDPOINTS =============

    // AI Models
    getModels: () => request('/ai/models'),
    getImageModels: () => request('/ai/models/image'),
    getRagModels: () => request('/ai/models/embedding'),
    refreshModels: () => request('/ai/refresh-models', { method: 'POST' }),

    // Text Generation
    generateContent: (data: {
        brand_id: string;
        prompt: string;
        provider?: string;
        model?: string;
        tone?: string;
        platform?: string;
        max_words?: number;
    }) => request('/ai/generate-content', { method: 'POST', body: JSON.stringify(data) }),

    // Content Rewrite
    rewriteContent: (data: {
        brand_id: string;
        content: string;
        tone: string;
        provider?: string;
        model?: string;
        platform?: string;
        max_words?: number;
    }) => request('/ai/rewrite', { method: 'POST', body: JSON.stringify(data) }),

    // Keyword Optimization
    optimizeKeywords: (data: {
        brand_id: string;
        content: string;
        keywords?: string[];
        platform?: string;
        max_hashtags?: number;
        provider?: string;
        model?: string;
        max_words?: number;
    }) => request('/ai/keyword-optimize', { method: 'POST', body: JSON.stringify(data) }),

    // Image Generation
    generateImage: async (data: {
        brand_id: string;
        prompt: string;
        provider?: string;
        model?: string;
        style?: string;
        platform?: string;
        width?: number;
        height?: number;
        count?: number;
    }) => request('/ai/generate-image', { method: 'POST', body: JSON.stringify(data) }),

    // Stock Photos Search (Unsplash API)
    searchStockPhotos: async (query: string, count: number = 6) => {
        const unsplashKey = NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
        console.log('🔑 Unsplash Key loaded:', unsplashKey ? `${unsplashKey.slice(0, 8)}...` : 'EMPTY');
        const response = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&client_id=${unsplashKey}`
        );
        console.log('📊 Response status:', response.status, response.statusText);
        if (!response.ok) throw new Error(`Failed to search stock photos (${response.status})`);
        const data = await response.json();
        return data.results.map((photo: any) => ({
            id: photo.id,
            url: photo.urls.regular,
            thumbUrl: photo.urls.thumb,
            alt: photo.alt_description,
            photographer: photo.user.name,
            downloadLink: photo.links.download_location
        }));
    },

    // ============= RAG ENDPOINTS (Retrieval-Augmented Generation) =============

    // RAG Status
    ragGetStatus: (brandId: string) => {
        console.log('📊 API: ragGetStatus called | brandId:', brandId);
        const url = `/ai/rag/status?brand_id=${brandId}`;
        console.log('🔗 Request URL:', url);
        return request(url);
    },

    // Content Library - Upload
    ragUploadFile: async (brandId: string, file: File, category?: string, provider?: string, model?: string) => {
        console.log('📤 API: ragUploadFile called | brandId:', brandId, 'file:', file.name, 'category:', category, 'provider:', provider, 'model:', model);
        const token = getToken();
        const formData = new FormData();
        formData.append('brand_id', brandId);
        formData.append('file', file);
        if (category) formData.append('category', category);
        if (provider) formData.append('provider', provider);
        if (model) formData.append('model', model);

        const res = await fetch(`${API_BASE}/ai/rag/upload`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
        });
        await handleFetchResponse(res);
        const result = await res.json();
        console.log('✓ Upload successful:', result);
        return result;
    },

    // Content Library - List files
    ragListLibrary: (brandId: string, limit?: number, offset?: number) => {
        console.log('📚 API: ragListLibrary called | brandId:', brandId, 'limit:', limit, 'offset:', offset);
        const params = new URLSearchParams({ brand_id: brandId });
        if (limit) params.append('limit', limit.toString());
        if (offset) params.append('offset', offset.toString());
        const url = `/ai/rag/library?${params}`;
        console.log('🔗 Request URL:', url);
        return request(url);
    },

    // Content Library - Search
    ragSearch: (data: {
        brand_id: string;
        query: string;
        limit?: number;
        threshold?: number;
        model?: string;
    }) => request('/ai/rag/search', { method: 'POST', body: JSON.stringify(data) }),

    // Content Library - Delete file
    ragDeleteFile: (brandId: string, libraryId: string) => {
        console.log('🗑️ API: ragDeleteFile called | brandId:', brandId, 'libraryId:', libraryId);
        const url = `/ai/rag/delete/${libraryId}?brand_id=${brandId}`;
        console.log('🔗 Request URL:', url);
        return request(url, { method: 'DELETE' });
    },

    // RAG + Content Generation
    ragGenerateContent: (data: {
        brand_id: string;
        prompt: string;
        rag_query?: string;
        rag_limit?: number;
        rag_threshold?: number;
        provider?: string;
        model?: string;
        tone?: string;
    }) => request('/ai/rag/generate-content', { method: 'POST', body: JSON.stringify(data) }),

    // RAG + Content Generation with Images
    ragGenerateContentWithImages: (data: {
        brand_id: string;
        prompt: string;
        rag_query?: string;
        rag_limit?: number;
        rag_threshold?: number;
        provider?: string;
        model?: string;
        tone?: string;
        image_model?: string;
    }) => request('/ai/rag/generate-with-images', { method: 'POST', body: JSON.stringify(data) }),

    // ============= TRENDING ENDPOINTS =============

    getTrendingSearches: (data: { brand_id: string }) =>
        request('/trending/google/search', { method: 'POST', body: JSON.stringify(data) }),

    refreshTrendingSearches: (data: { brand_id: string }) =>
        request('/trending/google/search/refresh', { method: 'POST', body: JSON.stringify(data) }),

    searchFacebookTrending: (data: { brand_id: string }) =>
        request('/trending/facebook/search', { method: 'POST', body: JSON.stringify(data) }),

    refreshFacebookTrending: (data: { brand_id: string }) =>
        request('/trending/facebook/search/refresh', { method: 'POST', body: JSON.stringify(data) }),

    searchBlueskyTrending: (data: { brand_id: string }) =>
        request('/trending/bluesky/search', { method: 'POST', body: JSON.stringify(data) }),

    refreshBlueskyTrending: (data: { brand_id: string }) =>
        request('/trending/bluesky/search/refresh', { method: 'POST', body: JSON.stringify(data) }),

    // ============= CHAT ENDPOINTS =============
    sendChatMessage: (data: {
        brand_id: string;
        user_id: string;
        session_id: string;
        message: string;
        context_data?: string;
        provider?: string;
        model?: string;
    }) => request('/ai/chat/send', { method: 'POST', body: JSON.stringify(data) }),

    getChatSessions: (brandId: string) => request(`/ai/chat/sessions?brandId=${brandId}`),
    getChatHistory: (sessionId: string) => request(`/ai/chat/history/${sessionId}`),
    deleteChatSession: (sessionId: string) => request(`/ai/chat/session/${sessionId}`, { method: 'DELETE' }),

    // AI Config
    getAiConfig: (brandId: string) => request(`/ai/config?brand_id=${brandId}`),
    updateAiConfig: (brandId: string, data: {
        text_provider?: string;
        text_model?: string;
        image_provider?: string;
        image_model?: string;
        embedding_provider?: string;
        embedding_model?: string;
    }) => request('/ai/config', { method: 'POST', body: JSON.stringify({ ...data, brand_id: brandId }) }),

    cleanupTrendingData: () => request('/trending/cleanup', { method: 'POST' }),

    // ── Trending Config (upsert: 1 per brand per source) ──────────────────

    /** Save / upsert config for a brand+source. */
    saveTrendingConfig: (data: {
        brandId: string;
        geo: string;
        source: string;         // 'google' | 'facebook'
        categoryId?: string;    // Google Trends category
        searchKeyword?: string; // Facebook keyword
    }) => request('/trending/config', { method: 'POST', body: JSON.stringify(data) }),

    /** Get config for a specific brand + source. */
    getTrendingConfig: (brandId: string, source: string) =>
        request(`/trending/config/${brandId}/${source}`),

    /** Get all configs for a brand (one per source). */
    getTrendingConfigsByBrand: (brandId: string) =>
        request(`/trending/config/${brandId}`),

    /** Delete a config by id. */
    deleteTrendingConfig: (id: number) =>
        request(`/trending/config/${id}`, { method: 'DELETE' }),

    // ============= TEAM & RBAC ENDPOINTS =============

    // Team Members
    getTeamMembers: (brandId: string) =>
        request(`/brands/${brandId}/team`),

    addTeamMember: (brandId: string, email: string, role: string) =>
        request(`/brands/${brandId}/team`, {
            method: 'POST',
            body: JSON.stringify({ email, role })
        }),

    updateTeamMemberRole: (brandId: string, userId: string, role: string) =>
        request(`/brands/${brandId}/team/${userId}`, {
            method: 'PATCH',
            body: JSON.stringify({ role })
        }),

    removeTeamMember: (brandId: string, userId: string) =>
        request(`/brands/${brandId}/team/${userId}`, { method: 'DELETE' }),

    // Invitations
    createInvitation: (brandId: string, email: string, role: string) =>
        request(`/brands/${brandId}/invitations`, {
            method: 'POST',
            body: JSON.stringify({ email, role })
        }),

    getPendingInvitations: (brandId: string) =>
        request(`/brands/${brandId}/invitations`),

    getInvitationByToken: (token: string) =>
        request(`/invitations/token/${token}`),

    acceptInvitation: (token: string) =>
        request(`/invitations/token/${token}/accept`, {
            method: 'POST',
            body: JSON.stringify({})
        }),

    cancelInvitation: (invitationId: string) =>
        request(`/invitations/${invitationId}`, { method: 'DELETE' }),

    // Approval Workflow
    getWorkflowConfig: (brandId: string) =>
        request(`/brands/${brandId}/workflow-config`),

    updateWorkflowConfig: (brandId: string, enabled: boolean, approvalLevels: number) =>
        request(`/brands/${brandId}/workflow-config`, {
            method: 'PUT',
            body: JSON.stringify({ enabled, approvalLevels })
        }),

    submitForApproval: (postId: string, assignedToUserId: string) =>
        request(`/posts/${postId}/submit-approval`, {
            method: 'POST',
            body: JSON.stringify({ assignedToUserId })
        }),

    getPendingApprovals: (userId: string, brandId: string) =>
        request(`/approvals/user/${userId}/brand/${brandId}`),

    getAllApprovals: (userId: string, brandId: string) =>
        request(`/approvals/user/${userId}/brand/${brandId}/kanban`),

    getPostApprovals: (postId: string) =>
        request(`/approvals/post/${postId}`),

    approvePost: (approvalId: string, comment?: string) =>
        request(`/approvals/${approvalId}/approve`, {
            method: 'POST',
            body: JSON.stringify({ comment })
        }),

    rejectPost: (approvalId: string, comment: string) =>
        request(`/approvals/${approvalId}/reject`, {
            method: 'POST',
            body: JSON.stringify({ comment })
        }),
};

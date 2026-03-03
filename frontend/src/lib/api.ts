const API_BASE = '/api';

function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('sf_token');
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
    window.location.href = '/login';
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
        const err = await res.text();
        throw new Error(err || res.statusText);
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
    createPost: (data: { content: string; pageIds: string[]; mediaIds?: string[]; scheduledTime?: string; campaignId?: string }) =>
        request('/posts', { method: 'POST', body: JSON.stringify(data) }),
    publishPost: (id: string) => request(`/posts/${id}/publish`, { method: 'POST' }),
    deletePost: (id: string) => request(`/posts/${id}`, { method: 'DELETE' }),

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
        if (!res.ok) {
            const err = await res.text();
            throw new Error(err || res.statusText);
        }
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
};

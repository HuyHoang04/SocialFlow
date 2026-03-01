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
    return res.json();
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
    createPost: (data: { content: string; pageIds: string[] }) =>
        request('/posts', { method: 'POST', body: JSON.stringify(data) }),
    publishPost: (id: string) => request(`/posts/${id}/publish`, { method: 'POST' }),
    deletePost: (id: string) => request(`/posts/${id}`, { method: 'DELETE' }),

    // Facebook SDK connect (sends token from FB.login popup)
    facebookConnect: (data: { accessToken: string; brandId: string }) =>
        request('/oauth/facebook/connect', { method: 'POST', body: JSON.stringify(data) }),

    // Bluesky connect (handle + app password, no OAuth)
    blueskyConnect: (data: { handle: string; appPassword: string; brandId: string }) =>
        request('/oauth/bluesky/connect', { method: 'POST', body: JSON.stringify(data) }),
};

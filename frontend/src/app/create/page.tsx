'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AppShell from '@/components/AppShell';

interface PageItem {
    id: string;
    pageName: string;
    platform: string;
    connectionName: string;
    platformPageId: string;
}

interface Brand {
    id: string;
    name: string;
}

export default function CreatePostPage() {
    const router = useRouter();
    const [brands, setBrands] = useState<Brand[]>([]);
    const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
    const [pages, setPages] = useState<PageItem[]>([]);
    const [selectedPages, setSelectedPages] = useState<string[]>([]);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState('');

    const loadBrands = useCallback(async () => {
        const b = await api.getBrands();
        setBrands(b);
        if (b.length > 0) setSelectedBrand(b[0].id);
    }, []);

    useEffect(() => { loadBrands(); }, [loadBrands]);

    useEffect(() => {
        if (!selectedBrand) return;
        setLoading(true);
        api.getAllPagesForBrand(selectedBrand)
            .then(p => { setPages(p); setSelectedPages([]); })
            .finally(() => setLoading(false));
    }, [selectedBrand]);

    const togglePage = (id: string) => {
        setSelectedPages(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const platformIcon = (p: string) => {
        switch (p) {
            case 'FACEBOOK': return '📘';
            case 'TWITTER': return '✖️';
            case 'LINKEDIN': return '💼';
            default: return '🌐';
        }
    };

    const handlePublish = async () => {
        if (!content.trim()) return setError('Please enter post content');
        if (selectedPages.length === 0) return setError('Please select at least one page');
        setError('');
        setPublishing(true);
        try {
            const posts = await api.createPost({ content, pageIds: selectedPages });
            await Promise.all(posts.map((p: { id: string }) => api.publishPost(p.id)));
            router.push('/');
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
            await api.createPost({ content, pageIds: selectedPages });
            router.push('/');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Save failed');
        }
    };

    return (
        <AppShell>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Create Post</h1>
                    <p className="page-subtitle">Write once, publish everywhere</p>
                </div>
            </div>

            {error && <div className="error-msg">{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32 }}>
                {/* Left: Content */}
                <div>
                    <div className="form-group">
                        <label className="form-label">Content</label>
                        <textarea className="form-textarea" rows={8} value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder="What do you want to share?" />
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                            {content.length} characters
                            {content.length > 280 && <span style={{ color: 'var(--warning)' }}> (may be truncated on X/Twitter)</span>}
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                        <button className="btn btn-primary btn-lg" onClick={handlePublish} disabled={publishing}>
                            {publishing ? '🚀 Publishing...' : '🚀 Publish Now'}
                        </button>
                        <button className="btn btn-secondary btn-lg" onClick={handleSaveDraft}>
                            💾 Save Draft
                        </button>
                    </div>
                </div>

                {/* Right: Platform Selector */}
                <div>
                    <div className="form-group">
                        <label className="form-label">Brand</label>
                        <select className="form-input" value={selectedBrand || ''}
                            onChange={e => setSelectedBrand(e.target.value)}>
                            {brands.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Publish To</label>
                        {loading ? (
                            <div className="loading-center"><div className="spinner" /></div>
                        ) : pages.length === 0 ? (
                            <div className="empty-state" style={{ padding: 24 }}>
                                <div className="empty-state-text">No connected pages. Go to Accounts to connect platforms.</div>
                            </div>
                        ) : (
                            <div className="platform-list">
                                {pages.map(page => (
                                    <label key={page.id}
                                        className={`platform-option ${selectedPages.includes(page.id) ? 'selected' : ''}`}>
                                        <input type="checkbox" checked={selectedPages.includes(page.id)}
                                            onChange={() => togglePage(page.id)} />
                                        <span>{platformIcon(page.platform)}</span>
                                        <div>
                                            <div className="platform-option-name">{page.pageName}</div>
                                            <div className="platform-option-page">{page.platform} · {page.connectionName}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppShell>
    );
}

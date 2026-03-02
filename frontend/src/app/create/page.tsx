'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
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

interface UploadedMedia {
    id: string;
    url: string;
    contentType: string;
    originalName: string;
    fileSize: number;
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
    const [scheduledTime, setScheduledTime] = useState('');

    // Campaigns state
    const [campaigns, setCampaigns] = useState<{ id: string, name: string }[]>([]);
    const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);

    // Media state
    const [mediaFiles, setMediaFiles] = useState<UploadedMedia[]>([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);

    const loadBrands = useCallback(async () => {
        const b = await api.getBrands();
        setBrands(b);
        if (b.length > 0) setSelectedBrand(b[0].id);
    }, []);

    useEffect(() => { loadBrands(); }, [loadBrands]);

    useEffect(() => {
        if (!selectedBrand) return;
        setLoading(true);
        Promise.all([
            api.getAllPagesForBrand(selectedBrand).then(p => { setPages(p); setSelectedPages([]); }),
            api.getCampaigns(selectedBrand).then(c => { setCampaigns(c); setSelectedCampaign(''); })
        ]).finally(() => setLoading(false));
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
            case 'BLUESKY': return '🦋';
            case 'THREADS': return '🧵';
            default: return '🌐';
        }
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
            const posts = await api.createPost({
                content,
                pageIds: selectedPages,
                mediaIds: mediaFiles.map(m => m.id),
                scheduledTime: ISOStringTime,
                campaignId: selectedCampaign || undefined
            });

            // If not scheduled, publish immediately
            if (!ISOStringTime) {
                await Promise.all(posts.map((p: { id: string }) => api.publishPost(p.id)));
            }
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
            await api.createPost({
                content,
                pageIds: selectedPages,
                mediaIds: mediaFiles.map(m => m.id),
                campaignId: selectedCampaign || undefined
            });
            router.push('/');
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
            <div className="page-header">
                <div>
                    <h1 className="page-title">Create Post</h1>
                    <p className="page-subtitle">Write once, publish everywhere</p>
                </div>
            </div>

            {error && <div className="error-msg">{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32 }}>
                {/* Left: Content + Media */}
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

                    {/* Schedule Picker Area */}
                    <div className="form-group">
                        <label className="form-label">Schedule Post (optional)</label>
                        <input
                            type="datetime-local"
                            className="form-input"
                            style={{ maxWidth: 250 }}
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                        />
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                            Leave empty to publish immediately.
                        </p>
                    </div>

                    {/* Media Upload Area */}
                    <div className="form-group">
                        <label className="form-label">Media (optional)</label>
                        <div
                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
                                borderRadius: 'var(--radius)',
                                padding: '28px 20px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'var(--transition)',
                                background: dragOver ? 'rgba(99,102,241,0.08)' : 'var(--bg-glass)',
                            }}
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
                                    <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                                    <span style={{ color: 'var(--text-muted)' }}>Uploading...</span>
                                </div>
                            ) : (
                                <>
                                    <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                                        Drop files here or click to browse
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                        Images (JPG, PNG, GIF) and Videos (MP4, MOV) up to 50MB
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Media Previews */}
                        {mediaFiles.length > 0 && (
                            <div style={{
                                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                gap: 12, marginTop: 16,
                            }}>
                                {mediaFiles.map(media => (
                                    <div key={media.id} style={{
                                        position: 'relative',
                                        borderRadius: 'var(--radius-sm)',
                                        overflow: 'hidden',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-card)',
                                    }}>
                                        {media.contentType.startsWith('image/') ? (
                                            <img
                                                src={media.url}
                                                alt={media.originalName}
                                                style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
                                            />
                                        ) : (
                                            <div style={{
                                                width: '100%', height: 120,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: 'var(--bg-glass)',
                                            }}>
                                                <span style={{ fontSize: 36 }}>🎬</span>
                                            </div>
                                        )}
                                        <div style={{ padding: '6px 8px' }}>
                                            <div style={{
                                                fontSize: 11, fontWeight: 600, color: 'var(--text-primary)',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}>
                                                {media.originalName}
                                            </div>
                                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                                {formatFileSize(media.fileSize)}
                                            </div>
                                        </div>
                                        {/* Remove button */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeMedia(media.id); }}
                                            style={{
                                                position: 'absolute', top: 4, right: 4,
                                                width: 24, height: 24, borderRadius: '50%',
                                                background: 'rgba(0,0,0,0.6)', border: 'none',
                                                color: 'white', fontSize: 14, cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                        <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={publishing}>
                            {publishing
                                ? (scheduledTime ? '⏳ Scheduling...' : '🚀 Publishing...')
                                : (scheduledTime ? '⏳ Schedule Post' : '🚀 Publish Now')}
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
                        <label className="form-label">Campaign (optional)</label>
                        <select className="form-input" value={selectedCampaign || ''}
                            onChange={e => setSelectedCampaign(e.target.value)}
                            disabled={campaigns.length === 0}>
                            <option value="">No Campaign</option>
                            {campaigns.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
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

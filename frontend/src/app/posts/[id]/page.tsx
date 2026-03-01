'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AppShell from '@/components/AppShell';

interface PublishResult {
    id: string;
    platformPostId: string;
    platformPostUrl: string;
    success: boolean;
    errorMessage: string | null;
    createdAt: string;
}

interface Post {
    id: string;
    content: string;
    status: string;
    createdAt: string;
    publishedAt: string | null;
    page: { id: string; pageName: string; platform: string; brandName: string };
    mediaFiles: { id: string; url: string; contentType: string; originalName: string }[];
    publishResults: PublishResult[];
}

export default function PostDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const p = await api.getPost(id);
            setPost(p);
        } catch { router.push('/'); }
        setLoading(false);
    }, [id, router]);

    useEffect(() => { load(); }, [load]);

    const publish = async () => {
        if (!post) return;
        await api.publishPost(post.id);
        load();
    };

    const deletePost = async () => {
        if (!post || !confirm('Delete this post?')) return;
        await api.deletePost(post.id);
        router.push('/');
    };

    const platformIcon = (p: string) => {
        switch (p) { case 'FACEBOOK': return '📘'; case 'TWITTER': return '✖️'; case 'LINKEDIN': return '💼'; case 'BLUESKY': return '🦋'; case 'THREADS': return '🧵'; default: return '🌐'; }
    };

    const badgeClass = (s: string) => {
        switch (s) {
            case 'DRAFT': return 'badge badge-draft';
            case 'PUBLISHING': return 'badge badge-publishing';
            case 'PUBLISHED': return 'badge badge-published';
            case 'FAILED': return 'badge badge-failed';
            default: return 'badge';
        }
    };

    if (loading) return <AppShell><div className="loading-center"><div className="spinner" /></div></AppShell>;
    if (!post) return null;

    return (
        <AppShell>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Post Detail</h1>
                    <p className="page-subtitle">
                        {platformIcon(post.page.platform)} {post.page.pageName} · {post.page.brandName}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {post.status === 'DRAFT' && (
                        <button className="btn btn-primary" onClick={publish}>🚀 Publish</button>
                    )}
                    {post.status === 'FAILED' && (
                        <button className="btn btn-primary" onClick={publish}>🔄 Retry</button>
                    )}
                    <button className="btn btn-danger" onClick={deletePost}>🗑️ Delete</button>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span className={badgeClass(post.status)}>{post.status}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        Created: {new Date(post.createdAt).toLocaleString('vi-VN')}
                        {post.publishedAt && ` · Published: ${new Date(post.publishedAt).toLocaleString('vi-VN')}`}
                    </span>
                </div>
                <p style={{ fontSize: 15, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{post.content}</p>

                {/* Media Attachments */}
                {post.mediaFiles && post.mediaFiles.length > 0 && (
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: 12, marginTop: 16, paddingTop: 16,
                        borderTop: '1px solid var(--border)',
                    }}>
                        {post.mediaFiles.map(m => (
                            <div key={m.id} style={{
                                borderRadius: 'var(--radius-sm)', overflow: 'hidden',
                                border: '1px solid var(--border)',
                            }}>
                                {m.contentType.startsWith('image/') ? (
                                    <img src={m.url} alt={m.originalName}
                                        style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                                ) : m.contentType.startsWith('video/') ? (
                                    <video src={m.url} controls
                                        style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                                ) : null}
                                <div style={{ padding: '6px 8px', fontSize: 11, color: 'var(--text-muted)' }}>
                                    {m.originalName}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {post.publishResults.length > 0 && (
                <>
                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Publish Results</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {post.publishResults.map(r => (
                            <div key={r.id} className={`result-item ${r.success ? 'result-success' : 'result-failed'}`}>
                                <span style={{ fontSize: 24 }}>{r.success ? '✅' : '❌'}</span>
                                <div style={{ flex: 1 }}>
                                    {r.success ? (
                                        <>
                                            <div style={{ fontWeight: 600, marginBottom: 4 }}>Published successfully</div>
                                            {r.platformPostUrl && (
                                                <a href={r.platformPostUrl} target="_blank" rel="noopener noreferrer"
                                                    style={{ fontSize: 13, color: 'var(--accent-light)' }}>
                                                    🔗 View on platform →
                                                </a>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ fontWeight: 600, color: 'var(--error)', marginBottom: 4 }}>
                                                Publish failed
                                            </div>
                                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                                {r.errorMessage || 'Unknown error'}
                                            </div>
                                        </>
                                    )}
                                </div>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    {new Date(r.createdAt).toLocaleString('vi-VN')}
                                </span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </AppShell>
    );
}

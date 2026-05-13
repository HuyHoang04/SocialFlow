'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AppShell from '@/components/AppShell';
import {
    PlatformIcon, IconSend, IconRefreshCw, IconTrash, IconTarget,
    IconCheckCircle, IconX, IconLink,
} from '@/components/Icons';

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
    scheduledTime: string | null;
    campaignName?: string;
    page: { id: string; pageName: string; platform: string; brandName: string };
    mediaFiles: { id: string; url: string; contentType: string; originalName: string }[];
    publishResults: PublishResult[];
}

function getMediaUrl(url: string) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    // Fallback for local uploads (pre-Cloudinary)
    // Extract filename from path (e.g., "uploads/abc.png" -> "abc.png")
    const filename = url.split('/').pop();
    return `http://localhost:8080/api/media/${filename}`;
}

export default function PostDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCurrentUserAdminOrManager, setIsCurrentUserAdminOrManager] = useState(false);
    const [workflowConfig, setWorkflowConfig] = useState<any>(null);

    const load = useCallback(async () => {
        try {
            const p = await api.getPost(id);
            console.log('Post data loaded in detail page:', p);
            console.log('Media files in post:', p.mediaFiles);
            setPost(p);

            // Check permissions and workflow if brandId is available
            const brandId = (p.page as any).brandId;
            if (brandId) {
                const token = typeof window !== 'undefined' ? localStorage.getItem('sf_token') : null;
                let currentUserId: string | null = null;
                if (token) {
                    try {
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        currentUserId = payload.sub || payload.userId || payload.id;
                    } catch (e) {
                        console.error('Failed to decode token:', e);
                    }
                }

                try {
                    const [config, members] = await Promise.all([
                        api.getWorkflowConfig(brandId),
                        api.getTeamMembers(brandId)
                    ]);

                    setWorkflowConfig(config);

                    if (currentUserId) {
                        const currentUserMember = members.find((m: any) => m.email === currentUserId || m.userId === currentUserId);
                        if (currentUserMember) {
                            const role = currentUserMember.role;
                            const isPrivileged = role === 'ADMIN' || role === 'MANAGER';
                            setIsCurrentUserAdminOrManager(isPrivileged);
                            console.log(`Current user role: ${role}, isPrivileged: ${isPrivileged}`);
                        }
                    }
                } catch (err) {
                    console.warn('Failed to load workflow config or team members:', err);
                }
            }
        } catch (err) { 
            console.error('Failed to load post:', err);
            router.push('/dashboard'); 
        }
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
        router.push('/dashboard');
    };

    const platformIcon = (p: string) => {
        return <PlatformIcon platform={p} size={18} />;
    };

    const badgeClass = (s: string) => {
        switch (s) {
            case 'DRAFT': return 'badge badge-draft';
            case 'SCHEDULED': return 'badge badge-scheduled';
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
                    <p className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {platformIcon(post.page.platform)} {post.page.pageName} · {post.page.brandName}
                        {post.campaignName && <> · <IconTarget size={14} /> Campaign: {post.campaignName}</>}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {/* If workflow enabled and user is NOT Admin/Manager, show Submit for Approval instead of Publish */}
                    {post.status === 'DRAFT' && workflowConfig?.enabled && !isCurrentUserAdminOrManager ? (
                        <button className="btn btn-primary" onClick={async () => {
                            try {
                                const brandId = (post.page as any).brandId;
                                const members = await api.getTeamMembers(brandId);
                                const approver = members.find((m: any) => m.role === 'ADMIN' || m.role === 'MANAGER');
                                if (approver) {
                                    await api.submitForApproval(post.id, approver.userId);
                                    alert('Submitted for approval!');
                                    load(); // Reload post
                                } else {
                                    alert('No Admin or Manager found to assign approval!');
                                }
                            } catch (err) {
                                console.error('Failed to submit for approval:', err);
                                alert('Failed to submit for approval');
                            }
                        }}>
                            <IconSend size={16} /> Submit for Approval
                        </button>
                    ) : (
                        <>
                            {(post.status === 'DRAFT' || post.status === 'SCHEDULED') && (
                                <button className="btn btn-primary" onClick={publish}><IconSend size={16} /> Publish Now</button>
                            )}
                            {post.status === 'FAILED' && (
                                <button className="btn btn-primary" onClick={publish}><IconRefreshCw size={16} /> Retry</button>
                            )}
                        </>
                    )}
                    <button className="btn btn-secondary" onClick={() => router.push(`/create?postId=${post.id}`)}>
                        Edit
                    </button>
                    <button className="btn btn-danger" onClick={deletePost}><IconTrash size={16} /> Delete</button>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span className={badgeClass(post.status)}>{post.status}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        Created: {new Date(post.createdAt).toLocaleString('vi-VN')}
                        {post.scheduledTime && ` · Scheduled for: ${new Date(post.scheduledTime).toLocaleString('vi-VN')}`}
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
                                    <img src={getMediaUrl(m.url)} alt={m.originalName}
                                        style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                                ) : m.contentType.startsWith('video/') ? (
                                    <video src={getMediaUrl(m.url)} controls
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
                                <span style={{ fontSize: 24 }}>{r.success ? <IconCheckCircle size={24} color="var(--success)" /> : <IconX size={24} color="var(--error)" />}</span>
                                <div style={{ flex: 1 }}>
                                    {r.success ? (
                                        <>
                                            <div style={{ fontWeight: 600, marginBottom: 4 }}>Published successfully</div>
                                            {r.platformPostUrl && (
                                                <a href={r.platformPostUrl} target="_blank" rel="noopener noreferrer"
                                                    style={{ fontSize: 13, color: 'var(--accent-light)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <IconLink size={13} /> View on platform →
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

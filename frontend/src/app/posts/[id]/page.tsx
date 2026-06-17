'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AppShell from '@/components/AppShell';
import { useToast } from '@/components/Toast';
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
    groupId?: string;
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
    const { toast } = useToast();
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCurrentUserAdminOrManager, setIsCurrentUserAdminOrManager] = useState(false);
    const [workflowConfig, setWorkflowConfig] = useState<any>(null);
    const [siblings, setSiblings] = useState<Post[]>([]);

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
                    const [config, members, allPosts] = await Promise.all([
                        api.getWorkflowConfig(brandId).catch(() => null),
                        api.getTeamMembers(brandId).catch(() => []),
                        api.getPosts(brandId).catch(() => [])
                    ]);

                    setWorkflowConfig(config);

                    if (p.groupId && allPosts.length > 0) {
                        const groupSiblings = allPosts.filter((x: any) => x.groupId === p.groupId);
                        setSiblings(groupSiblings);
                    }

                    if (currentUserId && members) {
                        const currentUserMember = members.find((m: any) => m.email === currentUserId || m.userId === currentUserId);
                        if (currentUserMember) {
                            const role = currentUserMember.role;
                            const isPrivileged = role === 'ADMIN' || role === 'MANAGER';
                            setIsCurrentUserAdminOrManager(isPrivileged);
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

    const [isPublishing, setIsPublishing] = useState(false);

    const publish = async () => {
        if (!post || isPublishing) return;
        setIsPublishing(true);
        try {
            await api.publishPost(post.id);
            await load();
        } catch (err) {
            console.error(err);
            toast('Publish failed', 'error');
        } finally {
            setIsPublishing(false);
        }
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

    const renderPlatformEmbed = (url: string, platform: string) => {
        if (!url) return null;
        const p = platform.toLowerCase();

        const containerStyle: React.CSSProperties = {
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
            background: 'var(--bg-secondary)',
            width: '100%', 
            maxWidth: 500,
            margin: '0 auto', // Center the embed horizontally
            border: '1px solid var(--border)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        };

        if (p === 'facebook') {
            // plugins/post.php works on whitelisted domains (socialflow.io.vn registered in FB App Domains).
            // Falls back to native card on localhost where FB blocks the embed.
            const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
            if (!isLocalhost) {
                let safeUrl = url;
                const fbMatch = url.match(/facebook\.com\/(\d+)_(\d+)/);
                if (fbMatch) {
                    safeUrl = `https://www.facebook.com/permalink.php?story_fbid=${fbMatch[2]}&id=${fbMatch[1]}`;
                }
                const embedUrl = `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(safeUrl)}&show_text=true&width=500`;
                return (
                    <div style={containerStyle}>
                        <iframe src={embedUrl} width="100%" style={{ border: 'none', overflow: 'hidden', height: 'calc(100vh - 350px)', minHeight: 500, maxHeight: 800 }} scrolling="no" frameBorder="0" allowFullScreen allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" />
                    </div>
                );
            }
            // Localhost fallback — native preview card
            return (
                <div style={{ ...containerStyle, padding: 0, overflow: 'hidden' }}>
                    {/* Card header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                        <PlatformIcon platform="facebook" size={20} />
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{post?.page?.pageName}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Facebook Page</div>
                        </div>
                    </div>
                    {/* Post content */}
                    <div style={{ padding: '14px 16px' }}>
                        <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {post?.content}
                        </p>
                    </div>
                    {/* Media images */}
                    {post?.mediaFiles && post.mediaFiles.length > 0 && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: post.mediaFiles.length === 1 ? '1fr' : 'repeat(2, 1fr)',
                            gap: 2,
                        }}>
                            {post.mediaFiles.slice(0, 4).map((m, i) => (
                                <div key={m.id} style={{ position: 'relative', aspectRatio: post.mediaFiles.length === 1 ? '16/9' : '1' }}>
                                    <img src={getMediaUrl(m.url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                    {i === 3 && post.mediaFiles.length > 4 && (
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 700 }}>
                                            +{post.mediaFiles.length - 4}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    {/* Footer */}
                    <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                        <a href={url} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <IconLink size={12} /> View on Facebook →
                        </a>
                    </div>
                </div>
            );
        }

        if (p === 'twitter' || p === 'x') {
             const embedUrl = `https://twitframe.com/show?url=${encodeURIComponent(url)}`;
             return (
                <div style={containerStyle}>
                    <iframe src={embedUrl} width="100%" style={{ border: 'none', overflow: 'hidden', height: 'calc(100vh - 350px)', minHeight: 500, maxHeight: 800 }} scrolling="no" frameBorder="0"></iframe>
                </div>
             );
        }

        if (p === 'instagram') {
            let embedUrl = url;
            if (!embedUrl.includes('/embed')) {
                embedUrl = embedUrl.endsWith('/') ? embedUrl + 'embed' : embedUrl + '/embed';
            }
            return (
                <div style={containerStyle}>
                    <iframe src={embedUrl} width="100%" style={{ border: 'none', overflow: 'hidden', height: 'calc(100vh - 350px)', minHeight: 600, maxHeight: 850 }} scrolling="no" frameBorder="0" allowTransparency={true}></iframe>
                </div>
            );
        }

        if (p === 'tiktok') {
            const match = url.match(/video\/(\d+)/);
            if (match) {
                const videoId = match[1];
                const embedUrl = `https://www.tiktok.com/embed/v2/${videoId}`;
                return (
                    <div style={{ ...containerStyle, maxWidth: 350 }}>
                        <iframe src={embedUrl} width="100%" style={{ border: 'none', overflow: 'hidden', height: 'calc(100vh - 350px)', minHeight: 650, maxHeight: 850 }} scrolling="no" frameBorder="0" allow="encrypted-media;"></iframe>
                    </div>
                );
            }
        }

        if (p === 'linkedin') {
            const match = url.match(/urn:li:[a-zA-Z0-9_:-]+/);
            if (match) {
                const urn = match[0];
                const embedUrl = `https://www.linkedin.com/embed/feed/update/${urn}`;
                return (
                    <div style={containerStyle}>
                        <iframe src={embedUrl} width="100%" style={{ border: 'none', overflow: 'hidden', height: 'calc(100vh - 350px)', minHeight: 500, maxHeight: 800 }} scrolling="no" frameBorder="0" allowFullScreen={true}></iframe>
                    </div>
                );
            }
        }

        if (p === 'bluesky') {
            const srcDoc = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { margin: 0; display: flex; justify-content: center; font-family: sans-serif; }
                        #embed-container { width: 100%; max-width: 100%; }
                    </style>
                </head>
                <body>
                    <div id="embed-container" style="padding: 20px; text-align: center; color: #666;">Loading Bluesky post...</div>
                    <script>
                        fetch('https://embed.bsky.app/oembed?url=${encodeURIComponent(url)}')
                            .then(res => res.json())
                            .then(data => {
                                if (data && data.html) {
                                    document.getElementById('embed-container').innerHTML = data.html;
                                    // React/innerHTML doesn't execute scripts by default, so we inject it manually
                                    const script = document.createElement('script');
                                    script.src = "https://embed.bsky.app/static/embed.js";
                                    script.async = true;
                                    script.charset = "utf-8";
                                    document.body.appendChild(script);
                                } else {
                                    document.getElementById('embed-container').innerHTML = "Embed failed.";
                                }
                            })
                            .catch(err => {
                                document.getElementById('embed-container').innerHTML = "Failed to load embed.";
                            });
                    </script>
                </body>
                </html>
            `;
            return (
                <div style={containerStyle}>
                    <iframe srcDoc={srcDoc} width="100%" style={{ border: 'none', overflow: 'auto', height: 'calc(100vh - 350px)', minHeight: 500, maxHeight: 850 }} scrolling="yes" frameBorder="0"></iframe>
                </div>
            );
        }

        if (p === 'threads') {
            let embedUrl = url;
            if (!embedUrl.includes('/embed')) {
                embedUrl = embedUrl.endsWith('/') ? embedUrl + 'embed' : embedUrl + '/embed';
            }
            return (
                <div style={{ ...containerStyle, maxWidth: 400 }}>
                    <iframe src={embedUrl} width="100%" height="500" style={{ border: 'none', overflow: 'hidden' }} scrolling="no" frameBorder="0"></iframe>
                </div>
            );
        }
        
        return null;
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
                                    toast('Submitted for approval!', 'success');
                                    load(); // Reload post
                                } else {
                                    toast('No Admin or Manager found to assign approval!', 'error');
                                }
                            } catch (err) {
                                console.error('Failed to submit for approval:', err);
                                toast('Failed to submit for approval', 'error');
                            }
                        }}>
                            <IconSend size={16} /> Submit for Approval
                        </button>
                    ) : (
                        <>
                            {(post.status === 'DRAFT' || post.status === 'SCHEDULED') && (
                                <button className="btn btn-primary" onClick={publish} disabled={isPublishing}>
                                    <IconSend size={16} /> {isPublishing ? 'Publishing...' : 'Publish Now'}
                                </button>
                            )}
                            {post.status === 'FAILED' && (
                                <button className="btn btn-primary" onClick={publish} disabled={isPublishing}>
                                    <IconRefreshCw size={16} className={isPublishing ? 'spin' : ''} /> {isPublishing ? 'Retrying...' : 'Retry'}
                                </button>
                            )}
                        </>
                    )}
                    <button className="btn btn-secondary" onClick={() => router.push(`/create?postId=${post.id}`)}>
                        Edit
                    </button>
                    <button className="btn btn-danger" onClick={deletePost}><IconTrash size={16} /> Delete</button>
                </div>
            </div>

            {siblings.length > 1 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginRight: 8 }}>Platforms in this group:</span>
                    {siblings.map(sib => (
                        <button
                            key={sib.id}
                            onClick={() => router.push(`/posts/${sib.id}`)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '6px 12px', borderRadius: 20,
                                fontSize: 12, fontWeight: 600,
                                cursor: 'pointer', transition: 'var(--transition)',
                                background: sib.id === post.id ? 'var(--accent-glow)' : 'var(--bg-glass)',
                                color: sib.id === post.id ? 'var(--accent)' : 'var(--text-secondary)',
                                border: `1px solid ${sib.id === post.id ? 'var(--accent)' : 'var(--border)'}`
                            }}
                        >
                            {platformIcon(sib.page.platform)} {sib.page.platform}
                        </button>
                    ))}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, alignItems: 'start' }}>
                {/* Left Column: Post Content */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <span className={badgeClass(post.status)}>{post.status}</span>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            Created: {new Date(post.createdAt).toLocaleString('vi-VN')}
                            {post.scheduledTime && ` · Scheduled: ${new Date(post.scheduledTime).toLocaleString('vi-VN')}`}
                            {post.publishedAt && ` · Published: ${new Date(post.publishedAt).toLocaleString('vi-VN')}`}
                        </span>
                    </div>
                    <p style={{ fontSize: 15, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{post.content}</p>

                    {/* Media Attachments */}
                    {post.mediaFiles && post.mediaFiles.length > 0 && (
                        <div style={{
                            display: 'grid', 
                            gridTemplateColumns: post.mediaFiles.length === 1 ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: 12, marginTop: 16, paddingTop: 16,
                            borderTop: '1px solid var(--border)',
                        }}>
                            {post.mediaFiles.map(m => (
                                <div key={m.id} style={{
                                    borderRadius: 'var(--radius-sm)', overflow: 'hidden',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-secondary)'
                                }}>
                                    {m.contentType.startsWith('image/') ? (
                                        <img src={getMediaUrl(m.url)} alt={m.originalName}
                                            style={{ 
                                                width: '100%', 
                                                height: post.mediaFiles.length === 1 ? 'auto' : 200, 
                                                maxHeight: post.mediaFiles.length === 1 ? 'calc(100vh - 350px)' : 200,
                                                objectFit: post.mediaFiles.length === 1 ? 'contain' : 'cover', 
                                                display: 'block' 
                                            }} />
                                    ) : m.contentType.startsWith('video/') ? (
                                        <video src={getMediaUrl(m.url)} controls
                                            style={{ 
                                                width: '100%', 
                                                height: post.mediaFiles.length === 1 ? 'auto' : 200, 
                                                maxHeight: post.mediaFiles.length === 1 ? 'calc(100vh - 350px)' : 200,
                                                objectFit: 'contain', 
                                                display: 'block' 
                                            }} />
                                    ) : null}
                                    <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)' }}>
                                        {m.originalName}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column: Publish Results & Embeds */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {(() => {
                        const latestResult = post.publishResults && post.publishResults.length > 0
                            ? [...post.publishResults].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
                            : null;

                        return (
                            <>
                                {latestResult && (
                                    <div className="card">
                                        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Publish Status</h2>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            <div className={`result-item ${latestResult.success ? 'result-success' : 'result-failed'}`}>
                                                <span style={{ fontSize: 24 }}>{latestResult.success ? <IconCheckCircle size={24} color="var(--success)" /> : <IconX size={24} color="var(--error)" />}</span>
                                                <div style={{ flex: 1 }}>
                                                    {latestResult.success ? (
                                                        <>
                                                            <div style={{ fontWeight: 600, marginBottom: 4 }}>Published successfully</div>
                                                            {latestResult.platformPostUrl && (
                                                                <a href={latestResult.platformPostUrl} target="_blank" rel="noopener noreferrer"
                                                                    style={{ fontSize: 13, color: 'var(--accent-light)', display: 'flex', alignItems: 'center', gap: 4, width: 'fit-content' }}>
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
                                                                {latestResult.errorMessage || 'Unknown error'}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {latestResult?.success && latestResult.platformPostUrl && (
                                    <div key={'embed-' + latestResult.id}>
                                        {renderPlatformEmbed(latestResult.platformPostUrl, post.page.platform)}
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            </div>
        </AppShell>
    );
}

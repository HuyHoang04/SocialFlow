'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, isTokenExpired, api, logout } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';
import AppShell from '@/components/AppShell';
import { PlatformIcon } from '@/components/Icons';
import { FacebookPostPreview, TwitterPostPreview, InstagramPreviews, BlueskyPostPreview, LinkedInPostPreview, ThreadsPostPreview } from '@automattic/social-previews';
import '@automattic/social-previews/style.css';

interface PostApproval {
    id: string;
    postId: string;
    groupId?: string;
    content: string;
    pageName?: string;
    platform?: string;
    createdByName: string;
    createdByEmail: string;
    assignedToUserId: string;
    assignedToName: string;
    assignedToEmail: string;
    approvalLevel: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
    approvedAt?: string;
    comment?: string;
}

function PlatformPreview({
    platform,
    pageInfo,
    caption,
    mediaFiles
}: {
    platform: string;
    pageInfo: any;
    caption: string;
    mediaFiles: any[];
}) {
    const platformLower = platform.toLowerCase();
    const currentMedia = mediaFiles && mediaFiles.length > 0 ? mediaFiles[0] : null;
    const allMediaArray = mediaFiles && mediaFiles.length > 0 ? mediaFiles.map(file => ({
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
                        {currentMedia ? (
                            <img src={currentMedia.url} alt="preview" style={{ width: '100%', borderRadius: 12, aspectRatio: '9/16', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ width: '100%', aspectRatio: '9/16', background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>
                                <span style={{ fontSize: 32, color: 'var(--text-muted)' }}>🎵</span>
                            </div>
                        )}
                        <div style={{ position: 'absolute', bottom: 32, right: 12, display: 'flex', flexDirection: 'column', gap: 16, color: 'white', textAlign: 'center' }}>
                            <div>❤️<br /><span style={{ fontSize: 10 }}>234</span></div>
                            <div>💬<br /><span style={{ fontSize: 10 }}>45</span></div>
                            <div>↗️<br /><span style={{ fontSize: 10 }}>89</span></div>
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
                        caption={caption}
                        name={pageInfo.pageName}
                        profileImage="https://via.placeholder.com/48?text=TH"
                        image={currentMedia?.url}
                        media={allMediaArray}
                    />
                </div>
            )}

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
        </div>
    );
}

export default function ApprovalsPage() {
    const router = useRouter();
    const { selectedBrand } = useBrand();
    const [allApprovals, setAllApprovals] = useState<PostApproval[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<{ email: string; name: string; userId: string } | null>(null);

    // Approval action state
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
    const [actionError, setActionError] = useState<string | null>(null);
    const [previewApproval, setPreviewApproval] = useState<PostApproval | null>(null);
    const [selectedPostData, setSelectedPostData] = useState<any>(null);
    const [fetchingPost, setFetchingPost] = useState(false);

    const handleViewDetails = async (approval: PostApproval) => {
        setPreviewApproval(approval);
        setFetchingPost(true);
        setSelectedPostData(null);
        try {
            const postData = await api.getPost(approval.postId);
            setSelectedPostData(postData);
        } catch (err) {
            console.error("Failed to fetch post data", err);
        }
        setFetchingPost(false);
    };

    const loadApprovals = useCallback(async () => {
        if (!selectedBrand || !user) return;
        setError(null);
        try {
            const approvals = await api.getAllApprovals(user.userId, selectedBrand.id);
            setAllApprovals(approvals);
        } catch (err: any) {
            if (err?.message !== 'Unauthorized') {
                setError(err?.message || 'Failed to load approvals');
            }
        }
        setLoading(false);
    }, [selectedBrand, user]);

    useEffect(() => {
        const u = getUser();
        if (!u) { router.replace('/login'); return; }
        if (isTokenExpired()) { logout(); return; }
        if (!selectedBrand) { router.replace('/brands'); return; }

        setUser(u);
    }, [router, selectedBrand]);

    useEffect(() => {
        if (user) {
            loadApprovals();
        }
    }, [loadApprovals, user]);

    const handleApprove = async (approvalId: string) => {
        setActionError(null);
        setApprovingId(approvalId);

        try {
            const comment = commentText[approvalId] || '';
            await api.approvePost(approvalId, comment);
            await loadApprovals();
        } catch (err: any) {
            setActionError(err?.message || 'Failed to approve post');
        }
        setApprovingId(null);
        setCommentText({ ...commentText, [approvalId]: '' });
    };

    const handleReject = async (approvalId: string) => {
        const comment = commentText[approvalId] || 'No reason provided';
        if (!confirm('Are you sure you want to reject this post?')) return;

        setActionError(null);
        setRejectingId(approvalId);

        try {
            await api.rejectPost(approvalId, comment);
            await loadApprovals();
        } catch (err: any) {
            setActionError(err?.message || 'Failed to reject post');
        }
        setRejectingId(null);
        setCommentText({ ...commentText, [approvalId]: '' });
    };

    const [selectedUserFilter, setSelectedUserFilter] = useState<string>('');

    // Organize approvals by status and filter by user
    const filteredApprovals = selectedUserFilter
        ? allApprovals.filter(a => a.createdByName === selectedUserFilter)
        : allApprovals;

    const pendingApprovals = filteredApprovals.filter(a => a.status === 'PENDING');
    const approvedApprovals = filteredApprovals.filter(a => a.status === 'APPROVED');
    const rejectedApprovals = filteredApprovals.filter(a => a.status === 'REJECTED');

    if (!selectedBrand) {
        return <div className="approvals-page">Please select a brand first</div>;
    }

    const renderApprovalCard = (approval: PostApproval, isActionable: boolean) => (
        <div
            key={approval.id}
            className="card"
            style={{
                padding: 20,
                background: 'var(--bg-glass)',
                borderColor: 'var(--border)',
                marginBottom: 12,
                cursor: approval.status === 'PENDING' ? 'grab' : 'default'
            }}
            draggable={approval.status === 'PENDING'}
            onDragStart={(e) => {
                e.dataTransfer.setData('approvalId', approval.id);
                e.dataTransfer.setData('currentStatus', approval.status);
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{approval.createdByName}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>
                        To: <strong style={{ color: 'var(--accent)' }}>{approval.assignedToName}</strong>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(approval.createdAt)}</div>
                </div>
                <span style={{
                    fontSize: 10, padding: '3px 10px', borderRadius: '4px',
                    fontWeight: 600, background: 'var(--accent-glow)', color: 'var(--accent)'
                }}>
                    L{approval.approvalLevel}
                </span>
            </div>

            {/* Platform badge */}
            {approval.platform && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 5, fontSize: 11,
                        background: 'var(--bg-glass-strong)', padding: '3px 8px',
                        borderRadius: 20, color: 'var(--text-secondary)', width: 'fit-content'
                    }}>
                        <PlatformIcon platform={approval.platform} size={12} />
                        <span>{approval.pageName ?? approval.platform}</span>
                    </div>
                </div>
            )}

            {/* Content */}
            <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                    {truncateContent(approval.content, 200)}
                </p>
                <div style={{ textAlign: 'right' }}>
                    <span style={{ color: 'var(--accent)', cursor: 'pointer', fontSize: 12 }} onClick={() => handleViewDetails(approval)}>
                        🔍 Xem chi tiết
                    </span>
                </div>
            </div>

            {/* Comment if exists */}
            {approval.comment && (
                <div style={{
                    padding: '10px',
                    background: 'var(--bg-glass-strong)',
                    borderRadius: '4px',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    marginBottom: 12,
                    borderLeft: `3px solid ${approval.status === 'APPROVED' ? 'var(--success)' : 'var(--error)'}`
                }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Comment:</strong> {approval.comment}
                </div>
            )}

            {/* Actions for pending only */}
            {approval.status === 'PENDING' && (
                <>
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                            Comment
                        </label>
                        <textarea
                            placeholder="Add comment..."
                            value={commentText[approval.id] || ''}
                            onChange={(e) => setCommentText({ ...commentText, [approval.id]: e.target.value })}
                            disabled={approvingId === approval.id || rejectingId === approval.id}
                            rows={2}
                            style={{
                                width: '100%',
                                padding: '8px 10px',
                                border: '1px solid var(--border)',
                                borderRadius: '4px',
                                background: 'var(--bg-glass)',
                                color: 'var(--text-primary)',
                                fontSize: 12,
                                fontFamily: 'Inter, sans-serif',
                                resize: 'vertical',
                                outline: 'none',
                                transition: 'var(--transition)'
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            className="btn"
                            style={{
                                flex: 1,
                                fontSize: 12,
                                padding: '8px',
                                background: 'var(--success-bg)',
                                color: 'var(--success)',
                                border: '1px solid var(--success)',
                                fontWeight: 600,
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                            onClick={() => handleApprove(approval.id)}
                            disabled={approvingId === approval.id || rejectingId === approval.id}
                        >
                            {approvingId === approval.id ? '✓...' : '✓ Approve'}
                        </button>
                        <button
                            className="btn btn-danger"
                            style={{
                                flex: 1,
                                fontSize: 12,
                                padding: '8px',
                                background: 'var(--error-bg)',
                                color: 'var(--error)',
                                border: '1px solid var(--error)',
                                fontWeight: 600,
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                            onClick={() => handleReject(approval.id)}
                            disabled={approvingId === approval.id || rejectingId === approval.id}
                        >
                            {rejectingId === approval.id ? '✗...' : '✗ Reject'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );

    return (
        <AppShell>
            <div style={{ width: '100%', padding: '0 40px', animation: 'fadeIn 0.5s ease-out' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
                    <div>
                        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Approval Board</h1>
                        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>{selectedBrand?.name}</p>
                    </div>
                    {/* Filter by User */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Filter by creator:</span>
                        <select
                            value={selectedUserFilter}
                            onChange={(e) => setSelectedUserFilter(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-glass)',
                                color: 'var(--text-primary)',
                                fontSize: 13,
                                outline: 'none'
                            }}
                        >
                            <option value="">All Users</option>
                            {Array.from(new Set(allApprovals.map(a => a.createdByName).filter(Boolean))).map(name => (
                                <option style={{ color: 'black' }} key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Error Messages */}
                {error && <div className="error-message" style={{ marginBottom: 20 }}>{error}</div>}
                {actionError && <div className="error-message" style={{ marginBottom: 20 }}>{actionError}</div>}
                {loading && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading approvals...</div>}

                {/* Kanban Board */}
                {!loading && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                        gap: 24,
                        marginBottom: 32
                    }}>
                        {/* Pending Column */}
                        <div style={{
                            background: 'var(--bg-card)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--border)',
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 20,
                                paddingBottom: 16,
                                borderBottom: '2px solid var(--border)'
                            }}>
                                <div style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    background: 'var(--accent-glow)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 16,
                                    color: 'var(--accent)'
                                }}>
                                    ⏳
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Pending</h3>
                                    <p style={{ margin: '2px 0 0 0', fontSize: 11, color: 'var(--text-secondary)' }}>{pendingApprovals.length} posts</p>
                                </div>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                {pendingApprovals.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>
                                        No pending approvals
                                    </div>
                                ) : (
                                    pendingApprovals.map(approval => renderApprovalCard(approval, approval.assignedToUserId === user?.userId))
                                )}
                            </div>
                        </div>

                        {/* Approved Column */}
                        <div
                            style={{
                                background: 'var(--bg-card)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--border)',
                                padding: '20px',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={async (e) => {
                                const approvalId = e.dataTransfer.getData('approvalId');
                                const currentStatus = e.dataTransfer.getData('currentStatus');
                                if (currentStatus === 'PENDING' && approvalId) {
                                    handleApprove(approvalId);
                                }
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 20,
                                paddingBottom: 16,
                                borderBottom: '2px solid var(--border)'
                            }}>
                                <div style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    background: 'var(--success-bg)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 16,
                                    color: 'var(--success)'
                                }}>
                                    ✓
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Approved</h3>
                                    <p style={{ margin: '2px 0 0 0', fontSize: 11, color: 'var(--text-secondary)' }}>{approvedApprovals.length} posts</p>
                                </div>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                {approvedApprovals.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>
                                        No approved posts
                                    </div>
                                ) : (
                                    approvedApprovals.map(approval => renderApprovalCard(approval, false))
                                )}
                            </div>
                        </div>

                        {/* Rejected Column */}
                        <div
                            style={{
                                background: 'var(--bg-card)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--border)',
                                padding: '20px',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={async (e) => {
                                const approvalId = e.dataTransfer.getData('approvalId');
                                const currentStatus = e.dataTransfer.getData('currentStatus');
                                if (currentStatus === 'PENDING' && approvalId) {
                                    handleReject(approvalId);
                                }
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 20,
                                paddingBottom: 16,
                                borderBottom: '2px solid var(--border)'
                            }}>
                                <div style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    background: 'var(--error-bg)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 16,
                                    color: 'var(--error)'
                                }}>
                                    ✗
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Rejected</h3>
                                    <p style={{ margin: '2px 0 0 0', fontSize: 11, color: 'var(--text-secondary)' }}>{rejectedApprovals.length} posts</p>
                                </div>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                {rejectedApprovals.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>
                                        No rejected posts
                                    </div>
                                ) : (
                                    rejectedApprovals.map(approval => renderApprovalCard(approval, false))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Preview Modal */}
                {previewApproval && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        backdropFilter: 'blur(4px)'
                    }} onClick={() => setPreviewApproval(null)}>
                        <div style={{
                            background: 'var(--bg-card)',
                            padding: '30px',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--border)',
                            maxWidth: '600px',
                            width: '90%',
                            maxHeight: '80vh',
                            overflowY: 'auto',
                            position: 'relative'
                        }} onClick={e => e.stopPropagation()}>
                            <button style={{
                                position: 'absolute',
                                top: 15, right: 15,
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontSize: 20
                            }} onClick={() => setPreviewApproval(null)}>✕</button>

                            <h2 style={{ marginBottom: 20, fontSize: 20, fontWeight: 700 }}>Post Preview</h2>

                            <div style={{ marginBottom: 15 }}>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Created by</div>
                                <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{previewApproval.createdByName}</div>
                            </div>

                            {fetchingPost && <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading full post data...</div>}

                            {selectedPostData && (
                                <div style={{ marginBottom: 15 }}>
                                    <PlatformPreview
                                        platform={selectedPostData.page.platform}
                                        pageInfo={{ pageName: selectedPostData.page.pageName }}
                                        caption={selectedPostData.content}
                                        mediaFiles={selectedPostData.mediaFiles || []}
                                    />
                                </div>
                            )}

                            {!fetchingPost && !selectedPostData && (
                                <div style={{ marginBottom: 15 }}>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Content</div>
                                    <div style={{
                                        fontSize: 14,
                                        color: 'var(--text-primary)',
                                        lineHeight: 1.6,
                                        whiteSpace: 'pre-wrap',
                                        background: 'var(--bg-glass)',
                                        padding: '15px',
                                        borderRadius: '4px'
                                    }}>{previewApproval.content}</div>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button className="btn" onClick={() => setPreviewApproval(null)}>Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    );
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
}

function truncateContent(content: string | undefined | null, maxLength: number): string {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
}

'use client';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';
import AppShell from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { PlatformIcon, IconRefreshCw, IconInbox, IconSend, IconSparkles } from '@/components/Icons';

interface InboxMessage {
    id: string;
    platformMessageId: string;
    platformPostId: string;
    content: string;
    authorName: string;
    authorProfilePic?: string;
    createdAt: string;
    isRead: boolean;
    isFromMe: boolean;
    pageId: string;
    pageName: string;
    platform: string;
    parentMessageId?: string | null;
    messageType?: 'COMMENT' | 'DIRECT_MESSAGE' | null;
    conversationId?: string | null;
}

interface DmConversation {
    conversationId: string;
    messages: InboxMessage[];
    preview: InboxMessage;
    hasUnread: boolean;
}

type ActiveTab = 'comments' | 'messages';

export default function InboxPage() {
    const { selectedBrand: brand } = useBrand();
    const { toast } = useToast();
    const [messages, setMessages] = useState<InboxMessage[]>([]);
    const [activeTab, setActiveTab] = useState<ActiveTab>('comments');
    const [selectedComment, setSelectedComment] = useState<InboxMessage | null>(null);
    const [selectedConversation, setSelectedConversation] = useState<DmConversation | null>(null);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState('');
    const [replyContent, setReplyContent] = useState('');
    const [sendingReply, setSendingReply] = useState(false);
    const [suggestingAi, setSuggestingAi] = useState(false);
    const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
    const eventSourceRef = useRef<EventSource | null>(null);

    const loadInbox = useCallback(async () => {
        if (!brand) return;
        setLoading(true);
        try {
            const data = await api.getInbox(brand.id);
            setMessages(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load inbox');
        } finally {
            setLoading(false);
        }
    }, [brand]);

    useEffect(() => { loadInbox(); }, [loadInbox]);

    // ── SSE Realtime subscription ────────────────────────────────
    useEffect(() => {
        if (!brand) return;

        // Close any previous connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const url = `${backendUrl}/api/inbox/stream?brandId=${brand.id}`;
        const es = new EventSource(url);
        eventSourceRef.current = es;
        setRealtimeStatus('connecting');

        es.addEventListener('connected', () => {
            setRealtimeStatus('connected');
        });

        es.addEventListener('new_message', (event) => {
            try {
                const newMsg: InboxMessage = JSON.parse(event.data);
                setMessages(prev => {
                    // Avoid duplicate
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    return [newMsg, ...prev];
                });
            } catch (e) {
                console.error('[SSE] Failed to parse new_message', e);
            }
        });

        es.onerror = () => {
            setRealtimeStatus('disconnected');
            // EventSource auto-reconnects; just update status
        };

        return () => {
            es.close();
            eventSourceRef.current = null;
            setRealtimeStatus('disconnected');
        };
    }, [brand]);

    // Refresh selectedConversation when messages update
    useEffect(() => {
        if (selectedConversation) {
            const updated = messages.filter(
                m => (m.conversationId || m.platformPostId) === selectedConversation.conversationId
            ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            if (updated.length > 0) {
                const preview = [...updated].sort((a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                ).find(m => !m.isFromMe) || updated[updated.length - 1];
                setSelectedConversation({
                    conversationId: selectedConversation.conversationId,
                    messages: updated,
                    preview,
                    hasUnread: updated.some(m => !m.isRead && !m.isFromMe),
                });
            }
        }
        if (selectedComment) {
            const refreshed = messages.find(m => m.id === selectedComment.id);
            if (refreshed) setSelectedComment(refreshed);
        }
    }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSync = async () => {
        if (!brand) return;
        setSyncing(true);
        setError('');
        try {
            await api.syncInbox(brand.id);
            await loadInbox();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to sync inbox');
        } finally {
            setSyncing(false);
        }
    };

    // ── Derived data ────────────────────────────────────────────

    const topLevelComments = useMemo(
        () => messages.filter(m => (!m.messageType || m.messageType === 'COMMENT') && !m.parentMessageId),
        [messages]
    );

    const getReplies = (parentPlatformId: string) =>
        messages
            .filter(m => m.parentMessageId === parentPlatformId)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const dmConversations = useMemo<DmConversation[]>(() => {
        const dms = messages.filter(m => m.messageType === 'DIRECT_MESSAGE');
        const grouped = new Map<string, InboxMessage[]>();
        for (const msg of dms) {
            const key = msg.conversationId || msg.platformPostId;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(msg);
        }
        return Array.from(grouped.entries())
            .map(([convId, msgs]) => {
                const sorted = [...msgs].sort(
                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                const preview = sorted.find(m => !m.isFromMe) || sorted[0];
                return {
                    conversationId: convId,
                    messages: msgs.sort(
                        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    ),
                    preview,
                    hasUnread: msgs.some(m => !m.isRead && !m.isFromMe),
                };
            })
            .sort((a, b) =>
                new Date(b.preview.createdAt).getTime() - new Date(a.preview.createdAt).getTime()
            );
    }, [messages]);

    const unreadComments = topLevelComments.filter(m => !m.isRead).length;
    const unreadDMs = dmConversations.filter(c => c.hasUnread).length;

    // ── Handlers ────────────────────────────────────────────────

    const handleSelectComment = async (msg: InboxMessage) => {
        setSelectedComment(msg);
        setReplyContent('');
        if (!msg.isRead) {
            try {
                await api.markInboxMessageRead(msg.id);
                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
            } catch { /* non-critical */ }
        }
    };

    const handleSelectConversation = async (conv: DmConversation) => {
        setSelectedConversation(conv);
        setReplyContent('');
        // Mark all unread messages in this conversation as read
        const unread = conv.messages.filter(m => !m.isRead && !m.isFromMe);
        for (const m of unread) {
            try {
                await api.markInboxMessageRead(m.id);
            } catch { /* non-critical */ }
        }
        if (unread.length > 0) {
            setMessages(prev =>
                prev.map(m => unread.some(u => u.id === m.id) ? { ...m, isRead: true } : m)
            );
        }
    };

    const handleReply = async () => {
        if (!replyContent.trim()) return;
        const targetId = activeTab === 'comments'
            ? selectedComment?.id
            : selectedConversation?.messages[0]?.id;
        if (!targetId) return;

        setSendingReply(true);
        try {
            await api.replyToInboxMessage(targetId, replyContent);
            setReplyContent('');
            await loadInbox();
        } catch (err: unknown) {
            toast(err instanceof Error ? err.message : 'Reply failed', 'error');
        } finally {
            setSendingReply(false);
        }
    };

    const handleSuggestReply = async () => {
        const targetId = activeTab === 'comments'
            ? selectedComment?.id
            : selectedConversation?.messages[0]?.id;
        if (!targetId || !brand) return;

        setSuggestingAi(true);
        try {
            const res = await api.getAiReplySuggestion(targetId);
            setReplyContent(res.suggestion || '');
        } catch (err: unknown) {
            toast(err instanceof Error ? err.message : 'Failed to get AI suggestion', 'error');
        } finally {
            setSuggestingAi(false);
        }
    };

    const replyPlaceholder = activeTab === 'comments'
        ? `Reply to ${selectedComment?.authorName ?? '...'} as ${selectedComment?.pageName ?? ''}...`
        : `Reply to ${selectedConversation?.preview?.authorName ?? '...'} as ${selectedConversation?.preview?.pageName ?? ''}...`;

    const hasSelection = activeTab === 'comments' ? !!selectedComment : !!selectedConversation;

    // ── Render ──────────────────────────────────────────────────

    return (
        <AppShell>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Unified Inbox</h1>
                    <p className="page-subtitle">Engage with your audience across all platforms</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Realtime status indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                        <span style={{
                            width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                            background: realtimeStatus === 'connected' ? '#22c55e'
                                      : realtimeStatus === 'connecting' ? '#f59e0b'
                                      : '#6b7280',
                            boxShadow: realtimeStatus === 'connected' ? '0 0 6px #22c55e88' : 'none',
                            animation: realtimeStatus === 'connected' ? 'pulse 2s infinite' : 'none',
                        }} />
                        {realtimeStatus === 'connected' ? 'Live' : realtimeStatus === 'connecting' ? 'Connecting...' : 'Offline'}
                    </div>
                    <button className="btn btn-secondary" onClick={handleSync} disabled={syncing}>
                        <IconRefreshCw size={16} />
                        {syncing ? ' Syncing...' : ' Sync Inbox'}
                    </button>
                </div>
            </div>

            {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
                {([
                    { key: 'comments' as ActiveTab, label: 'Post Comments', unread: unreadComments },
                    { key: 'messages' as ActiveTab, label: 'Direct Messages', unread: unreadDMs },
                ] as const).map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => { setActiveTab(tab.key); setSelectedComment(null); setSelectedConversation(null); setReplyContent(''); }}
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
                            background: 'none',
                            color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-secondary)',
                            fontWeight: activeTab === tab.key ? 700 : 500,
                            fontSize: 14,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                        }}
                    >
                        {tab.label}
                        {tab.unread > 0 && (
                            <span style={{
                                background: 'var(--primary)',
                                color: 'white',
                                borderRadius: 100,
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '1px 6px',
                                minWidth: 18,
                                textAlign: 'center',
                            }}>{tab.unread}</span>
                        )}
                    </button>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, height: 'calc(100vh - 260px)' }}>

                {/* ── Left Pane ── */}
                <div className="card" style={{ padding: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 13, background: 'var(--bg-glass)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {activeTab === 'comments' ? `${topLevelComments.length} Comment thread${topLevelComments.length !== 1 ? 's' : ''}` : `${dmConversations.length} Conversation${dmConversations.length !== 1 ? 's' : ''}`}
                    </div>

                    {loading && messages.length === 0 ? (
                        <div style={{ padding: 32, textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></div>
                    ) : activeTab === 'comments' ? (
                        topLevelComments.length === 0 ? (
                            <EmptyState>No comments yet. Click Sync to pull from Facebook.</EmptyState>
                        ) : topLevelComments.map(msg => (
                            <MessageRow
                                key={msg.id}
                                isSelected={selectedComment?.id === msg.id}
                                isUnread={!msg.isRead}
                                onClick={() => handleSelectComment(msg)}
                            >
                                <RowHeader name={msg.authorName} date={msg.createdAt} isUnread={!msg.isRead} />
                                <RowPreview content={msg.content} isUnread={!msg.isRead} />
                                <RowMeta platform={msg.platform} pageName={msg.pageName} badge={msg.isFromMe ? 'My Reply' : undefined} extra={`${getReplies(msg.platformMessageId).length} repl${getReplies(msg.platformMessageId).length !== 1 ? 'ies' : 'y'}`} />
                            </MessageRow>
                        ))
                    ) : (
                        dmConversations.length === 0 ? (
                            <EmptyState>No messages yet. Sync pulls Messenger DMs (requires pages_messaging permission).</EmptyState>
                        ) : dmConversations.map(conv => (
                            <MessageRow
                                key={conv.conversationId}
                                isSelected={selectedConversation?.conversationId === conv.conversationId}
                                isUnread={conv.hasUnread}
                                onClick={() => handleSelectConversation(conv)}
                            >
                                <RowHeader name={conv.preview.authorName} date={conv.preview.createdAt} isUnread={conv.hasUnread} />
                                <RowPreview content={conv.preview.content} isUnread={conv.hasUnread} />
                                <RowMeta platform={conv.preview.platform} pageName={conv.preview.pageName} extra={`${conv.messages.length} message${conv.messages.length !== 1 ? 's' : ''}`} />
                            </MessageRow>
                        ))
                    )}
                </div>

                {/* ── Right Pane ── */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                    {!hasSelection ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 12 }}>
                            <IconInbox size={48} color="var(--text-muted)" />
                            <div style={{ fontSize: 15 }}>Select a {activeTab === 'comments' ? 'comment' : 'conversation'} to view</div>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-glass)' }}>
                                {activeTab === 'comments' && selectedComment ? (
                                    <>
                                        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>
                                            Conversation with {selectedComment.authorName}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <PlatformIcon platform={selectedComment.platform} size={14} />
                                            {selectedComment.pageName}
                                            <span style={{ opacity: 0.5 }}>·</span>
                                            Post: {selectedComment.platformPostId}
                                        </div>
                                    </>
                                ) : selectedConversation ? (
                                    <>
                                        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ background: 'linear-gradient(135deg,#1877f2,#42a5f5)', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: 'white', fontWeight: 700 }}>DM</span>
                                            {selectedConversation.preview.authorName}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <PlatformIcon platform={selectedConversation.preview.platform} size={14} />
                                            {selectedConversation.preview.pageName}
                                            <span style={{ opacity: 0.5 }}>·</span>
                                            {selectedConversation.messages.length} messages
                                        </div>
                                    </>
                                ) : null}
                            </div>

                            {/* Thread */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {activeTab === 'comments' && selectedComment ? (
                                    <>
                                        <Bubble msg={selectedComment} />
                                        {getReplies(selectedComment.platformMessageId).map(r => (
                                            <Bubble key={r.id} msg={r} />
                                        ))}
                                    </>
                                ) : selectedConversation?.messages.map(m => (
                                    <Bubble key={m.id} msg={m} />
                                ))}
                            </div>

                            {/* Reply box */}
                            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                                <textarea
                                    className="form-textarea"
                                    rows={3}
                                    placeholder={replyPlaceholder}
                                    value={replyContent}
                                    onChange={e => setReplyContent(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleReply(); }}
                                    style={{ marginBottom: 12, resize: 'none' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={handleSuggestReply}
                                            disabled={suggestingAi || sendingReply}
                                            title="Get AI suggested reply based on brand identity"
                                            style={{ color: 'var(--primary)', borderColor: 'var(--primary-glow)' }}
                                        >
                                            {suggestingAi ? '✨ Suggesting...' : <><IconSparkles size={14} /> AI Suggest</>}
                                        </button>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>Ctrl+Enter to send</span>
                                    </div>
                                    <button className="btn btn-primary" onClick={handleReply} disabled={!replyContent.trim() || sendingReply || suggestingAi}>
                                        {sendingReply ? 'Sending...' : <><IconSend size={14} /> Send Reply</>}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </AppShell>
    );
}

// ── Small reusable components ─────────────────────────────────

function EmptyState({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>
            {children}
        </div>
    );
}

function MessageRow({ children, isSelected, isUnread, onClick }: {
    children: React.ReactNode; isSelected: boolean; isUnread: boolean; onClick: () => void;
}) {
    return (
        <div
            onClick={onClick}
            style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                background: isSelected ? 'var(--bg-card)' : 'transparent',
                borderLeft: `3px solid ${isUnread ? 'var(--primary)' : 'transparent'}`,
            }}
            className="hover-bg"
        >
            {children}
        </div>
    );
}

function RowHeader({ name, date, isUnread }: { name: string; date: string; isUnread: boolean }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontWeight: isUnread ? 700 : 600, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                {isUnread && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} />}
                {name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {new Date(date).toLocaleDateString('vi-VN')}
            </div>
        </div>
    );
}

function RowPreview({ content, isUnread }: { content: string; isUnread: boolean }) {
    return (
        <div style={{
            fontSize: 13,
            color: isUnread ? 'var(--text-primary)' : 'var(--text-secondary)',
            marginBottom: 8,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.5,
        }}>
            {content}
        </div>
    );
}

function RowMeta({ platform, pageName, badge, extra }: { platform: string; pageName: string; badge?: string; extra?: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
            <PlatformIcon platform={platform} size={13} />
            <span>{pageName}</span>
            {extra && <><span style={{ opacity: 0.4 }}>·</span><span>{extra}</span></>}
            {badge && (
                <span style={{ marginLeft: 'auto', background: 'rgba(99,102,241,0.15)', color: 'var(--primary)', borderRadius: 100, padding: '1px 7px', fontSize: 10, fontWeight: 600 }}>
                    {badge}
                </span>
            )}
        </div>
    );
}

function Bubble({ msg }: { msg: InboxMessage }) {
    const isMe = msg.isFromMe;
    return (
        <div style={{ display: 'flex', gap: 12, flexDirection: isMe ? 'row-reverse' : 'row' }}>
            <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                background: isMe ? 'var(--secondary)' : 'var(--primary)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 14,
            }}>
                {msg.authorName.charAt(0).toUpperCase()}
            </div>
            <div style={{
                background: isMe ? 'var(--primary-glow)' : 'var(--bg-glass)',
                border: isMe ? '1px solid var(--primary)' : '1px solid transparent',
                padding: '10px 14px',
                borderRadius: isMe ? '12px 0 12px 12px' : '0 12px 12px 12px',
                maxWidth: '75%',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
                    <strong style={{ fontSize: 13 }}>{msg.authorName}</strong>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(msg.createdAt).toLocaleString('vi-VN')}
                    </span>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap', margin: 0 }}>{msg.content}</p>
                {isMe && (
                    <div style={{ fontSize: 10, color: 'var(--primary)', marginTop: 4, fontWeight: 600 }}>
                        Sent by SocialFlow
                    </div>
                )}
            </div>
        </div>
    );
}

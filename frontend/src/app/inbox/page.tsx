'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import AppShell from '@/components/AppShell';

interface Brand {
    id: string;
    name: string;
}

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
}

export default function InboxPage() {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
    const [messages, setMessages] = useState<InboxMessage[]>([]);
    const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState('');

    // Reply state
    const [replyContent, setReplyContent] = useState('');
    const [sendingReply, setSendingReply] = useState(false);

    const loadBrands = useCallback(async () => {
        try {
            const b = await api.getBrands();
            setBrands(b);
            if (b.length > 0) setSelectedBrand(b[0].id);
        } catch (err: any) {
            setError(err.message || 'Failed to load brands');
        }
    }, []);

    useEffect(() => { loadBrands(); }, [loadBrands]);

    const loadInbox = useCallback(async () => {
        if (!selectedBrand) return;
        setLoading(true);
        try {
            const data = await api.getInbox(selectedBrand);
            setMessages(data);

            // If already looking at a message, update it with fresh data
            if (selectedMessage) {
                const refreshed = data.find((m: InboxMessage) => m.id === selectedMessage.id);
                if (refreshed) setSelectedMessage(refreshed);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load inbox');
        } finally {
            setLoading(false);
        }
    }, [selectedBrand, selectedMessage]);

    useEffect(() => { loadInbox(); }, [loadInbox]);

    const handleSync = async () => {
        if (!selectedBrand) return;
        setSyncing(true);
        setError('');
        try {
            await api.syncInbox(selectedBrand);
            await loadInbox();
        } catch (err: any) {
            setError(err.message || 'Failed to sync inbox');
        } finally {
            setSyncing(false);
        }
    };

    const handleSelectMessage = async (msg: InboxMessage) => {
        setSelectedMessage(msg);
        setReplyContent('');
        if (!msg.isRead) {
            try {
                await api.markInboxMessageRead(msg.id);
                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
                setSelectedMessage({ ...msg, isRead: true });
            } catch (err) {
                console.error("Failed to mark read", err);
            }
        }
    };

    const handleReply = async () => {
        if (!selectedMessage || !replyContent.trim()) return;
        setSendingReply(true);
        try {
            await api.replyToInboxMessage(selectedMessage.id, replyContent);
            setReplyContent('');
            // Reload inbox to explicitly fetch the new reply that Sync pulls in backend
            await loadInbox();
        } catch (err: any) {
            alert(err.message || 'Reply failed');
        } finally {
            setSendingReply(false);
        }
    };

    const platformIcon = (p: string) => {
        switch (p) { case 'FACEBOOK': return '📘'; case 'TWITTER': return '✖️'; case 'LINKEDIN': return '💼'; default: return '🌐'; }
    };

    // Derived states for grouping:
    // Top-level messages (no parentMessageId)
    const topLevelMessages = messages.filter(m => !m.parentMessageId);

    // Function to get all replies for a given top-level message
    const getRepliesForMessage = (parentPlatformId: string) => {
        return messages
            .filter(m => m.parentMessageId === parentPlatformId)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    };

    return (
        <AppShell>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Unified Inbox</h1>
                    <p className="page-subtitle">Engage with your audience across all platforms</p>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <select
                        className="form-input"
                        value={selectedBrand || ''}
                        onChange={e => { setSelectedBrand(e.target.value); setSelectedMessage(null); }}
                        style={{ minWidth: 200, margin: 0 }}
                    >
                        {brands.length === 0 && <option value="">Loading Brands...</option>}
                        {brands.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                    <button className="btn btn-secondary" onClick={handleSync} disabled={syncing}>
                        {syncing ? '🔄 Syncing...' : '🔄 Sync Inbox'}
                    </button>
                </div>
            </div>

            {error && <div className="error-msg" style={{ marginBottom: 24 }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: 24, height: 'calc(100vh - 200px)' }}>
                {/* Left Pane: Message List */}
                <div className="card" style={{ padding: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', fontWeight: 600, background: 'var(--bg-glass)' }}>
                        Recent Comments & Messages
                    </div>
                    {loading && messages.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></div>
                    ) : topLevelMessages.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                            No messages found. Click Sync to pull new messages.
                        </div>
                    ) : (
                        topLevelMessages.map(msg => (
                            <div
                                key={msg.id}
                                onClick={() => handleSelectMessage(msg)}
                                style={{
                                    padding: '16px',
                                    borderBottom: '1px solid var(--border)',
                                    cursor: 'pointer',
                                    background: selectedMessage?.id === msg.id ? 'var(--bg-card)' : 'transparent',
                                    borderLeft: `4px solid ${!msg.isRead ? 'var(--primary)' : 'transparent'}`,
                                    transition: 'background 0.2s',
                                }}
                                className="hover-bg"
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <div style={{ fontWeight: !msg.isRead ? 700 : 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: !msg.isRead ? 'var(--primary)' : 'transparent' }} />
                                        {msg.authorName}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        {new Date(msg.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <div style={{ fontSize: 13, color: !msg.isRead ? 'var(--text-primary)' : 'var(--text-secondary)', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {msg.content}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                                    <span>{platformIcon(msg.platform)}</span>
                                    <span>{msg.pageName}</span>
                                    {msg.isFromMe && <span className="badge" style={{ fontSize: 10, padding: '2px 6px' }}>My Reply</span>}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Right Pane: Thread/Reply View */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                    {selectedMessage ? (
                        <>
                            <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ fontSize: 18, marginBottom: 4 }}>Conversation with {selectedMessage.authorName}</h2>
                                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                        {platformIcon(selectedMessage.platform)} {selectedMessage.pageName} · Comment on Post ID: {selectedMessage.platformPostId}
                                    </p>
                                </div>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {/* Original Message */}
                                <div style={{ display: 'flex', gap: 16 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 18, flexShrink: 0 }}>
                                        {selectedMessage.authorName.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ background: 'var(--bg-glass)', padding: '16px', borderRadius: '0 12px 12px 12px', maxWidth: '80%' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 16 }}>
                                            <strong style={{ fontSize: 14 }}>{selectedMessage.authorName}</strong>
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(selectedMessage.createdAt).toLocaleString()}</span>
                                        </div>
                                        <p style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                            {selectedMessage.content}
                                        </p>
                                    </div>
                                </div>

                                {/* Replies Thread */}
                                {getRepliesForMessage(selectedMessage.platformMessageId).map(reply => (
                                    <div key={reply.id} style={{ display: 'flex', gap: 16, flexDirection: reply.isFromMe ? 'row-reverse' : 'row' }}>
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: reply.isFromMe ? 'var(--secondary)' : 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 14, flexShrink: 0 }}>
                                            {reply.authorName.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ background: reply.isFromMe ? 'var(--primary-glow)' : 'var(--bg-glass)', border: reply.isFromMe ? '1px solid var(--primary)' : '1px solid transparent', padding: '12px 16px', borderRadius: reply.isFromMe ? '12px 0 12px 12px' : '0 12px 12px 12px', maxWidth: '80%' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: 16 }}>
                                                <strong style={{ fontSize: 13 }}>{reply.authorName}</strong>
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(reply.createdAt).toLocaleString()}</span>
                                            </div>
                                            <p style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                                {reply.content}
                                            </p>
                                            {reply.isFromMe && <div style={{ fontSize: 10, color: 'var(--primary)', marginTop: 4, fontWeight: 600 }}>Sent by SocialFlow</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Reply Box */}
                            <div style={{ padding: '20px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                                <textarea
                                    className="form-textarea"
                                    rows={3}
                                    placeholder={`Reply to ${selectedMessage.authorName} as ${selectedMessage.pageName}...`}
                                    value={replyContent}
                                    onChange={e => setReplyContent(e.target.value)}
                                    style={{ marginBottom: 16, resize: 'none' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleReply}
                                        disabled={!replyContent.trim() || sendingReply}
                                    >
                                        {sendingReply ? 'Sending...' : '📤 Send Reply'}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: 48, marginBottom: 16 }}>📥</div>
                            <div style={{ fontSize: 16 }}>Select a message to view the conversation</div>
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    );
}

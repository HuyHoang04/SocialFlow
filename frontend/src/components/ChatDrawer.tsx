'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api, getUser } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';
import {
    IconMessageCircle, IconSend, IconPlus,
    IconTrash, IconRefreshCw, IconSparkles,
    IconUsers, IconZap, IconChevronLeft,
    IconHistory, IconX, IconBarChart,
    IconFileText, IconTrendingUp
} from '@/components/Icons';

// ─── Markdown renderer using react-markdown + remark-gfm ──────────────────
function MarkdownMessage({ content }: { content: string }) {
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
    let codeBlockCounter = 0;

    const copyCode = (code: string, idx: number) => {
        navigator.clipboard.writeText(code).then(() => {
            setCopiedIdx(idx);
            setTimeout(() => setCopiedIdx(null), 1500);
        });
    };

    return (
        <div className="md-root">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // ─ Code blocks
                    code({ node, className, children, ...props }: any) {
                        const isBlock = !props.inline;
                        const lang = (className || '').replace('language-', '') || 'code';
                        const raw = String(children).replace(/\n$/, '');
                        // Pretty-print JSON
                        let display = raw;
                        if (lang === 'json' || (lang === 'code' && raw.trimStart().startsWith('{'))) {
                            try { display = JSON.stringify(JSON.parse(raw), null, 2); } catch { }
                        }
                        if (isBlock) {
                            const idx = codeBlockCounter++;
                            return (
                                <div className="md-code-block">
                                    <div className="md-code-header">
                                        <span className="md-code-lang">{lang}</span>
                                        <button className="md-copy-btn" onClick={() => copyCode(display, idx)}>
                                            {copiedIdx === idx ? '✓ Copied' : 'Copy'}
                                        </button>
                                    </div>
                                    <pre className="md-pre"><code>{display}</code></pre>
                                </div>
                            );
                        }
                        return <code className="md-inline-code" {...props}>{children}</code>;
                    },
                    // ─ Tables
                    table({ children }: any) { return <div className="md-table-wrap"><table className="md-table">{children}</table></div>; },
                    thead({ children }: any) { return <thead>{children}</thead>; },
                    tbody({ children }: any) { return <tbody>{children}</tbody>; },
                    tr({ children }: any) { return <tr>{children}</tr>; },
                    th({ children }: any) { return <th className="md-th">{children}</th>; },
                    td({ children }: any) { return <td className="md-td">{children}</td>; },
                    // ─ Typography
                    h1({ children }: any) { return <h3 className="md-heading">{children}</h3>; },
                    h2({ children }: any) { return <h4 className="md-heading">{children}</h4>; },
                    h3({ children }: any) { return <h5 className="md-heading">{children}</h5>; },
                    p({ children }: any) { return <p className="md-p">{children}</p>; },
                    ul({ children }: any) { return <ul className="md-ul">{children}</ul>; },
                    ol({ children }: any) { return <ol className="md-ol">{children}</ol>; },
                    li({ children }: any) { return <li className="md-li">{children}</li>; },
                    hr() { return <hr className="md-hr" />; },
                    strong({ children }: any) { return <strong>{children}</strong>; },
                    em({ children }: any) { return <em>{children}</em>; },
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
// ─────────────────────────────────────────────────────────────────────────

export default function ChatDrawer() {
    const { selectedBrand: brand } = useBrand();
    const [isOpen, setIsOpen] = useState(false);
    const [sessions, setSessions] = useState<any[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [attachedContext, setAttachedContext] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const user = getUser();

    const [iconOffset, setIconOffset] = useState({ x: 0, y: 0 });
    const [drawerSize, setDrawerSize] = useState({ width: 450, height: 600 });
    const isDraggingIconRef = useRef(false);
    const isResizingDrawerRef = useRef(false);
    const startMousePosRef = useRef({ x: 0, y: 0 });
    const startOffsetRef = useRef({ x: 0, y: 0 });
    const startResizeMousePosRef = useRef({ x: 0, y: 0 });
    const startDrawerSizeRef = useRef({ width: 450, height: 600 });
    const resizeDirRef = useRef<'left' | 'top' | 'corner' | null>(null);
    const [hasMovedIcon, setHasMovedIcon] = useState(false);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDraggingIconRef.current) {
                const deltaX = startMousePosRef.current.x - e.clientX;
                const deltaY = startMousePosRef.current.y - e.clientY;
                
                if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                    setHasMovedIcon(true);
                }
                
                setIconOffset({
                    x: startOffsetRef.current.x + deltaX,
                    y: startOffsetRef.current.y + deltaY
                });
            }
            
            if (isResizingDrawerRef.current) {
                const deltaX = startResizeMousePosRef.current.x - e.clientX;
                const deltaY = startResizeMousePosRef.current.y - e.clientY;
                
                const dir = resizeDirRef.current;
                const maxWidth = window.innerWidth - 60;
                const maxHeight = window.innerHeight - 120;
                
                setDrawerSize({
                    width: (dir === 'left' || dir === 'corner') ? Math.min(maxWidth, Math.max(320, startDrawerSizeRef.current.width + deltaX)) : startDrawerSizeRef.current.width,
                    height: (dir === 'top' || dir === 'corner') ? Math.min(maxHeight, Math.max(400, startDrawerSizeRef.current.height + deltaY)) : startDrawerSizeRef.current.height
                });
            }
        };

        const handleMouseUp = () => {
            isDraggingIconRef.current = false;
            isResizingDrawerRef.current = false;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const onIconMouseDown = (e: React.MouseEvent) => {
        isDraggingIconRef.current = true;
        startMousePosRef.current = { x: e.clientX, y: e.clientY };
        startOffsetRef.current = iconOffset;
        setHasMovedIcon(false);
        e.preventDefault();
    };

    const onResizeMouseDown = (e: React.MouseEvent, dir: 'left' | 'top' | 'corner') => {
        isResizingDrawerRef.current = true;
        resizeDirRef.current = dir;
        startResizeMousePosRef.current = { x: e.clientX, y: e.clientY };
        startDrawerSizeRef.current = drawerSize;
        e.preventDefault();
        e.stopPropagation();
    };

    const handleToggle = () => {
        if (!hasMovedIcon) {
            setIsOpen(!isOpen);
        }
        setHasMovedIcon(false);
    };

    const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    const loadSessions = useCallback(async () => {
        if (!brand) return;
        setSessionsLoading(true);
        try {
            const data = await api.getChatSessions(brand.id);
            setSessions(data || []);
        } catch (err: any) {
            console.error('Failed to load chat sessions:', err);
        } finally {
            setSessionsLoading(false);
        }
    }, [brand]);

    const [attachedContexts, setAttachedContexts] = useState<any[]>([]);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const handleExternalOpen = (e: any) => {
            const { message, contextData } = e.detail || {};
            setIsOpen(true);

            if (contextData) {
                // Determine descriptive tag and label
                let tag = "@Reference";
                let label = "Selected Data";
                const contentText = contextData.postContent || contextData.text || contextData.query || "";

                if (contextData.totalFollowers !== undefined) {
                    const brandName = brand?.name || "Brand";
                    tag = `@Overview:${brandName.replace(/\s+/g, '_')}`;
                    label = `${brandName} Overview`;
                } else if (contextData.postId || contextData.postContent || contextData.text) {
                    const shortTag = contentText.slice(0, 15).replace(/\s+/g, '_');
                    tag = `@Post:${shortTag}`;
                    const author = contextData.pageName || contextData.author || "";
                    label = `${author ? `[${author}] ` : ""}${contentText.slice(0, 20)}...`;
                } else if (contextData.query || contextData.traffic) {
                    const queryTag = (contextData.query || "Topic").slice(0, 15).replace(/\s+/g, '_');
                    tag = `@Trend:${queryTag}`;
                    label = contextData.query || "Trending Topic";
                }

                // Prepare context for state
                const newContext = {
                    ...contextData,
                    _id: Math.random().toString(36).substr(2, 9),
                    _tag: tag,
                    _displayLabel: label,
                    _iconType: tag.split(':')[0].substring(1).toLowerCase()
                };

                setAttachedContexts(prev => {
                    // Avoid duplicates by checking tag
                    if (prev.some(c => c._tag === tag)) return prev;
                    return [...prev, newContext];
                });

                setInput(prev => {
                    if (!prev.includes(tag)) {
                        return `${tag} ${prev}`.trim() + " ";
                    }
                    return prev;
                });

                setTimeout(() => inputRef.current?.focus(), 300);
            } else if (message) {
                setInput(message);
            }
        };

        window.addEventListener('socialflow-chat-open', handleExternalOpen);
        return () => window.removeEventListener('socialflow-chat-open', handleExternalOpen);
    }, [brand]);

    const loadHistory = useCallback(async (sessionId: string) => {
        setLoading(true);
        try {
            const history = await api.getChatHistory(sessionId);
            setMessages(history.map((m: any) => ({
                role: m.role.toLowerCase(),
                content: m.content,
                timestamp: m.createdAt
            })));
        } catch (err: any) {
            console.error('Failed to load chat history:', err);
            setError('Failed to load chat history');
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSelectSession = (sessionId: string) => {
        setActiveSessionId(sessionId);
        loadHistory(sessionId);
        setShowHistory(false);
    };

    const handleNewChat = () => {
        setActiveSessionId(null);
        setMessages([]);
        setInput('');
        setShowHistory(false);
    };

    const handleSendMessage = async () => {
        if (!input.trim() || !brand || !user) return;

        const userMsg = { role: 'user', content: input.trim() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);
        setError(null);

        const currentContexts = [...attachedContexts];
        setAttachedContexts([]);

        const sessionId = activeSessionId || generateUUID();
        if (!activeSessionId) setActiveSessionId(sessionId);

        try {
            const response = await api.sendChatMessage({
                brand_id: brand.id,
                user_id: user.userId,
                session_id: sessionId,
                message: userMsg.content,
                context_data: currentContexts.length > 0 ? JSON.stringify(currentContexts) : undefined
            });

            if (response && response.answer) {
                setMessages(prev => [...prev, { role: 'assistant', content: response.answer }]);
            }
            loadSessions();
        } catch (err: any) {
            console.error('Failed to send message:', err);
            setError('Failed to get response');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        if (!confirm('Delete this conversation?')) return;
        try {
            await api.deleteChatSession(sessionId);
            if (activeSessionId === sessionId) {
                setActiveSessionId(null);
                setMessages([]);
            }
            loadSessions();
        } catch (err: any) {
            console.error('Failed to delete session:', err);
        }
    };

    if (!brand) return null;

    return (
        <>
            {/* Floating Toggle Button */}
            <button
                className={`chat-toggle ${isOpen ? 'active' : ''}`}
                onMouseDown={onIconMouseDown}
                onClick={handleToggle}
                title="AI Assistant"
                style={{
                    right: `${30 + iconOffset.x}px`,
                    bottom: `${30 + iconOffset.y}px`,
                    cursor: 'grab'
                }}
            >
                {isOpen ? <IconX size={24} /> : <img src="/logoAI.svg" alt="Evie" style={{ width: 64, height: 64, filter: 'drop-shadow(0 0 8px var(--accent-glow))' }} />}
            </button>

            {/* Sliding Drawer */}
            <div 
                className={`chat-drawer ${isOpen ? 'open' : ''}`}
                style={{
                    right: `${30 + iconOffset.x}px`,
                    bottom: `${100 + iconOffset.y}px`,
                    width: `${drawerSize.width}px`,
                    height: `${drawerSize.height}px`,
                }}
            >
                {/* Resize handles */}
                <div className="resize-handle resize-left" onMouseDown={(e) => onResizeMouseDown(e, 'left')} />
                <div className="resize-handle resize-top" onMouseDown={(e) => onResizeMouseDown(e, 'top')} />
                <div className="resize-handle resize-corner" onMouseDown={(e) => onResizeMouseDown(e, 'corner')} />
                <div className="drawer-header">
                    <div className="header-info">
                        <div className="ai-avatar" style={{ background: 'transparent' }}>
                            <img src="/logoAI.svg" alt="Evie" style={{ width: 48, height: 48 }} />
                        </div>
                        <div>
                            <h3>Chat with Evie</h3>
                            <span className="status-online">● Online</span>
                        </div>
                    </div>
                    <div className="header-actions">
                        <button className="icon-btn" onClick={() => setShowHistory(!showHistory)} title="History">
                            <IconHistory size={20} />
                        </button>
                        <button className="icon-btn" onClick={handleNewChat} title="New Chat">
                            <IconPlus size={20} />
                        </button>
                    </div>
                </div>

                <div className="drawer-body">
                    {showHistory ? (
                        <div className="history-popup">
                            <div className="history-header">
                                <h4>Recent Conversations</h4>
                                <button className="icon-btn" onClick={() => setShowHistory(false)}>
                                    <IconX size={16} />
                                </button>
                            </div>
                            <div className="history-list">
                                {sessionsLoading ? (
                                    <div className="flex-center p-4"><IconRefreshCw className="spin" size={20} /></div>
                                ) : sessions.length === 0 ? (
                                    <div className="p-4 text-center text-muted">No history found</div>
                                ) : (
                                    sessions.map(s => (
                                        <div
                                            key={s.sessionId}
                                            className={`history-item ${activeSessionId === s.sessionId ? 'active' : ''}`}
                                            onClick={() => handleSelectSession(s.sessionId)}
                                        >
                                            <IconMessageCircle size={14} />
                                            <span className="history-preview">{s.lastMessage || 'New Chat'}</span>
                                            <button
                                                className="delete-btn"
                                                onClick={(e) => handleDeleteSession(e, s.sessionId)}
                                            >
                                                <IconTrash size={12} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="chat-messages">
                            {messages.length === 0 && !loading ? (
                                <div className="chat-welcome" style={{ padding: '20px 0' }}>
                                    <div className="message-row assistant">
                                        <div className="message-bubble">
                                            Hello! I'm <b>Evie</b> ✨<br /><br />
                                            Your AI social media assistant. I can help you write content or analyze performance. What's on your mind?
                                        </div>
                                    </div>
                                    <div className="quick-chips" style={{ marginTop: 12, padding: '0 16px' }}>
                                        <button onClick={() => setInput('Help me create a new marketing campaign for...')}>🚀 Start Campaign</button>
                                        <button onClick={() => setInput('Write a viral post about...')}>📝 Create Viral Post</button>
                                        <button onClick={() => setInput('Give me 5 post ideas for my brand')}>💡 Content Ideas</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {messages.map((m, idx) => (
                                        <div key={idx} className={`message-row ${m.role}`}>
                                            <div className="message-bubble">
                                                {m.role === 'assistant'
                                                    ? <MarkdownMessage content={m.content} />
                                                    : m.content
                                                }
                                            </div>
                                        </div>
                                    ))}
                                    {loading && (
                                        <div className="message-row assistant">
                                            <div className="message-bubble typing">
                                                <span></span><span></span><span></span>
                                            </div>
                                        </div>
                                    )}
                                    {error && <div className="error-text">{error}</div>}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="drawer-footer">
                    {attachedContexts.length > 0 && (
                        <div className="copilot-tags-container">
                            {attachedContexts.map((ctx) => (
                                <div key={ctx._id} className="copilot-tag">
                                    <div className="tag-icon">
                                        {ctx._iconType === 'overview' ? <IconBarChart size={14} /> :
                                            ctx._iconType === 'post' ? <IconFileText size={14} /> : <IconTrendingUp size={14} />}
                                    </div>
                                    <span className="tag-label">
                                        {ctx._displayLabel}
                                    </span>
                                    <button
                                        className="tag-remove"
                                        onClick={() => {
                                            setAttachedContexts(prev => prev.filter(c => c._id !== ctx._id));
                                            setInput(prev => prev.replace(ctx._tag, '').trim());
                                        }}
                                    >
                                        <IconX size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="input-wrapper">
                        <textarea
                            ref={inputRef}
                            placeholder="Type a message..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            rows={1}
                        />
                        <button
                            className={`send-btn ${!input.trim() || loading ? 'disabled' : ''}`}
                            onClick={handleSendMessage}
                            disabled={!input.trim() || loading}
                        >
                            <IconSend size={18} />
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .chat-toggle {
                    position: fixed;
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: var(--primary);
                    color: white;
                    border: none;
                    box-shadow: 0 4px 20px var(--primary-glow);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .chat-toggle:hover {
                    transform: scale(1.1) rotate(5deg);
                }
                .chat-toggle.active {
                    background: var(--bg-glass);
                    color: var(--text-primary);
                    border: 1px solid var(--border);
                }

                .chat-drawer {
                    position: fixed;
                    background: var(--bg-glass);
                    backdrop-filter: blur(20px);
                    border: 1px solid var(--border);
                    border-radius: 20px;
                    display: flex;
                    flex-direction: column;
                    z-index: 999;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                    transform: translateY(20px) scale(0.95);
                    opacity: 0;
                    pointer-events: none;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    overflow: hidden;
                }

                /* Resize handles */
                .resize-handle {
                    position: absolute;
                    z-index: 1000;
                }
                .resize-left {
                    top: 0; left: 0; bottom: 0;
                    width: 8px;
                    cursor: w-resize;
                }
                .resize-top {
                    top: 0; left: 0; right: 0;
                    height: 8px;
                    cursor: n-resize;
                }
                .resize-corner {
                    top: 0; left: 0;
                    width: 16px; height: 16px;
                    cursor: nwse-resize;
                    z-index: 1001;
                }
                .resize-handle:hover {
                    background: rgba(255,255,255,0.05);
                }
                .chat-drawer.open {
                    transform: translateY(0) scale(1);
                    opacity: 1;
                    pointer-events: auto;
                }

                .drawer-header {
                    padding: 16px 20px;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(255,255,255,0.02);
                }
                .header-info {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .ai-avatar {
                    width: 36px;
                    height: 36px;
                    background: var(--primary);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 0 10px var(--primary-glow);
                }
                .header-info h3 { margin: 0; font-size: 15px; font-weight: 700; }
                .status-online { font-size: 10px; color: var(--success); font-weight: 600; }

                .header-actions { display: flex; gap: 8px; }
                .icon-btn {
                    background: none; border: none; color: #71717a; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    width: 32px; height: 32px; border-radius: 8px; transition: all 0.2s;
                }
                .icon-btn:hover { background: rgba(255,255,255,0.05); color: white; }

                .drawer-body {
                    flex: 1;
                    overflow-y: auto;
                    position: relative;
                }
                .chat-messages {
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .chat-welcome {
                    padding: 20px 0;
                }
                .quick-chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; padding: 0 16px; }
                .quick-chips button {
                    background: rgba(255,255,255,0.05); border: 1px solid var(--border);
                    color: white; padding: 8px 16px; border-radius: 12px; font-size: 13px;
                    cursor: pointer; transition: all 0.2s;
                }
                .quick-chips button:hover {
                    background: rgba(108, 92, 231, 0.1); border-color: var(--primary);
                    transform: translateY(-2px);
                }

                .message-row { display: flex; margin-bottom: 8px; }
                .message-row.user { justify-content: flex-end; }
                .message-bubble {
                    padding: 10px 14px;
                    border-radius: 18px;
                    font-size: 14px;
                    max-width: 85%;
                    line-height: 1.4;
                }
                .user .message-bubble {
                    background: var(--primary);
                    color: white;
                    border-bottom-right-radius: 4px;
                }
                .assistant .message-bubble {
                    background: rgba(255,255,255,0.08);
                    border-bottom-left-radius: 4px;
                    max-width: 92%;
                }

                .chat-welcome {
                    flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
                    padding: 40px 20px; text-align: center;
                }
                .evie-avatar {
                    width: 56px; height: 56px; background: linear-gradient(135deg, #6c5ce7, #a29bfe);
                    border-radius: 20px; display: flex; align-items: center; justify-content: center;
                    margin-bottom: 20px; box-shadow: 0 10px 20px rgba(108, 92, 231, 0.3);
                }
                .chat-welcome h3 { margin: 0 0 10px; font-size: 20px; font-weight: 700; color: white; }
                .chat-welcome p { margin: 0 0 24px; font-size: 14px; color: var(--text-muted); line-height: 1.5; }
                .quick-chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
                .quick-chips button {
                    background: rgba(255,255,255,0.05); border: 1px solid var(--border);
                    color: white; padding: 8px 16px; border-radius: 12px; font-size: 13px;
                    cursor: pointer; transition: all 0.2s;
                }
                .quick-chips button:hover {
                    background: rgba(108, 92, 231, 0.1); border-color: var(--primary);
                    transform: translateY(-2px);
                }

                .history-popup {
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: var(--bg-glass);
                    z-index: 10;
                    display: flex;
                    flex-direction: column;
                }
                .history-header {
                    padding: 12px 16px;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .history-header h4 { margin: 0; font-size: 14px; }
                .history-list { flex: 1; overflow-y: auto; padding: 8px; }
                .history-item {
                    padding: 10px 12px;
                    border-radius: 10px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 4px;
                    transition: all 0.2s;
                    position: relative;
                }
                .history-item:hover { background: rgba(255,255,255,0.05); }
                .history-item.active { background: var(--primary-glow); border: 1px solid var(--primary); }
                .history-preview {
                    flex: 1; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .delete-btn {
                    opacity: 0; background: none; border: none; color: var(--text-muted); cursor: pointer;
                }
                .history-item:hover .delete-btn { opacity: 1; }

                .drawer-footer {
                    padding: 16px;
                    border-top: 1px solid var(--border);
                    background: rgba(255,255,255,0.02);
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .copilot-tags-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    padding-bottom: 4px;
                }
                .copilot-tag {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(108, 92, 231, 0.08);
                    border: 1px solid rgba(108, 92, 231, 0.2);
                    border-radius: 8px;
                    padding: 6px 10px;
                    align-self: flex-start;
                    animation: fadeInScale 0.2s ease-out;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                }
                @keyframes fadeInScale {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .tag-icon {
                    color: var(--primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .tag-label {
                    font-size: 12px;
                    font-weight: 600;
                    color: var(--text-primary);
                }
                .tag-remove {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    padding: 2px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                    transition: all 0.2s;
                }
                .tag-remove:hover {
                    background: rgba(255, 71, 87, 0.1);
                    color: #ff4757;
                }

                .input-wrapper {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid var(--border);
                    border-radius: 20px;
                    padding: 8px 12px;
                    display: flex;
                    align-items: flex-end;
                    gap: 10px;
                }
                textarea {
                    flex: 1; background: none; border: none; color: white; outline: none; padding: 4px 0;
                    font-family: inherit; font-size: 14px; resize: none; max-height: 100px;
                }
                .send-btn {
                    background: var(--primary); color: white; border: none; width: 32px; height: 32px;
                    border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;
                }
                .send-btn.disabled { opacity: 0.5; cursor: not-allowed; }

                .typing span {
                    width: 5px; height: 5px; background: var(--text-muted); border-radius: 50%;
                    display: inline-block; margin: 0 1px; animation: bounce 1.4s infinite ease-in-out;
                }
                .typing span:nth-child(1) { animation-delay: -0.32s; }
                .typing span:nth-child(2) { animation-delay: -0.16s; }
                @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>

            {/* Global styles for MarkdownMessage — must be global because it's a separate component */}
            <style jsx global>{`
                .md-root { display: flex; flex-direction: column; gap: 6px; font-size: 13.5px; }
                .md-p { margin: 0; line-height: 1.7; }
                .md-heading {
                    margin: 14px 0 6px;
                    font-weight: 700;
                    color: white;
                    padding-left: 10px;
                    border-left: 3px solid #6c5ce7;
                }
                h3.md-heading { font-size: 15px; }
                h4.md-heading { font-size: 14px; }
                h5.md-heading { font-size: 13px; border-left-color: rgba(162,155,254,0.5); }
                .md-ul, .md-ol {
                    margin: 6px 0;
                    padding-left: 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                .md-ul { list-style: disc; }
                .md-ol { list-style: decimal; }
                .md-li { padding-left: 4px; line-height: 1.7; }
                .md-li > .md-ul, .md-li > .md-ol {
                    margin: 6px 0 2px;
                    padding-left: 20px;
                    gap: 3px;
                }
                .md-li > .md-ul { list-style: circle; }
                .md-li > .md-ol { list-style: lower-alpha; }
                .md-hr { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 12px 0; }
                .md-inline-code {
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 4px;
                    padding: 1px 5px;
                    font-family: 'JetBrains Mono', 'Fira Code', monospace;
                    font-size: 12px;
                    color: #a29bfe;
                }
                .md-table-wrap {
                    overflow-x: auto;
                    margin: 8px 0;
                    border-radius: 8px;
                    border: 1px solid rgba(255,255,255,0.12);
                }
                .md-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                }
                .md-th {
                    background: rgba(108,92,231,0.15);
                    color: #a29bfe;
                    font-weight: 600;
                    padding: 7px 10px;
                    text-align: left;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    white-space: nowrap;
                }
                .md-td {
                    padding: 6px 10px;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    color: #a1a1aa;
                    vertical-align: top;
                    line-height: 1.55;
                }
                .md-table tbody tr:last-child .md-td { border-bottom: none; }
                .md-table tbody tr:hover { background: rgba(255,255,255,0.03); }
                .md-code-block {
                    background: rgba(0,0,0,0.35);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 10px;
                    overflow: hidden;
                    margin: 6px 0;
                }
                .md-code-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 5px 10px;
                    background: rgba(255,255,255,0.04);
                    border-bottom: 1px solid rgba(255,255,255,0.08);
                }
                .md-code-lang {
                    font-size: 11px;
                    color: #71717a;
                    font-family: monospace;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .md-copy-btn {
                    background: rgba(108,92,231,0.15);
                    border: 1px solid rgba(108,92,231,0.3);
                    color: #a29bfe;
                    font-size: 11px;
                    padding: 2px 8px;
                    border-radius: 5px;
                    cursor: pointer;
                    transition: background 0.15s;
                }
                .md-copy-btn:hover { background: rgba(108,92,231,0.3); }
                .md-pre {
                    margin: 0;
                    padding: 10px 12px;
                    overflow-x: auto;
                    white-space: pre-wrap;
                    word-break: break-word;
                    font-family: 'JetBrains Mono', 'Fira Code', monospace;
                    font-size: 12px;
                    line-height: 1.6;
                    color: #e2e8f0;
                }
            `}</style>
        </>
    );
}

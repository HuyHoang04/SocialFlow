'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api, getUser } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';
import { 
    IconMessageCircle, IconSend, IconPlus, 
    IconTrash, IconRefreshCw, IconSparkles,
    IconUsers, IconZap, IconChevronLeft,
    IconHistory, IconX
} from '@/components/Icons';

export default function ChatDrawer() {
    const { selectedBrand: brand } = useBrand();
    const [isOpen, setIsOpen] = useState(false);
    const [sessions, setSessions] = useState<any[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const user = getUser();

    const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
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

    useEffect(() => {
        if (isOpen) loadSessions();
    }, [isOpen, loadSessions]);

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

        const sessionId = activeSessionId || generateUUID();
        if (!activeSessionId) setActiveSessionId(sessionId);

        try {
            const response = await api.sendChatMessage({
                brand_id: brand.id,
                user_id: user.userId,
                session_id: sessionId,
                message: userMsg.content
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
                onClick={() => setIsOpen(!isOpen)}
                title="AI Assistant"
            >
                {isOpen ? <IconX size={24} /> : <IconZap size={24} />}
            </button>

            {/* Sliding Drawer */}
            <div className={`chat-drawer ${isOpen ? 'open' : ''}`}>
                <div className="drawer-header">
                    <div className="header-info">
                        <div className="ai-avatar">
                            <IconZap size={18} color="white" />
                        </div>
                        <div>
                            <h3>AI Assistant</h3>
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
                                <div className="chat-welcome">
                                    <IconSparkles size={40} color="var(--primary)" />
                                    <h3>How can I help you?</h3>
                                    <div className="suggestions">
                                        <button onClick={() => setInput('Write a post about...')}>"Write a post..."</button>
                                        <button onClick={() => setInput('Optimize my hashtags')}>"Optimize hashtags"</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {messages.map((m, idx) => (
                                        <div key={idx} className={`message-row ${m.role}`}>
                                            <div className="message-bubble">
                                                {m.content}
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
                    <div className="input-wrapper">
                        <textarea 
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
                    bottom: 30px;
                    right: 30px;
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
                    bottom: 100px;
                    right: 30px;
                    width: 380px;
                    height: 600px;
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
                    text-align: center;
                    padding: 40px 20px;
                }
                .suggestions {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin-top: 20px;
                }
                .suggestions button {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid var(--border);
                    padding: 8px 12px;
                    border-radius: 10px;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .suggestions button:hover { background: var(--primary-glow); }

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
        </>
    );
}

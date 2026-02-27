'use client';
import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import AppShell from '@/components/AppShell';

/* global FB */
declare global {
    interface Window {
        FB: {
            init: (params: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
            login: (callback: (response: { authResponse?: { accessToken: string } }) => void, options: { scope: string }) => void;
            getLoginStatus: (callback: (response: { status: string }) => void) => void;
        };
        fbAsyncInit: () => void;
    }
}

const FB_APP_ID = '1867627970477000';

interface Brand { id: string; name: string; connectionCount: number; }
interface Connection {
    id: string; platform: string; accountName: string; accountId: string;
    createdAt: string; pageCount: number;
}

const PLATFORMS = [
    {
        key: 'facebook',
        name: 'Facebook',
        description: 'Connect your Facebook Pages to publish posts, photos and updates.',
        color: '#1877f2',
        gradient: 'linear-gradient(135deg, #1877f2, #42a5f5)',
        icon: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
        ),
    },
    {
        key: 'twitter',
        name: 'X / Twitter',
        description: 'Connect your X account to post tweets and threads.',
        color: '#000000',
        gradient: 'linear-gradient(135deg, #15202b, #1d9bf0)',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
        ),
    },
    {
        key: 'linkedin',
        name: 'LinkedIn',
        description: 'Connect your LinkedIn profile or company pages to share professional content.',
        color: '#0a66c2',
        gradient: 'linear-gradient(135deg, #0a66c2, #0096d6)',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
        ),
    },
];

function AccountsContent() {
    const searchParams = useSearchParams();
    const brandIdParam = searchParams.get('brandId');
    const connectedParam = searchParams.get('connected');

    const [brands, setBrands] = useState<Brand[]>([]);
    const [selectedBrand, setSelectedBrand] = useState<string | null>(
        brandIdParam || null
    );
    const [connections, setConnections] = useState<Connection[]>([]);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState(connectedParam || '');
    const fbLoaded = useRef(false);

    // Load Facebook SDK
    useEffect(() => {
        if (fbLoaded.current) return;
        fbLoaded.current = true;

        window.fbAsyncInit = function () {
            window.FB.init({
                appId: FB_APP_ID,
                cookie: true,
                xfbml: true,
                version: 'v18.0',
            });
        };

        // Load SDK script
        const script = document.createElement('script');
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
    }, []);

    const loadBrands = useCallback(async () => {
        const b = await api.getBrands();
        setBrands(b);
        if (!selectedBrand && b.length > 0) setSelectedBrand(b[0].id);
        setLoading(false);
    }, [selectedBrand]);

    useEffect(() => { loadBrands(); }, [loadBrands]);

    const loadConnections = useCallback(async () => {
        if (!selectedBrand) return;
        const c = await api.getConnections(selectedBrand);
        setConnections(c);
    }, [selectedBrand]);

    useEffect(() => { loadConnections(); }, [loadConnections]);

    // ========== Connect handlers ==========

    const connectFacebook = () => {
        if (!selectedBrand || !window.FB) return;
        setConnecting('facebook');

        window.FB.login((response) => {
            if (response.authResponse) {
                const accessToken = response.authResponse.accessToken;
                // Send token to backend
                api.facebookConnect({ accessToken, brandId: selectedBrand })
                    .then(() => {
                        setSuccessMsg('Facebook');
                        loadConnections();
                    })
                    .catch((err: Error) => {
                        alert('Facebook connect failed: ' + err.message);
                    })
                    .finally(() => setConnecting(null));
            } else {
                setConnecting(null);
            }
        }, { scope: 'pages_manage_posts,pages_read_engagement,pages_show_list' });
    };

    const connectPlatformRedirect = async (platform: string) => {
        if (!selectedBrand) return;
        setConnecting(platform);
        try {
            const res = await api.getOAuthUrl(platform, selectedBrand);
            window.location.href = res.url;
        } catch {
            setConnecting(null);
        }
    };

    const handleConnect = (platform: string) => {
        if (platform === 'facebook') {
            connectFacebook();
        } else {
            connectPlatformRedirect(platform);
        }
    };

    const disconnect = async (id: string) => {
        if (!confirm('Disconnect this account? All associated pages will be removed.')) return;
        await api.deleteConnection(id);
        loadConnections();
    };

    const isConnected = (platform: string) =>
        connections.some(c => c.platform === platform.toUpperCase());

    const getConnection = (platform: string) =>
        connections.find(c => c.platform === platform.toUpperCase());

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Connected Accounts</h1>
                    <p className="page-subtitle">Link your social media platforms to start publishing</p>
                </div>
            </div>

            {successMsg && (
                <div className="success-msg" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 20 }}>🎉</span>
                    <div>
                        <strong>{successMsg}</strong> connected successfully! Your pages have been imported.
                    </div>
                    <button onClick={() => setSuccessMsg('')}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer', fontSize: 18 }}>✕</button>
                </div>
            )}

            {loading ? (
                <div className="loading-center"><div className="spinner" /></div>
            ) : brands.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">🏢</div>
                    <div className="empty-state-title">No brands yet</div>
                    <div className="empty-state-text">Create a brand from the Dashboard first, then come back to connect accounts</div>
                </div>
            ) : (
                <>
                    {/* Brand Selector */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 16,
                        marginBottom: 36, padding: '16px 20px',
                        background: 'var(--bg-glass)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)', maxWidth: 400
                    }}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: 600 }}>
                            BRAND
                        </span>
                        <select className="form-input" value={selectedBrand || ''}
                            onChange={e => setSelectedBrand(e.target.value)}
                            style={{ background: 'transparent', border: 'none', padding: '4px 0', fontSize: 15, fontWeight: 600 }}>
                            {brands.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Platform Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                        {PLATFORMS.map(platform => {
                            const conn = getConnection(platform.key);
                            const connectedState = isConnected(platform.key);
                            const isLoading = connecting === platform.key;

                            return (
                                <div key={platform.key} style={{
                                    background: 'var(--bg-card)',
                                    border: `1px solid ${connectedState ? platform.color + '40' : 'var(--border)'}`,
                                    borderRadius: 'var(--radius-lg)',
                                    overflow: 'hidden',
                                    transition: 'var(--transition)',
                                }}>
                                    {/* Platform Header */}
                                    <div style={{
                                        background: platform.gradient,
                                        padding: '24px 24px 20px',
                                        display: 'flex', alignItems: 'center', gap: 14,
                                    }}>
                                        <div style={{
                                            width: 48, height: 48, borderRadius: 12,
                                            background: 'rgba(255,255,255,0.2)',
                                            backdropFilter: 'blur(10px)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            {platform.icon}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 18, color: 'white' }}>
                                                {platform.name}
                                            </div>
                                            {connectedState && conn && (
                                                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
                                                    ✓ {conn.accountName}
                                                </div>
                                            )}
                                        </div>
                                        {connectedState && (
                                            <div style={{
                                                marginLeft: 'auto',
                                                background: 'rgba(255,255,255,0.25)',
                                                borderRadius: 100, padding: '4px 12px',
                                                fontSize: 11, fontWeight: 700, color: 'white',
                                                textTransform: 'uppercase', letterSpacing: '0.5px',
                                            }}>
                                                Connected
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Body */}
                                    <div style={{ padding: '20px 24px 24px' }}>
                                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
                                            {platform.description}
                                        </p>

                                        {connectedState && conn ? (
                                            <div>
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: '12px 16px',
                                                    background: 'var(--bg-glass)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    marginBottom: 12,
                                                }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{conn.accountName}</div>
                                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                            {conn.pageCount} page{conn.pageCount !== 1 ? 's' : ''} imported
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                        {new Date(conn.createdAt).toLocaleDateString('vi-VN')}
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}
                                                        onClick={() => handleConnect(platform.key)}>
                                                        🔄 Reconnect
                                                    </button>
                                                    <button className="btn btn-danger btn-sm" style={{ flex: 1 }}
                                                        onClick={() => disconnect(conn.id)}>
                                                        ✕ Disconnect
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleConnect(platform.key)}
                                                disabled={isLoading}
                                                style={{
                                                    width: '100%', padding: '12px 20px',
                                                    background: platform.gradient,
                                                    color: 'white', border: 'none',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: 14, fontWeight: 700,
                                                    cursor: isLoading ? 'wait' : 'pointer',
                                                    transition: 'var(--transition)',
                                                    opacity: isLoading ? 0.7 : 1,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                                    fontFamily: "'Inter', sans-serif",
                                                }}
                                                onMouseEnter={e => { if (!isLoading) { (e.currentTarget).style.transform = 'translateY(-2px)'; (e.currentTarget).style.boxShadow = `0 6px 24px ${platform.color}50`; } }}
                                                onMouseLeave={e => { (e.currentTarget).style.transform = 'none'; (e.currentTarget).style.boxShadow = 'none'; }}
                                            >
                                                {isLoading ? (
                                                    <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Connecting...</>
                                                ) : (
                                                    <>
                                                        {platform.key === 'facebook' ? '🔐 Continue with Facebook' :
                                                            platform.key === 'twitter' ? '🔗 Connect X / Twitter' :
                                                                '🔗 Connect LinkedIn'}
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Summary */}
                    {connections.length > 0 && (
                        <div style={{
                            marginTop: 40, padding: '20px 24px',
                            background: 'var(--bg-glass)', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            display: 'flex', alignItems: 'center', gap: 16,
                        }}>
                            <span style={{ fontSize: 24 }}>📊</span>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 15 }}>
                                    {connections.length} platform{connections.length !== 1 ? 's' : ''} connected
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                    {connections.reduce((sum, c) => sum + c.pageCount, 0)} total pages available for publishing
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </>
    );
}

export default function AccountsPage() {
    return (
        <AppShell>
            <Suspense fallback={<div className="loading-center"><div className="spinner" /></div>}>
                <AccountsContent />
            </Suspense>
        </AppShell>
    );
}

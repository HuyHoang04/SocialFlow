'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';

const FB_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '949895587790556';

interface Connection {
    id: string; platform: string; accountName: string; accountId: string;
    createdAt: string; pageCount: number;
    tokenExpiresAt: string | null; scopes: string | null;
}

const PLATFORMS = [
    {
        key: 'facebook',
        name: 'Facebook',
        description: 'Connect your Facebook Pages to publish posts, photos and updates.',
        color: '#1877f2',
        gradient: 'linear-gradient(135deg, #1877f2, #42a5f5)',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
        ),
    },
    {
        key: 'bluesky',
        name: 'Bluesky',
        description: 'Connect your Bluesky account with handle + app password. Free & unlimited.',
        color: '#0085ff',
        gradient: 'linear-gradient(135deg, #0085ff, #00c4ff)',
        icon: (
            <svg width="22" height="22" viewBox="0 0 568 501" fill="white">
                <path d="M123.121 33.6637C188.241 82.5526 258.281 181.681 284 234.873C309.719 181.681 379.759 82.5526 444.879 33.6637C491.866 -1.61183 568 -28.9064 568 72.4712C568 94.5618 555.803 226.059 549.334 250.153C531.468 318.632 463.641 336.403 398.533 332.304C512.198 350.867 540.233 413.179 473.167 475.477C417.533 527.389 370.818 508.123 301.671 408.221L284 381.186L266.329 408.221C197.182 508.123 150.467 527.389 94.8327 475.477C27.7672 413.179 55.8015 350.867 169.467 332.304C104.359 336.403 36.5323 318.632 18.6659 250.153C12.1969 226.059 0 94.5618 0 72.4712C0 -28.9064 76.1339 -1.61183 123.121 33.6637Z" />
            </svg>
        ),
    },
];

export default function AccountsContent() {
    const { selectedBrand: brand } = useBrand();
    const [connections, setConnections] = useState<Connection[]>([]);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const fbLoaded = useRef(false);
    const [bskyHandle, setBskyHandle] = useState('');
    const [bskyAppPassword, setBskyAppPassword] = useState('');
    const [showBskyForm, setShowBskyForm] = useState(false);

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
        const script = document.createElement('script');
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
    }, []);

    const loadConnections = useCallback(async () => {
        if (!brand) return;
        const c = await api.getConnections(brand.id);
        setConnections(c);
        setLoading(false);
    }, [brand]);

    useEffect(() => { loadConnections(); }, [loadConnections]);

    const handleConnect = (platform: string) => {
        if (platform === 'facebook') {
            if (!brand) return;
            if (!window.FB) {
                alert('Facebook SDK chưa tải xong. Vui lòng chờ vài giây rồi thử lại.');
                return;
            }
            setConnecting('facebook');
            window.FB.login((response) => {
                if (response.authResponse) {
                    api.facebookConnect({ accessToken: response.authResponse.accessToken, brandId: brand.id })
                        .then(() => { setSuccessMsg('Facebook'); loadConnections(); })
                        .catch((err: Error) => alert('Facebook connect failed: ' + err.message))
                        .finally(() => setConnecting(null));
                } else { setConnecting(null); }
            }, { scope: 'pages_manage_posts,pages_read_engagement,pages_read_user_content,pages_show_list,pages_manage_metadata,pages_messaging' });
        } else if (platform === 'bluesky') {
            setShowBskyForm(true);
        } else {
            if (!brand) return;
            setConnecting(platform);
            api.getOAuthUrl(platform, brand.id)
                .then(res => { window.location.href = res.url; })
                .catch(() => setConnecting(null));
        }
    };

    const connectBluesky = async () => {
        if (!brand || !bskyHandle || !bskyAppPassword) return;
        setConnecting('bluesky');
        try {
            await api.blueskyConnect({ handle: bskyHandle, appPassword: bskyAppPassword, brandId: brand.id });
            setSuccessMsg('Bluesky');
            setBskyHandle(''); setBskyAppPassword(''); setShowBskyForm(false);
            loadConnections();
        } catch (err: unknown) {
            alert('Bluesky connect failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally { setConnecting(null); }
    };

    const disconnect = async (id: string) => {
        if (!confirm('Disconnect this account? All associated pages will be removed.')) return;
        await api.deleteConnection(id);
        loadConnections();
    };

    if (loading) return <div className="loading-center"><div className="spinner" /></div>;

    return (
        <div>
            {successMsg && (
                <div className="success-msg" style={{ 
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'var(--success-bg)', border: '1px solid var(--success)',
                    padding: '12px 20px', borderRadius: 'var(--radius)',
                    marginBottom: 24, color: 'var(--text-primary)'
                }}>
                    <span style={{ fontSize: 20 }}>✨</span>
                    <div style={{ flex: 1, fontSize: 14 }}>
                        <strong style={{ color: 'var(--success)' }}>{successMsg}</strong> connected successfully!
                    </div>
                    <button onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
                {PLATFORMS.map(platform => {
                    const conn = connections.find(c => c.platform === platform.key.toUpperCase());
                    const connected = !!conn;
                    const isConnecting = connecting === platform.key;

                    return (
                        <div key={platform.key} className="platform-card-hover" style={{
                            background: 'var(--bg-card)', border: `1px solid ${connected ? 'var(--accent)' + '30' : 'var(--border)'}`,
                            borderRadius: 'var(--radius-lg)', overflow: 'hidden', transition: 'var(--transition)',
                            display: 'flex', flexDirection: 'column'
                        }}>
                            <div style={{ background: platform.gradient, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {platform.icon}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 16, color: 'white' }}>{platform.name}</div>
                                    {connected && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)' }}>Active</div>}
                                </div>
                            </div>

                            <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 20 }}>{platform.description}</p>
                                
                                {connected ? (
                                    <div style={{ marginTop: 'auto' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', marginBottom: 12 }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>{conn.accountName}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{conn.pageCount} pages</div>
                                            </div>
                                        </div>

                                        <div style={{ textAlign: 'right', marginBottom: 12 }}>
                                            <button onClick={() => setExpanded(prev => ({ ...prev, [platform.key]: !prev[platform.key] }))}
                                                style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                                {expanded[platform.key] ? 'Hide Details' : 'View Permissions'}
                                            </button>
                                        </div>

                                        {expanded[platform.key] && conn.scopes && (
                                            <div style={{ padding: '12px', marginBottom: 16, borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                    {conn.scopes.split(',').map((s: string, i: number) => (
                                                        <span key={i} style={{ padding: '2px 8px', background: 'var(--bg-glass-strong)', borderRadius: 4, fontSize: 9, fontWeight: 500 }}>{s.trim()}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => handleConnect(platform.key)}>🔄 Reconnect</button>
                                            <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => disconnect(conn.id)}>✕ Disconnect</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => handleConnect(platform.key)} disabled={isConnecting} className="btn btn-primary" style={{ marginTop: 'auto', background: platform.gradient }}>
                                        {isConnecting ? 'Connecting...' : `Connect ${platform.name}`}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {showBskyForm && (
                <div style={{ marginTop: 24, padding: 24, background: 'var(--bg-card)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-lg)', width: '100%' }}>
                    <h3 style={{ marginBottom: 16 }}>Connect Bluesky</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <input className="form-input" placeholder="Handle" value={bskyHandle} onChange={e => setBskyHandle(e.target.value)} />
                        <input className="form-input" type="password" placeholder="App Password" value={bskyAppPassword} onChange={e => setBskyAppPassword(e.target.value)} />
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn btn-primary" onClick={connectBluesky} disabled={connecting === 'bluesky'}>Connect</button>
                            <button className="btn btn-secondary" onClick={() => setShowBskyForm(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

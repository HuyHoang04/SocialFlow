'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';
import { useToast } from '@/components/Toast';
import AppConfigsModal from '@/components/AppConfigsModal';

// Load Facebook App ID from backend dynamically
let FB_APP_ID = '';

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
    // {
    //     key: 'twitter',
    //     name: 'X / Twitter',
    //     description: 'Connect your X account to post tweets and threads. Requires paid API ($200/mo).',
    //     color: '#000000',
    //     gradient: 'linear-gradient(135deg, #15202b, #1d9bf0)',
    //     icon: (
    //         <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
    //             <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    //         </svg>
    //     ),
    // },
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
    {
        key: 'threads',
        name: 'Threads',
        description: 'Connect your Threads (Meta) account to publish text posts. Free.',
        color: '#000000',
        gradient: 'linear-gradient(135deg, #333333, #666666)',
        icon: (
            <svg width="24" height="24" viewBox="0 0 192 192" fill="white">
                <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1365 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6071 106.601 81.0696 98.145 81.2576C72.5263 81.7884 56.2101 97.017 57.2124 118.975C57.7232 130.2 63.0948 139.743 72.3554 145.961C80.3286 151.387 90.6191 154.089 101.429 153.569C115.321 152.892 126.101 147.59 133.399 137.854C138.86 130.584 142.398 121.217 143.984 109.479C149.748 113.015 153.983 117.728 156.31 123.509C160.235 133.228 160.482 149.481 148.36 161.465C137.728 171.979 125.006 176.664 97.0394 176.837C66.1149 176.638 42.7177 167.348 27.2202 149.009C13.1612 132.213 5.79373 108.527 5.59473 78.5469C5.79373 48.5671 13.1612 24.8807 27.2202 8.08398C42.7177 -10.2555 66.1149 -19.5455 97.0394 -19.7445C128.161 -19.5438 151.684 -10.2275 167.383 8.16792C175.043 17.0667 180.965 28.2624 185.084 41.5475L201.28 37.2461C196.549 21.8594 189.602 8.96484 180.361 -1.55273C162.06 -22.717 136.006 -33.5728 97.0862 -33.7833L96.9929 -33.7833C58.1883 -33.5718 32.2703 -22.689 14.2105 -1.45117C-2.19299 18.7969 -10.2261 45.8887 -10.4452 78.5034L-10.4452 78.5903C-10.2261 111.205 -2.19299 138.297 14.2105 158.545C32.2703 179.783 58.1883 190.666 96.9929 190.877L97.0862 190.877C128.762 190.685 144.979 184.701 157.86 171.957C175.018 155.007 175.579 132.247 169.761 117.658C165.748 107.608 157.622 99.3115 146.113 93.5527C144.686 92.8019 143.142 90.8652 141.537 88.9883ZM100.885 139.63C88.5547 140.239 73.6563 134.876 73.1719 118.419C72.8126 106.288 81.7754 97.0322 98.4341 96.5547C100.233 96.5078 102.017 96.4844 103.786 96.4844C109.814 96.4844 115.502 97.0322 120.759 98.0898C118.916 126.385 110.417 139.174 100.885 139.63Z" />
            </svg>
        ),
    },
    {
        key: 'instagram',
        name: 'Instagram',
        description: 'Connect your Instagram account to publish photos, carousels and videos.',
        color: '#e1306c',
        gradient: 'linear-gradient(135deg, #e1306c, #fd1d1d, #f77737)',
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="white" strokeWidth="2" />
                <circle cx="12" cy="12" r="4" fill="none" stroke="white" strokeWidth="2" />
                <circle cx="17.5" cy="6.5" r="1.5" fill="white" />
            </svg>
        ),
    },
];

export default function AccountsContent() {
    const { selectedBrand: brand } = useBrand();
    const { toast } = useToast();
    const [connections, setConnections] = useState<Connection[]>([]);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState('');
    
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [showAppConfigModal, setShowAppConfigModal] = useState(false);
    const fbLoaded = useRef(false);
    const [bskyHandle, setBskyHandle] = useState('');
    const [bskyAppPassword, setBskyAppPassword] = useState('');
    const [showBskyForm, setShowBskyForm] = useState(false);

    // Initialize Facebook SDK with App ID from backend
    useEffect(() => {
        if (fbLoaded.current || !brand) return;
        fbLoaded.current = true;

        // Get Facebook App ID from backend to ensure consistency
        api.getOAuthUrl('facebook', brand.id)
            .then(res => {
                FB_APP_ID = res.clientId;
                // Initialize Facebook SDK
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
            })
            .catch(() => {
                // Fallback if backend call fails
                FB_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '949895587790556';
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
            });
    }, [brand]);

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
                toast('Facebook SDK chưa tải xong. Vui lòng chờ vài giây rồi thử lại.', 'error');
                return;
            }
            setConnecting('facebook');
            window.FB.login((response: any) => {
                if (response.authResponse) {
                    api.facebookConnect({ accessToken: response.authResponse.accessToken, brandId: brand.id })
                        .then(() => { setSuccessMsg('Facebook'); loadConnections(); })
                        .catch((err: Error) => toast('Facebook connect failed: ' + err.message, 'error'))
                        .finally(() => setConnecting(null));
                } else { setConnecting(null); }
            }, { scope: 'pages_manage_posts,pages_read_engagement,pages_read_user_content,pages_show_list,pages_manage_metadata,pages_messaging' });
        } else if (platform === 'bluesky') {
            setShowBskyForm(true);
        } else {
            if (!brand) return;
            setConnecting(platform);
            api.getOAuthUrl(platform, brand.id)
                .then(res => {
                    // Mở popup OAuth thay vì redirect toàn trang
                    const popup = window.open(res.url, `${platform}_auth`, 'width=600,height=700,resizable=yes,scrollbars=yes');
                    if (!popup) {
                        toast('Popup bị chặn. Vui lòng cho phép popup cho trang web này.', 'error');
                        setConnecting(null);
                        return;
                    }

                    // Listen postMessage từ popup callback
                    const handleMessage = (event: MessageEvent) => {
                        if (event.data?.type === 'oauth_success') {
                            window.removeEventListener('message', handleMessage);
                            clearInterval(checkPopup);
                            setSuccessMsg(platform.charAt(0).toUpperCase() + platform.slice(1));
                            
                            loadConnections();
                            setConnecting(null);
                            try { popup.close(); } catch (e) { }
                        } else if (event.data?.type === 'oauth_error') {
                            window.removeEventListener('message', handleMessage);
                            clearInterval(checkPopup);
                            toast('Operation failed', 'error', event.data.message || 'Authentication failed')
                            setConnecting(null);
                        }
                    };
                    window.addEventListener('message', handleMessage);

                    // Lắng nghe khi popup đóng mà không có message
                    const checkPopup = setInterval(() => {
                        try {
                            if (popup.closed) {
                                clearInterval(checkPopup);
                                window.removeEventListener('message', handleMessage);
                                // Chỉ set connecting null, không show success (đã handle ở message)
                                setConnecting(null);
                                loadConnections(); // reload để check nếu thực sự đã connect
                            }
                        } catch (e) { }
                    }, 1000);
                })
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
            toast('Bluesky connect failed: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Connected Accounts</h2>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Manage your social media connections</p>
                </div>
                <button
                    onClick={() => setShowAppConfigModal(true)}
                    style={{
                        padding: '10px 20px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                    🔧 Manage App Credentials
                </button>
            </div>



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

            {/* App Credentials Modal */}
            <AppConfigsModal
                brandId={brand?.id || ''}
                isOpen={showAppConfigModal}
                onClose={() => setShowAppConfigModal(false)}
            />
        </div>
    );
}

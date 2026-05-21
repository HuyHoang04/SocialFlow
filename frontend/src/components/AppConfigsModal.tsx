'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { PlatformIcon } from '@/components/Icons';

interface AppConfig {
    id: string;
    platform: string;
    appId: string;
    appSecret?: string;
    redirectUri?: string;
    createdAt: string;
    updatedAt: string;
}

const PLATFORMS_WITH_CONFIG = [
    { key: 'facebook', name: 'Facebook / Instagram', help: 'Get your App ID and Secret from developers.facebook.com' },
    { key: 'twitter', name: 'X / Twitter', help: 'Get OAuth credentials from developer.twitter.com' },
    { key: 'linkedin', name: 'LinkedIn', help: 'Get App ID and Secret from linkedin.com/developers' },
    { key: 'threads', name: 'Threads (Meta)', help: 'Use Meta app or Threads-specific app credentials' },
    { key: 'instagram', name: 'Instagram', help: 'Uses Meta app credentials (same as Facebook)' },
];

export default function AppConfigsModal({ brandId, isOpen, onClose }: { 
    brandId: string; 
    isOpen: boolean; 
    onClose: () => void;
}) {
    const [configs, setConfigs] = useState<AppConfig[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState('');
    const [formData, setFormData] = useState({ appId: '', appSecret: '', redirectUri: '' });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const loadConfigs = useCallback(async () => {
        if (!brandId) return;
        setLoading(true);
        try {
            const data = await api.getAppConfigs(brandId);
            setConfigs(data || []);
        } catch (err) {
            console.error('Failed to load app configs:', err);
        } finally {
            setLoading(false);
        }
    }, [brandId]);

    const handleSelectPlatform = async (platform: string) => {
        setSelectedPlatform(platform);
        // Convert to uppercase to match backend enum (e.g., 'facebook' → 'FACEBOOK')
        const platformUpper = platform.toUpperCase();
        const existing = configs.find(c => c.platform === platformUpper);
        if (existing) {
            setFormData({
                appId: existing.appId || '',
                appSecret: '', // Don't expose secret
                redirectUri: existing.redirectUri || '',
            });
        } else {
            setFormData({ appId: '', appSecret: '', redirectUri: '' });
        }
    };

    const handleSave = async () => {
        if (!selectedPlatform || !formData.appId) {
            setMessage('Please enter App ID');
            return;
        }

        setSaving(true);
        setMessage('');
        try {
            // Convert to uppercase for API (e.g., 'facebook' → 'FACEBOOK')
            const platformUpper = selectedPlatform.toUpperCase();
            await api.saveAppConfig(brandId, platformUpper, {
                appId: formData.appId,
                appSecret: formData.appSecret,
                redirectUri: formData.redirectUri,
            });
            setMessage('✓ Saved successfully');
            await loadConfigs();
            setTimeout(() => setSelectedPlatform(''), 1000);
        } catch (err: any) {
            setMessage('Error: ' + (err.message || 'Failed to save config'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (platform: string) => {
        if (!confirm(`Delete config for ${platform}?`)) return;
        try {
            // Convert to uppercase for API
            const platformUpper = platform.toUpperCase();
            await api.deleteAppConfig(brandId, platformUpper);
            setMessage('✓ Deleted successfully');
            await loadConfigs();
        } catch (err: any) {
            setMessage('Error: ' + (err.message || 'Failed to delete config'));
        }
    };

    if (!isOpen) return null;

    if (!selectedPlatform) {
        return (
            <div style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <div style={{
                    background: 'var(--bg-primary)', borderRadius: 'var(--radius)',
                    padding: 30, maxWidth: 600, width: '90%', maxHeight: '80vh', overflow: 'auto',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>App Credentials</h2>
                        <button onClick={onClose} style={{
                            background: 'none', border: 'none', fontSize: 24, cursor: 'pointer',
                            color: 'var(--text-secondary)',
                        }}>×</button>
                    </div>

                    <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
                        Configure your social platform credentials for custom OAuth apps.
                    </p>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
                    ) : (
                        <div style={{ display: 'grid', gap: 12 }}>
                            {PLATFORMS_WITH_CONFIG.map(platform => {
                                const config = configs.find(c => c.platform === platform.key.toUpperCase());
                                return (
                                    <div key={platform.key} style={{
                                        padding: 16, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, marginBottom: 4 }}>
                                                <PlatformIcon platform={platform.key} size={16} />
                                                {platform.name}
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {config ? '✓ Configured' : 'Not configured'}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleSelectPlatform(platform.key)}
                                            style={{
                                                background: 'var(--primary)', color: 'white', border: 'none',
                                                padding: '8px 16px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                                fontSize: 13, fontWeight: 600,
                                            }}
                                        >
                                            {config ? 'Edit' : 'Configure'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <div style={{
                background: 'var(--bg-primary)', borderRadius: 'var(--radius)',
                padding: 30, maxWidth: 500, width: '90%', maxHeight: '80vh', overflow: 'auto',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                        Configure {PLATFORMS_WITH_CONFIG.find(p => p.key === selectedPlatform)?.name}
                    </h2>
                    <button onClick={() => setSelectedPlatform('')} style={{
                        background: 'none', border: 'none', fontSize: 24, cursor: 'pointer',
                        color: 'var(--text-secondary)',
                    }}>×</button>
                </div>

                <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
                    {PLATFORMS_WITH_CONFIG.find(p => p.key === selectedPlatform)?.help}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                            App ID *
                        </label>
                        <input
                            type="text"
                            placeholder="Your App ID"
                            value={formData.appId}
                            onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                            style={{
                                width: '100%', padding: '10px 12px', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)', fontSize: 13, boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                            App Secret *
                        </label>
                        <input
                            type="password"
                            placeholder="Your App Secret"
                            value={formData.appSecret}
                            onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
                            style={{
                                width: '100%', padding: '10px 12px', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)', fontSize: 13, boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                            Redirect URI (optional)
                        </label>
                        <input
                            type="text"
                            placeholder="https://yourapp.com/callback"
                            value={formData.redirectUri}
                            onChange={(e) => setFormData({ ...formData, redirectUri: e.target.value })}
                            style={{
                                width: '100%', padding: '10px 12px', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)', fontSize: 13, boxSizing: 'border-box',
                            }}
                        />
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                            Leave empty to use default: {window?.location?.origin}/api/oauth/{selectedPlatform}/callback
                        </div>
                    </div>
                </div>

                {message && (
                    <div style={{
                        padding: 12, marginBottom: 16, borderRadius: 'var(--radius-sm)',
                        background: message.includes('✓') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        color: message.includes('✓') ? '#22c55e' : '#ef4444',
                        fontSize: 13,
                    }}>
                        {message}
                    </div>
                )}

                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        onClick={handleSave}
                        disabled={saving || !formData.appId}
                        style={{
                            flex: 1, padding: '12px 20px', background: 'var(--primary)', color: 'white',
                            border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                            fontSize: 14, fontWeight: 600, opacity: saving || !formData.appId ? 0.6 : 1,
                        }}
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        onClick={() => setSelectedPlatform('')}
                        style={{
                            flex: 1, padding: '12px 20px', background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                            border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                            fontSize: 14, fontWeight: 600,
                        }}
                    >
                        Cancel
                    </button>
                    {configs.find(c => c.platform === selectedPlatform.toUpperCase()) && (
                        <button
                            onClick={() => handleDelete(selectedPlatform)}
                            style={{
                                flex: 1, padding: '12px 20px', background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                                border: '1px solid #ef4444', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                fontSize: 14, fontWeight: 600,
                            }}
                        >
                            Delete
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

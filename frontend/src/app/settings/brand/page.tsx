'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';
import AppShell from '@/components/AppShell';

export default function BrandSettingsPage() {
    const { selectedBrand, selectBrand } = useBrand();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (selectedBrand) {
            setName(selectedBrand.name || '');
            setDescription(selectedBrand.description || '');
            setLogoUrl(selectedBrand.logoUrl || '');
        }
    }, [selectedBrand]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBrand) return;

        setSaving(true);
        setMessage(null);
        try {
            const updated = await api.updateBrand(selectedBrand.id, {
                name,
                description,
                logoUrl
            });
            // Use selectBrand to also update localStorage
            selectBrand(updated);
            setMessage({ type: 'success', text: 'Brand settings updated successfully! ✨' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to update brand' });
        } finally {
            setSaving(false);
        }
    };

    if (!selectedBrand) {
        return (
            <AppShell>
                <div className="loading-center">
                    <p>Please select a brand first</p>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px 0' }}>
                <div className="page-header" style={{ marginBottom: 40 }}>
                    <h1 className="page-title" style={{ fontSize: 32, marginBottom: 8 }}>Brand Identity</h1>
                    <p className="page-subtitle">Configure your brand metadata to personalize your social media presence</p>
                </div>

                {message && (
                    <div style={{
                        padding: '16px 20px',
                        borderRadius: 'var(--radius)',
                        marginBottom: 32,
                        background: message.type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)',
                        border: `1px solid ${message.type === 'success' ? 'var(--success)' : 'var(--error)'}`,
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        animation: 'fadeIn 0.3s ease-out'
                    }}>
                        <span style={{ fontSize: 20 }}>{message.type === 'success' ? '✅' : '❌'}</span>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{message.text}</span>
                    </div>
                )}

                <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '40px',
                    boxShadow: 'var(--shadow-lg)',
                    backdropFilter: 'blur(10px)'
                }}>
                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                        {/* Logo Preview Section */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 24, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
                            <div style={{
                                width: 100, height: 100,
                                borderRadius: 'var(--radius-lg)',
                                background: 'var(--bg-glass-strong)',
                                border: '2px dashed var(--border-hover)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                overflow: 'hidden',
                                flexShrink: 0
                            }}>
                                {logoUrl ? (
                                    <img src={logoUrl} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span style={{ fontSize: 24, opacity: 0.3 }}>🖼️</span>
                                )}
                            </div>
                            <div>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: 18, color: 'var(--text-primary)' }}>Brand Logo</h3>
                                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                    This logo will represent your brand across the platform and can be used in your social posts.
                                </p>
                            </div>
                        </div>

                        {/* Form Fields */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: 10, fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Brand Name
                                </label>
                                <input
                                    className="form-input"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your brand name"
                                    required
                                    style={{ height: 48, fontSize: 15 }}
                                />
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: 10, fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Description
                                </label>
                                <textarea
                                    className="form-input"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What is your brand about?"
                                    style={{ height: 120, fontSize: 15, padding: '14px', resize: 'vertical' }}
                                />
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: 10, fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Logo URL
                                </label>
                                <input
                                    className="form-input"
                                    value={logoUrl}
                                    onChange={(e) => setLogoUrl(e.target.value)}
                                    placeholder="https://example.com/logo.png"
                                    style={{ height: 48, fontSize: 15 }}
                                />
                            </div>
                        </div>

                        {/* Action Footer */}
                        <div style={{ 
                            marginTop: 12,
                            display: 'flex', 
                            justifyContent: 'flex-end',
                            paddingTop: 32,
                            borderTop: '1px solid var(--border)'
                        }}>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={saving}
                                style={{ 
                                    padding: '0 40px', 
                                    height: 52, 
                                    fontSize: 16, 
                                    fontWeight: 700,
                                    boxShadow: '0 8px 24px var(--accent-glow)40'
                                }}
                            >
                                {saving ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                                        Saving...
                                    </div>
                                ) : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AppShell>
    );
}

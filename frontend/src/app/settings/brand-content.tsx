'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';

export default function BrandSettingsContent() {
    const { selectedBrand, selectBrand } = useBrand();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
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
            selectBrand(updated);
            setMessage({ type: 'success', text: 'Brand settings updated successfully! ✨' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to update brand' });
        } finally {
            setSaving(false);
        }
    };

    if (!selectedBrand) return null;

    return (
        <div style={{ width: '100%' }}>
            {message && (
                <div style={{
                    padding: '16px 20px',
                    borderRadius: 'var(--radius)',
                    marginBottom: 32,
                    background: message.type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)',
                    border: `1px solid ${message.type === 'success' ? 'var(--success)' : 'var(--error)'}`,
                    color: 'var(--text-primary)',
                    display: 'flex', alignItems: 'center', gap: 12,
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 24, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
                        <div style={{
                            width: 80, height: 80,
                            borderRadius: 'var(--radius-lg)',
                            background: 'var(--bg-glass-strong)',
                            border: '2px dashed var(--border-hover)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden', flexShrink: 0
                        }}>
                            {logoUrl ? (
                                <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span style={{ fontSize: 20, opacity: 0.3 }}>🖼️</span>
                            )}
                        </div>
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: 18 }}>Brand Logo</h3>
                            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                                URL to your brand's official logo image.
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase' }}>
                                Brand Name
                            </label>
                            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase' }}>
                                Description
                            </label>
                            <textarea className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} style={{ height: 100 }} />
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase' }}>
                                Logo URL
                            </label>
                            <input className="form-input" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 24, borderTop: '1px solid var(--border)' }}>
                        <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '0 32px' }}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

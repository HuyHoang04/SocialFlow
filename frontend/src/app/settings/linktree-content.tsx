'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';
import { PlatformIcon, IconGlobe, IconLink, IconEdit, IconUpload, IconTrash, IconCheck, IconX, IconEye } from '@/components/Icons';

// ── Gradient presets ──────────────────────────────────────────────────────────
const BG_PRESETS = [
    { key: 'gradient-purple', label: 'Violet', css: 'linear-gradient(135deg,#667eea,#764ba2)' },
    { key: 'gradient-ocean',  label: 'Ocean',  css: 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)' },
    { key: 'gradient-sunset', label: 'Sunset', css: 'linear-gradient(135deg,#f093fb,#f5576c,#fda085)' },
    { key: 'gradient-forest', label: 'Forest', css: 'linear-gradient(135deg,#134e5e,#71b280)' },
    { key: 'gradient-night',  label: 'Night',  css: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' },
    { key: 'gradient-peach',  label: 'Peach',  css: 'linear-gradient(135deg,#ffecd2,#fcb69f)' },
    { key: 'gradient-aurora', label: 'Aurora', css: 'linear-gradient(135deg,#a8edea,#fed6e3)' },
];

const BUTTON_STYLES = [
    { key: 'rounded', label: 'Rounded', radius: '14px' },
    { key: 'pill',    label: 'Pill',    radius: '9999px' },
    { key: 'square',  label: 'Square',  radius: '8px' },
];

interface LinktreeSettings {
    brandId?: string;
    brandName?: string;
    logoUrl?: string;
    website?: string;
    primaryColor?: string;
    slug?: string;
    bio?: string;
    displayName?: string;
    websiteLabel?: string;
    bgStyle?: string;
    bgImageUrl?: string;
    buttonStyle?: string;
    published?: boolean;
    publicUrl?: string;
}

export default function LinktreeContent() {
    const { selectedBrand } = useBrand();
    const [settings, setSettings] = useState<LinktreeSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        if (!selectedBrand) return;
        setLoading(true);
        try {
            const data = await api.getLinktreeSettings(selectedBrand.id);
            setSettings(data);
        } catch {
            setSettings({
                brandId: selectedBrand.id,
                brandName: selectedBrand.name,
                bgStyle: 'gradient-purple',
                buttonStyle: 'rounded',
                published: false,
            });
        } finally {
            setLoading(false);
        }
    }, [selectedBrand]);

    useEffect(() => { load(); }, [load]);

    const set = (patch: Partial<LinktreeSettings>) =>
        setSettings(prev => prev ? { ...prev, ...patch } : prev);

    const handleSave = async () => {
        if (!selectedBrand || !settings) return;
        setSaving(true);
        setMessage(null);
        try {
            const updated = await api.saveLinktreeSettings(selectedBrand.id, {
                slug: settings.slug,
                bio: settings.bio,
                displayName: settings.displayName,
                websiteLabel: settings.websiteLabel,
                bgStyle: settings.bgStyle,
                bgImageUrl: settings.bgImageUrl,
                buttonStyle: settings.buttonStyle,
                published: settings.published,
            });
            setSettings(updated);
            setMessage({ type: 'success', text: '✓ Saved!' });
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message || 'Failed to save' });
        } finally {
            setSaving(false);
        }
    };

    const handleUploadBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedBrand) return;
        setUploading(true);
        try {
            const updated = await api.uploadLinktreeBg(selectedBrand.id, file);
            setSettings(updated);
            setMessage({ type: 'success', text: '✓ Background uploaded!' });
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message || 'Upload failed' });
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const handleDeleteBg = async () => {
        if (!selectedBrand) return;
        try {
            const updated = await api.deleteLinktreeBg(selectedBrand.id);
            setSettings(updated);
            setMessage({ type: 'success', text: '✓ Background removed' });
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message || 'Failed' });
        }
    };

    const handleCopyLink = () => {
        const url = `${window.location.origin}/p/${settings?.slug || selectedBrand?.id}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    if (!selectedBrand) return <p style={{ color: 'var(--text-muted)', padding: 20 }}>Please select a brand first.</p>;
    if (loading) return <div className="loading" style={{ padding: 40 }}>Loading...</div>;

    const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${settings?.slug || selectedBrand.id}`;
    const activePreset = BG_PRESETS.find(p => p.key === settings?.bgStyle) || BG_PRESETS[0];

    return (
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>

            {/* ── Left column: settings form ───────────────────── */}
            <div style={{ flex: '1 1 380px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Public Profile Page</h2>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                            Linktree-style page for your brand
                        </p>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
                            {settings?.published ? 'Published' : 'Draft'}
                        </span>
                        <div
                            onClick={() => set({ published: !settings?.published })}
                            style={{
                                width: 44, height: 24, borderRadius: 12,
                                background: settings?.published ? 'var(--accent)' : 'var(--border)',
                                position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                            }}
                        >
                            <div style={{
                                position: 'absolute', top: 3, left: settings?.published ? 23 : 3,
                                width: 18, height: 18, borderRadius: '50%', background: 'white',
                                transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                            }} />
                        </div>
                    </label>
                </div>

                {/* Public URL bar */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{
                        flex: 1, padding: '10px 14px', background: 'var(--bg-glass)',
                        border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                        fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        {publicUrl}
                    </div>
                    <button
                        onClick={handleCopyLink}
                        style={{
                            padding: '10px 16px', background: copied ? 'var(--success-bg)' : 'var(--bg-secondary)',
                            color: copied ? 'var(--success)' : 'var(--text-primary)',
                            border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                        }}
                    >
                        {copied ? '✓ Copied!' : 'Copy'}
                    </button>
                    <a
                        href={publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            padding: '10px 16px', background: 'var(--accent)', color: 'white',
                            border: 'none', borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer', fontSize: 13, fontWeight: 600,
                            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
                        }}
                    >
                        <IconEye size={15} /> Preview
                    </a>
                </div>

                {message && (
                    <div style={{
                        padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: 13,
                        background: message.type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)',
                        color: message.type === 'success' ? 'var(--success)' : 'var(--error)',
                        border: `1px solid ${message.type === 'success' ? 'var(--success)' : 'var(--error)'}40`,
                    }}>
                        {message.text}
                    </div>
                )}

                {/* Card */}
                <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* Custom URL slug */}
                    <div>
                        <label style={labelStyle}>Custom URL Slug</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                            <span style={{
                                padding: '10px 12px', background: 'var(--bg-glass)',
                                border: '1px solid var(--border)', borderRight: 'none',
                                borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)',
                                fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap',
                            }}>
                                /p/
                            </span>
                            <input
                                value={settings?.slug || ''}
                                onChange={e => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, '-') })}
                                placeholder={selectedBrand.id}
                                style={{
                                    flex: 1, padding: '10px 12px', fontSize: 13,
                                    border: '1px solid var(--border)', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                                    background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none',
                                }}
                            />
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                            Lowercase letters, numbers and hyphens only. Leave blank to use brand ID.
                        </p>
                    </div>

                    {/* Display name */}
                    <div>
                        <label style={labelStyle}>Display Name</label>
                        <input
                            className="form-input"
                            value={settings?.displayName || ''}
                            onChange={e => set({ displayName: e.target.value })}
                            placeholder={selectedBrand.name}
                        />
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                            Defaults to brand name if blank.
                        </p>
                    </div>

                    {/* Bio */}
                    <div>
                        <label style={labelStyle}>Bio</label>
                        <textarea
                            className="form-input"
                            value={settings?.bio || ''}
                            onChange={e => set({ bio: e.target.value })}
                            placeholder="Tell visitors about your brand…"
                            style={{ resize: 'vertical', minHeight: 80, fontSize: 14, padding: 12 }}
                        />
                    </div>

                    {/* Website label */}
                    <div>
                        <label style={labelStyle}>Website Button Label</label>
                        <input
                            className="form-input"
                            value={settings?.websiteLabel || ''}
                            onChange={e => set({ websiteLabel: e.target.value })}
                            placeholder="Visit our website"
                        />
                    </div>
                </div>

                {/* Background section */}
                <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Background</h3>

                    {/* Gradient presets */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                        {BG_PRESETS.map(preset => (
                            <button
                                key={preset.key}
                                onClick={() => set({ bgStyle: preset.key, bgImageUrl: undefined })}
                                title={preset.label}
                                style={{
                                    height: 52, borderRadius: 10, cursor: 'pointer',
                                    background: preset.css,
                                    border: settings?.bgStyle === preset.key && !settings?.bgImageUrl
                                        ? '3px solid var(--accent)'
                                        : '3px solid transparent',
                                    outline: settings?.bgStyle === preset.key && !settings?.bgImageUrl
                                        ? '2px solid var(--accent)40'
                                        : 'none',
                                    transition: 'transform 0.15s, border 0.15s',
                                    position: 'relative', overflow: 'hidden',
                                }}
                            >
                                {settings?.bgStyle === preset.key && !settings?.bgImageUrl && (
                                    <div style={{
                                        position: 'absolute', inset: 0, display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <IconCheck size={18} color="white" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Upload custom image */}
                    <div style={{
                        border: '2px dashed var(--border)', borderRadius: 10, padding: '16px 20px',
                        display: 'flex', alignItems: 'center', gap: 16,
                        background: settings?.bgImageUrl ? 'var(--bg-glass)' : 'transparent',
                    }}>
                        {settings?.bgImageUrl ? (
                            <>
                                <img
                                    src={settings.bgImageUrl}
                                    alt="Custom bg"
                                    style={{ width: 64, height: 42, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                                />
                                <div style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>
                                    Custom image active
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                        (overrides gradient preset)
                                    </div>
                                </div>
                                <button
                                    onClick={handleDeleteBg}
                                    style={{
                                        padding: '6px 12px', background: 'var(--error-bg)',
                                        color: 'var(--error)', border: '1px solid var(--error)40',
                                        borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                        display: 'flex', alignItems: 'center', gap: 4,
                                    }}
                                >
                                    <IconTrash size={13} /> Remove
                                </button>
                            </>
                        ) : (
                            <>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                        Upload custom background
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                        JPG, PNG or WebP. Will override the gradient preset.
                                    </div>
                                </div>
                                <label style={{
                                    padding: '8px 16px', background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)', border: '1px solid var(--border)',
                                    borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                    display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                                }}>
                                    {uploading ? 'Uploading…' : <><IconUpload size={14} /> Upload</>}
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleUploadBg}
                                        disabled={uploading}
                                        style={{ display: 'none' }}
                                    />
                                </label>
                            </>
                        )}
                    </div>
                </div>

                {/* Button style */}
                <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Button Style</h3>
                    <div style={{ display: 'flex', gap: 10 }}>
                        {BUTTON_STYLES.map(btn => (
                            <button
                                key={btn.key}
                                onClick={() => set({ buttonStyle: btn.key })}
                                style={{
                                    flex: 1, padding: '12px 8px',
                                    borderRadius: btn.radius,
                                    border: settings?.buttonStyle === btn.key
                                        ? '2px solid var(--accent)'
                                        : '2px solid var(--border)',
                                    background: settings?.buttonStyle === btn.key
                                        ? 'var(--accent-glow)'
                                        : 'var(--bg-glass)',
                                    color: settings?.buttonStyle === btn.key
                                        ? 'var(--accent)'
                                        : 'var(--text-secondary)',
                                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                    transition: 'all 0.15s',
                                }}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Save button */}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-primary"
                    style={{ height: 48, fontSize: 15, fontWeight: 700 }}
                >
                    {saving ? 'Saving…' : 'Save Changes'}
                </button>
            </div>

            {/* ── Right column: mini live preview ──────────────── */}
            <div style={{ flex: '0 0 260px', position: 'sticky', top: 80 }}>
                <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Preview
                </p>
                <div style={{
                    width: '100%', height: 480, borderRadius: 20, overflow: 'hidden',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
                    background: settings?.bgImageUrl ? `url('${settings.bgImageUrl}') center/cover` : activePreset.css,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'flex-start', padding: '36px 20px', gap: 12,
                    position: 'relative',
                }}>
                    {settings?.bgImageUrl && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }} />
                    )}
                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%' }}>
                        {/* Avatar preview */}
                        {settings?.logoUrl ? (
                            <img src={settings.logoUrl} alt="logo" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.5)', marginBottom: 8 }} />
                        ) : (
                            <div style={{
                                width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
                                border: '2px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8,
                            }}>
                                {(settings?.displayName || selectedBrand.name || '?')[0]?.toUpperCase()}
                            </div>
                        )}
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>
                            {settings?.displayName || selectedBrand.name}
                        </div>
                        {settings?.bio && (
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 1.5, maxWidth: 200 }}>
                                {settings.bio.slice(0, 80)}{settings.bio.length > 80 ? '…' : ''}
                            </div>
                        )}

                        {/* Preview buttons */}
                        {['facebook', 'instagram', 'bluesky'].map(p => (
                            <div key={p} style={{
                                width: '100%', padding: '8px 12px',
                                borderRadius: BUTTON_STYLES.find(b => b.key === settings?.buttonStyle)?.radius || '14px',
                                background: 'rgba(255,255,255,0.15)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                display: 'flex', alignItems: 'center', gap: 8,
                                color: 'var(--text-primary)', fontSize: 11, fontWeight: 600,
                            }}>
                                <PlatformIcon platform={p} size={14} color="white" />
                                {p.charAt(0).toUpperCase() + p.slice(1)}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: 8,
    fontSize: 12, fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase', letterSpacing: '0.5px',
};

'use client';
import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';
import ImageCropModal from '@/components/ImageCropModal';

export default function BrandSettingsContent() {
    const { selectedBrand, selectBrand } = useBrand();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [cropImage, setCropImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Please select an image file' });
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'Image must be less than 10MB' });
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setCropImage(reader.result as string);
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleCropComplete = async (blob: Blob) => {
        setCropImage(null);
        if (!selectedBrand) return;
        setUploading(true);
        setMessage(null);
        try {
            const file = new File([blob], 'logo.jpg', { type: 'image/jpeg' });
            const result = await api.uploadBrandLogo(selectedBrand.id, file);
            setLogoUrl(result.logoUrl);
            selectBrand({ ...selectedBrand, logoUrl: result.logoUrl });
            setMessage({ type: 'success', text: 'Brand logo uploaded! 🎉' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to upload logo' });
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteLogo = async () => {
        if (!selectedBrand) return;
        if (!confirm('Remove the brand logo?')) return;
        setUploading(true);
        try {
            await api.deleteBrandLogo(selectedBrand.id);
            setLogoUrl('');
            selectBrand({ ...selectedBrand, logoUrl: undefined });
            setMessage({ type: 'success', text: 'Logo removed' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to remove logo' });
        } finally {
            setUploading(false);
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
                    {/* Logo Upload Section */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 28, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
                        <div style={{ position: 'relative' }}>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    width: 100, height: 100,
                                    borderRadius: 'var(--radius-lg)',
                                    background: logoUrl ? 'transparent' : 'var(--bg-glass-strong)',
                                    border: logoUrl ? '3px solid var(--border-hover)' : '3px dashed var(--border-hover)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    overflow: 'hidden', flexShrink: 0, cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    boxShadow: logoUrl ? '0 4px 20px rgba(0,0,0,0.15)' : 'none',
                                    position: 'relative'
                                }}
                            >
                                {logoUrl ? (
                                    <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span style={{ fontSize: 28, opacity: 0.3 }}>🖼️</span>
                                )}
                                {/* Hover overlay */}
                                <div
                                    className="logo-hover-overlay"
                                    style={{
                                        position: 'absolute', inset: 0,
                                        borderRadius: 'var(--radius-lg)',
                                        background: 'rgba(0,0,0,0.5)', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                        opacity: uploading ? 1 : 0, transition: 'opacity 0.2s ease',
                                        pointerEvents: 'none'
                                    }}
                                >
                                    {uploading ? (
                                        <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
                                    ) : (
                                        <span style={{ fontSize: 22 }}>📷</span>
                                    )}
                                </div>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />
                        </div>
                        <div>
                            <h3 style={{ margin: '0 0 6px 0', fontSize: 18 }}>Brand Logo</h3>
                            <p style={{ margin: '0 0 12px 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                                Click to upload your brand&apos;s official logo. Supports JPG, PNG, WebP.
                            </p>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                >
                                    📷 {logoUrl ? 'Change Logo' : 'Upload Logo'}
                                </button>
                                {logoUrl && (
                                    <button
                                        type="button"
                                        className="btn btn-danger btn-sm"
                                        onClick={handleDeleteLogo}
                                        disabled={uploading}
                                    >
                                        ✕ Remove
                                    </button>
                                )}
                            </div>
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
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 24, borderTop: '1px solid var(--border)' }}>
                        <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '0 32px' }}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Crop Modal */}
            {cropImage && (
                <ImageCropModal
                    imageSrc={cropImage}
                    onCropComplete={handleCropComplete}
                    onCancel={() => setCropImage(null)}
                    aspect={1}
                    title="Crop Brand Logo"
                />
            )}

            <style jsx>{`
                .logo-hover-overlay {
                    opacity: 0 !important;
                }
                div:hover > .logo-hover-overlay {
                    opacity: 1 !important;
                }
            `}</style>
        </div>
    );
}

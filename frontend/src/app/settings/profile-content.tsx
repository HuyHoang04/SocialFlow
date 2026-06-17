'use client';
import { useState, useEffect, useRef } from 'react';
import { api, getUser, setUser, updateUserAvatar } from '@/lib/api';
import ImageCropModal from '@/components/ImageCropModal';

export default function ProfileContent() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [cropImage, setCropImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const u = getUser();
        if (u) {
            setName(u.name);
            setEmail(u.email);
            setAvatarUrl(u.avatarUrl || null);
        }
    }, []);

    const handleSaveName = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const result = await api.updateUserProfile({ name });
            setUser({ ...getUser()!, name: result.name });
            setMessage({ type: 'success', text: 'Profile updated successfully! ✨' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
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
        // Reset input so same file can be selected again
        e.target.value = '';
    };

    const handleCropComplete = async (blob: Blob) => {
        setCropImage(null);
        setUploading(true);
        setMessage(null);
        try {
            const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
            const result = await api.uploadUserAvatar(file);
            setAvatarUrl(result.avatarUrl);
            updateUserAvatar(result.avatarUrl);
            setMessage({ type: 'success', text: 'Avatar uploaded successfully! 🎉' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to upload avatar' });
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteAvatar = async () => {
        if (!confirm('Remove your profile photo?')) return;
        setUploading(true);
        try {
            await api.deleteUserAvatar();
            setAvatarUrl(null);
            updateUserAvatar(null);
            setMessage({ type: 'success', text: 'Avatar removed' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to remove avatar' });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ width: '100%' }}>
            {message && (
                <div style={{
                    padding: '16px 20px', borderRadius: 'var(--radius)', marginBottom: 32,
                    background: message.type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)',
                    border: `1px solid ${message.type === 'success' ? 'var(--success)' : 'var(--error)'}`,
                    color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 12,
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    <span style={{ fontSize: 20 }}>{message.type === 'success' ? '✅' : '❌'}</span>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{message.text}</span>
                </div>
            )}

            <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: 40,
                boxShadow: 'var(--shadow-lg)', backdropFilter: 'blur(10px)'
            }}>
                {/* Avatar Section */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 28,
                    paddingBottom: 32, borderBottom: '1px solid var(--border)', marginBottom: 32
                }}>
                    <div style={{ position: 'relative' }}>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                width: 100, height: 100, borderRadius: '50%',
                                background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                overflow: 'hidden', cursor: 'pointer', position: 'relative',
                                border: '3px solid var(--border-hover)',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                            }}
                        >
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" style={{
                                    width: '100%', height: '100%', objectFit: 'cover'
                                }} />
                            ) : (
                                <span style={{
                                    fontSize: 36, fontWeight: 700, color: 'var(--text-primary)',
                                    textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }}>
                                    {name ? name[0]?.toUpperCase() : '?'}
                                </span>
                            )}
                            {/* Hover overlay */}
                            <div style={{
                                position: 'absolute', inset: 0, borderRadius: '50%',
                                background: 'rgba(0,0,0,0.5)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                opacity: uploading ? 1 : 0, transition: 'opacity 0.2s ease',
                                pointerEvents: 'none'
                            }}
                                className="avatar-hover-overlay"
                            >
                                {uploading ? (
                                    <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
                                ) : (
                                    <span style={{ fontSize: 24 }}>📷</span>
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
                        <h3 style={{ margin: '0 0 6px 0', fontSize: 18 }}>Profile Photo</h3>
                        <p style={{ margin: '0 0 12px 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                            Click the photo to upload a new one. Supports JPG, PNG, WebP.
                        </p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                            >
                                📷 Change Photo
                            </button>
                            {avatarUrl && (
                                <button
                                    type="button"
                                    className="btn btn-danger btn-sm"
                                    onClick={handleDeleteAvatar}
                                    disabled={uploading}
                                >
                                    ✕ Remove
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Profile Form */}
                <form onSubmit={handleSaveName} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div className="form-group">
                        <label style={{
                            display: 'block', marginBottom: 8, fontWeight: 600,
                            color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase'
                        }}>
                            Full Name
                        </label>
                        <input
                            className="form-input"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label style={{
                            display: 'block', marginBottom: 8, fontWeight: 600,
                            color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase'
                        }}>
                            Email Address
                        </label>
                        <input
                            className="form-input"
                            value={email}
                            disabled
                            style={{ opacity: 0.6, cursor: 'not-allowed' }}
                        />
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                            Email cannot be changed
                        </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
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
                    title="Crop Profile Photo"
                />
            )}

            <style jsx>{`
                .avatar-hover-overlay {
                    opacity: 0 !important;
                }
                div:hover > .avatar-hover-overlay {
                    opacity: 1 !important;
                }
            `}</style>
        </div>
    );
}

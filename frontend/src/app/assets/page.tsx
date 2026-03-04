'use client';
import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import AppShell from '@/components/AppShell';
import { IconUpload, IconFilm, IconImage, IconTrash } from '@/components/Icons';

interface MediaAsset {
    id: string;
    url: string;
    originalName: string;
    contentType: string;
    fileSize: number;
    createdAt: string;
    postId?: string;
}

export default function AssetsPage() {
    const [assets, setAssets] = useState<MediaAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadAssets = async () => {
        setLoading(true);
        try {
            const data = await api.getMedia();
            setAssets(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load assets');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadAssets(); }, []);

    const handleFileUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setUploading(true);
        setError('');

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
                    setError('Only image and video files are allowed');
                    continue;
                }
                if (file.size > 50 * 1024 * 1024) {
                    setError('File too large (max 50MB)');
                    continue;
                }
                await api.uploadMedia(file);
            }
            // Reload assets after upload completes
            loadAssets();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (id: string, postId?: string) => {
        if (postId) {
            alert('Cannot delete media that is attached to a post. Delete the post first.');
            return;
        }
        if (!confirm('Are you sure you want to delete this media?')) return;

        try {
            await api.deleteMedia(id);
            setAssets(prev => prev.filter(a => a.id !== id));
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Delete failed');
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        handleFileUpload(e.dataTransfer.files);
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <AppShell>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Media Assets</h1>
                    <p className="page-subtitle">Manage your uploaded images and videos</p>
                </div>
            </div>

            {error && <div className="error-msg" style={{ marginBottom: 24 }}>{error}</div>}

            {/* Upload Area */}
            <div
                className="card"
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                    border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                    background: dragOver ? 'rgba(99,102,241,0.08)' : 'var(--bg-glass)',
                    marginBottom: 32,
                    padding: '40px 20px',
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={e => handleFileUpload(e.target.files)}
                    style={{ display: 'none' }}
                />
                {uploading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <div className="spinner" style={{ width: 24, height: 24, borderWidth: 3 }} />
                        <span style={{ fontSize: 16, color: 'var(--text-primary)' }}>Uploading files...</span>
                    </div>
                ) : (
                    <>
                        <div style={{ marginBottom: 12 }}><IconUpload size={48} color="var(--accent)" /></div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                            Click to upload or drag and drop files here
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8 }}>
                            Supported: JPG, PNG, GIF, MP4, MOV (Max size: 50MB)
                        </div>
                    </>
                )}
            </div>

            {/* Gallery */}
            {loading ? (
                <div className="loading-center"><div className="spinner" /></div>
            ) : assets.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon"><IconImage size={40} color="var(--text-muted)" /></div>
                    <div className="empty-state-title">No assets found</div>
                    <div className="empty-state-text">Your media library is empty. Upload some files to get started!</div>
                </div>
            ) : (
                <div className="grid grid-4">
                    {assets.map(asset => (
                        <div key={asset.id} className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
                            <div style={{ background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {asset.contentType.startsWith('image/') ? (
                                    <img
                                        src={asset.url}
                                        alt={asset.originalName}
                                        style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
                                    />
                                ) : (
                                    <div style={{ width: '100%', height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span><IconFilm size={48} color="var(--text-muted)" /></span>
                                    </div>
                                )}
                            </div>
                            <div style={{ padding: '12px 16px' }}>
                                <div style={{
                                    fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    marginBottom: 4
                                }}>
                                    {asset.originalName}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{formatFileSize(asset.fileSize)}</span>
                                    <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
                                </div>
                                {asset.postId && (
                                    <div style={{ marginTop: 8 }}>
                                        <span className="badge badge-published" style={{ fontSize: 10 }}>Attached to Post</span>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(asset.id, asset.postId); }}
                                style={{
                                    position: 'absolute', top: 8, right: 8,
                                    width: 32, height: 32, borderRadius: '50%',
                                    background: 'rgba(239, 68, 68, 0.9)', border: 'none',
                                    color: 'white', fontSize: 16, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                }}
                                title="Delete media"
                            >
                                <IconTrash size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </AppShell>
    );
}

'use client';
import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import AppShell from '@/components/AppShell';
import { IconUpload, IconFilm, IconImage, IconTrash, IconSearch, IconX, IconEdit } from '@/components/Icons';
import ImageEditor from '@/components/ImageEditor';

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
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Editor state
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<MediaAsset | null>(null);

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
            alert('This media is currently used in a post and cannot be deleted.');
            return;
        }
        if (!confirm('Are you sure you want to permanently delete this media?')) return;

        try {
            await api.deleteMedia(id);
            setAssets(prev => prev.filter(a => a.id !== id));
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Delete failed');
        }
    };

    const handleSaveEditedImage = async (editedData: { imageBase64: string; filename: string }) => {
        setIsEditorOpen(false);
        setUploading(true);
        setError('');
        try {
            const res = await fetch(editedData.imageBase64);
            const blob = await res.blob();
            const file = new File([blob], editedData.filename, { type: 'image/png' });
            
            const result = await api.uploadMedia(file);
            // Prepend to list immediately for instant feedback
            setAssets(prev => [result, ...prev]);
            
            // Still reload to be sure everything is in sync
            setTimeout(loadAssets, 500);
        } catch (err) {
            setError('Failed to save edited image');
        } finally {
            setUploading(false);
            setEditingAsset(null);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const filteredAssets = assets.filter(a => 
        a.originalName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AppShell>
            <div className="page-header" style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <h1 className="page-title" style={{ margin: 0 }}>Media Library</h1>
                        <p className="page-subtitle" style={{ margin: '4px 0 0' }}>Central hub for all your visual content</p>
                    </div>
                    
                    <div style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
                        <div style={{ 
                            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                            color: 'var(--text-muted)', display: 'flex', pointerEvents: 'none'
                        }}>
                            <IconSearch size={20} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by filename..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="form-control"
                            style={{ 
                                padding: '12px 16px 12px 48px', 
                                background: 'var(--bg-glass)',
                                borderRadius: 12,
                                border: '1px solid var(--border)',
                                width: '100%',
                                fontSize: 15
                            }}
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                style={{ 
                                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                    background: 'rgba(255,255,255,0.1)', border: 'none', 
                                    color: 'var(--text-primary)', cursor: 'pointer',
                                    width: 24, height: 24, borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                <IconX size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {error && <div className="error-msg" style={{ marginBottom: 24, borderRadius: 12 }}>{error}</div>}

            {/* Gallery Grid - FIXED LAYOUT */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
                    <div className="spinner" />
                </div>
            ) : filteredAssets.length === 0 ? (
                <div className="empty-state" style={{ padding: '80px 40px', borderRadius: 24, background: 'var(--bg-glass)' }}>
                    <div style={{ 
                        width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'
                    }}>
                        <IconImage size={40} color="var(--text-muted)" />
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                        {searchTerm ? 'No matches found' : 'Empty Library'}
                    </div>
                    <p style={{ fontSize: 15, color: 'var(--text-muted)', maxWidth: 320, margin: '0 auto' }}>
                        {searchTerm ? `Try searching for a different filename.` : 'Upload some images to start creating amazing social posts!'}
                    </p>
                </div>
            ) : (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(4, 1fr)', 
                    gap: 24,
                    width: '100%' 
                }}>
                    {/* Upload Zone Card */}
                    <div
                        className="card group"
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileUpload(e.dataTransfer.files); }}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            padding: 0,
                            borderRadius: 20,
                            overflow: 'hidden',
                            position: 'relative',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
                            background: dragOver ? 'rgba(108, 92, 231, 0.08)' : 'var(--bg-card)',
                            cursor: 'pointer',
                            boxShadow: dragOver ? '0 12px 24px rgba(108, 92, 231, 0.1)' : '0 4px 12px rgba(0,0,0,0.1)',
                            height: 340,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transform: dragOver ? 'scale(1.02)' : 'scale(1)'
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
                        <div style={{ textAlign: 'center', padding: 24 }}>
                            {uploading ? (
                                <>
                                    <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3, margin: '0 auto 12px' }} />
                                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Uploading...</div>
                                </>
                            ) : (
                                <>
                                    <div style={{ 
                                        width: 64, height: 64, borderRadius: '16px', 
                                        background: 'linear-gradient(135deg, var(--accent) 0%, #a29bfe 100%)', 
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 12px',
                                        boxShadow: '0 8px 16px rgba(108, 92, 231, 0.15)'
                                    }}>
                                        <IconUpload size={32} color="white" />
                                    </div>
                                    <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, margin: 0 }}>
                                        Upload
                                    </h3>
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0', maxWidth: '100%' }}>
                                        Click or drag
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    {filteredAssets.map(asset => (
                        <div 
                            key={asset.id} 
                            className="card group" 
                            style={{ 
                                padding: 0, 
                                borderRadius: 20,
                                overflow: 'hidden', 
                                position: 'relative',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-card)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }}
                        >
                            {/* Preview Area */}
                            <div style={{ 
                                height: 220, 
                                background: '#0a0a0a',
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                {asset.contentType.startsWith('image/') ? (
                                    <img
                                        src={asset.url}
                                        alt={asset.originalName}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
                                        className="asset-image"
                                    />
                                ) : (
                                    <div style={{ textAlign: 'center' }}>
                                        <IconFilm size={48} color="var(--text-muted)" />
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>MP4 Video</div>
                                    </div>
                                )}
                                
                                {/* Overlay Type Badge */}
                                <div style={{ 
                                    position: 'absolute', top: 12, left: 12,
                                    padding: '6px 10px', borderRadius: 8,
                                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    {asset.contentType.startsWith('image/') ? <IconImage size={14} color="white" /> : <IconFilm size={14} color="white" />}
                                    <span style={{ fontSize: 10, color: 'white', fontWeight: 600, textTransform: 'uppercase' }}>
                                        {asset.contentType.split('/')[1]}
                                    </span>
                                </div>

                                {/* Hover Actions */}
                                <div className="hover-overlay">
                                    {asset.contentType.startsWith('image/') && (
                                        <button
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                setEditingAsset(asset);
                                                setIsEditorOpen(true);
                                            }}
                                            className="action-btn edit"
                                            title="Edit Image"
                                        >
                                            <IconEdit size={20} />
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(asset.id, asset.postId); }}
                                        className="action-btn delete"
                                        title="Delete Asset"
                                    >
                                        <IconTrash size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Details Area */}
                            <div style={{ padding: 16, background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0) 100%)' }}>
                                <div style={{
                                    fontSize: 15, fontWeight: 600, color: 'var(--text-primary)',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    marginBottom: 6
                                }}>
                                    {asset.originalName}
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ opacity: 0.8 }}>{formatFileSize(asset.fileSize)}</span>
                                    <span style={{ fontSize: 11 }}>{new Date(asset.createdAt).toLocaleDateString()}</span>
                                </div>
                                {asset.postId && (
                                    <div style={{ marginTop: 12 }}>
                                        <span style={{ 
                                            padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                                            background: 'rgba(0, 184, 148, 0.1)', color: '#00b894',
                                            textTransform: 'uppercase', letterSpacing: '0.05em',
                                            border: '1px solid rgba(0, 184, 148, 0.2)'
                                        }}>
                                            Attached
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Image Editor Modal */}
            {editingAsset && (
                <ImageEditor
                    isOpen={isEditorOpen}
                    onClose={() => setIsEditorOpen(false)}
                    onSave={handleSaveEditedImage}
                    imageUrl={editingAsset.url}
                    filename={editingAsset.originalName}
                />
            )}

            <style jsx>{`
                .hover-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0,0,0,0.6);
                    backdrop-filter: blur(8px);
                    opacity: 0;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 16;
                    cursor: pointer;
                    z-index: 10;
                }
                .action-btn {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 8px 16px rgba(0,0,0,0.3);
                    transform: translateY(20px);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: pointer;
                }
                .action-btn.edit {
                    background: white;
                    color: var(--accent);
                    transition-delay: 0.05s;
                }
                .action-btn.delete {
                    background: #ff4757;
                    color: white;
                    box-shadow: 0 8px 16px rgba(255, 71, 87, 0.3);
                }
                .card.group:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
                    border-color: var(--accent);
                }
                .card.group:hover .hover-overlay {
                    opacity: 1;
                }
                .card.group:hover .action-btn {
                    transform: translateY(0);
                }
                .card.group:hover .asset-image {
                    transform: scale(1.15);
                }
            `}</style>
        </AppShell>
    );
}

'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

interface MediaAsset {
  id: string;
  url: string;
  originalName: string;
  contentType: string;
}

interface Props {
  onSelect: (url: string) => void;
  onClose: () => void;
  title?: string;
}

export default function ImagePickerModal({ onSelect, onClose, title = 'Select Image' }: Props) {
  const [assets, setAssets]       = useState<MediaAsset[]>([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch]       = useState('');
  const [tab, setTab]             = useState<'library' | 'upload'>('library');
  const fileRef                   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getMedia()
      .then(setAssets)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const result = await api.uploadMedia(files[0]);
      onSelect(result.url);
    } catch {
      // upload failed — stay open
    } finally {
      setUploading(false);
    }
  };

  const filtered = assets.filter(a =>
    a.contentType?.startsWith('image/') &&
    (a.originalName?.toLowerCase().includes(search.toLowerCase()) || !search)
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 640, maxHeight: '80vh',
          background: 'var(--bg-primary)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)' }}>
          {(['library', 'upload'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 20px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: 'none', borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
                textTransform: 'capitalize', transition: 'var(--transition)',
              }}
            >
              {t === 'library' ? '📁 Media Library' : '⬆️ Upload New'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {tab === 'library' ? (
            <>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search images..."
                style={{
                  width: '100%', padding: '8px 12px', marginBottom: 14,
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-glass)', color: 'var(--text-primary)', fontSize: 13, outline: 'none',
                }}
              />
              {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="skeleton" style={{ aspectRatio: '1', borderRadius: 8 }} />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  {search ? 'No images match your search.' : 'No images in your media library yet.'}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {filtered.map(asset => (
                    <button
                      key={asset.id}
                      onClick={() => onSelect(asset.url)}
                      title={asset.originalName}
                      style={{
                        padding: 0, border: '2px solid var(--border)', borderRadius: 8,
                        overflow: 'hidden', cursor: 'pointer', background: 'var(--bg-secondary)',
                        aspectRatio: '1', transition: 'var(--transition)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                      <img
                        src={asset.url}
                        alt={asset.originalName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
              style={{
                border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)',
                padding: '60px 20px', textAlign: 'center', cursor: uploading ? 'wait' : 'pointer',
                background: 'var(--bg-glass)', transition: 'var(--transition)',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>{uploading ? '⏳' : '⬆️'}</div>
              <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 6px', color: 'var(--text-primary)' }}>
                {uploading ? 'Uploading…' : 'Click or drag & drop to upload'}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                PNG, JPG, WEBP — max 50 MB
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => handleUpload(e.target.files)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

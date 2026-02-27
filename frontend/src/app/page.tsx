'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import AppShell from '@/components/AppShell';
import Link from 'next/link';

interface Post {
  id: string;
  content: string;
  status: string;
  createdAt: string;
  publishedAt: string | null;
  page: { id: string; pageName: string; platform: string; brandName: string };
}

interface Brand {
  id: string;
  name: string;
  connectionCount: number;
}

export default function DashboardPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBrand, setNewBrand] = useState('');
  const [showBrandForm, setShowBrandForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, b] = await Promise.all([api.getPosts(), api.getBrands()]);
      setPosts(p);
      setBrands(b);
    } catch { /* redirect handled by api */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createBrand = async () => {
    if (!newBrand.trim()) return;
    await api.createBrand({ name: newBrand.trim() });
    setNewBrand('');
    setShowBrandForm(false);
    load();
  };

  const deleteBrand = async (id: string) => {
    if (!confirm('Delete this brand and all its connections?')) return;
    await api.deleteBrand(id);
    load();
  };

  const publishPost = async (id: string) => {
    await api.publishPost(id);
    load();
  };

  const platformIcon = (p: string) => {
    switch (p) {
      case 'FACEBOOK': return '📘';
      case 'TWITTER': return '✖️';
      case 'LINKEDIN': return '💼';
      default: return '🌐';
    }
  };

  const badgeClass = (s: string) => {
    switch (s) {
      case 'DRAFT': return 'badge badge-draft';
      case 'PUBLISHING': return 'badge badge-publishing';
      case 'PUBLISHED': return 'badge badge-published';
      case 'FAILED': return 'badge badge-failed';
      default: return 'badge';
    }
  };

  return (
    <AppShell>
      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
          {/* Brands Section */}
          <div className="page-header">
            <div>
              <h1 className="page-title">Your Brands</h1>
              <p className="page-subtitle">Manage your brands and social connections</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowBrandForm(!showBrandForm)}>
              + New Brand
            </button>
          </div>

          {showBrandForm && (
            <div className="card" style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
              <input className="form-input" placeholder="Brand name..."
                value={newBrand} onChange={e => setNewBrand(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createBrand()}
                style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={createBrand}>Create</button>
              <button className="btn btn-secondary" onClick={() => setShowBrandForm(false)}>Cancel</button>
            </div>
          )}

          {brands.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏢</div>
              <div className="empty-state-title">No brands yet</div>
              <div className="empty-state-text">Create a brand to start connecting your social accounts</div>
            </div>
          ) : (
            <div className="grid grid-3" style={{ marginBottom: 48 }}>
              {brands.map(b => (
                <div key={b.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{b.name}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        {b.connectionCount} connection{b.connectionCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteBrand(b.id)}>✕</button>
                  </div>
                  <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                    <Link href={`/accounts?brandId=${b.id}`} className="btn btn-secondary btn-sm">
                      🔗 Connections
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Posts Section */}
          <div className="page-header">
            <div>
              <h1 className="page-title">Recent Posts</h1>
              <p className="page-subtitle">{posts.length} post{posts.length !== 1 ? 's' : ''}</p>
            </div>
            <Link href="/create" className="btn btn-primary">✏️ Create Post</Link>
          </div>

          {posts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <div className="empty-state-title">No posts yet</div>
              <div className="empty-state-text">Create your first post and publish it across platforms</div>
              <Link href="/create" className="btn btn-primary">Create Post</Link>
            </div>
          ) : (
            <div className="grid grid-2">
              {posts.map(p => (
                <div key={p.id} className="card" style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{platformIcon(p.page.platform)}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{p.page.pageName}</span>
                    </div>
                    <span className={badgeClass(p.status)}>{p.status}</span>
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 16, color: 'var(--text-secondary)' }}>
                    {p.content.length > 120 ? p.content.substring(0, 120) + '...' : p.content}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(p.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {p.status === 'DRAFT' && (
                        <button className="btn btn-primary btn-sm" onClick={() => publishPost(p.id)}>
                          🚀 Publish
                        </button>
                      )}
                      <Link href={`/posts/${p.id}`} className="btn btn-secondary btn-sm">View</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

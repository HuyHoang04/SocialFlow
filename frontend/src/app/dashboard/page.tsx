'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';
import AppShell from '@/components/AppShell';
import Link from 'next/link';

interface Post {
  id: string;
  content: string;
  status: string;
  createdAt: string;
  publishedAt: string | null;
  scheduledTime: string | null;
  campaignName?: string;
  page: { id: string; pageName: string; platform: string; brandName: string };
}

interface Connection {
  id: string;
  platform: string;
  accountName: string;
}

export default function DashboardPage() {
  const { selectedBrand } = useBrand();
  const [posts, setPosts] = useState<Post[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!selectedBrand) return;
    try {
      const [p, c] = await Promise.all([
        api.getPosts(),
        api.getConnections(selectedBrand.id),
      ]);
      // Filter posts belonging to this brand
      setPosts(p.filter((post: Post) => post.page.brandName === selectedBrand.name));
      setConnections(c);
    } catch { /* */ }
    setLoading(false);
  }, [selectedBrand]);

  useEffect(() => { load(); }, [load]);

  const publishPost = async (id: string) => {
    await api.publishPost(id);
    load();
  };

  const platformIcon = (p: string) => {
    switch (p) {
      case 'FACEBOOK': return '📘';
      case 'TWITTER': return '✖️';
      case 'LINKEDIN': return '💼';
      case 'BLUESKY': return '🦋';
      case 'THREADS': return '🧵';
      default: return '🌐';
    }
  };

  const badgeClass = (s: string) => {
    switch (s) {
      case 'DRAFT': return 'badge badge-draft';
      case 'SCHEDULED': return 'badge badge-scheduled';
      case 'PUBLISHING': return 'badge badge-publishing';
      case 'PUBLISHED': return 'badge badge-published';
      case 'FAILED': return 'badge badge-failed';
      default: return 'badge';
    }
  };

  const publishedPosts = posts.filter(p => p.status === 'PUBLISHED');
  const draftPosts = posts.filter(p => p.status === 'DRAFT' || p.status === 'SCHEDULED');

  return (
    <AppShell>
      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
          {/* Overview Stats */}
          <div className="page-header">
            <div>
              <h1 className="page-title">Dashboard</h1>
              <p className="page-subtitle">Overview for {selectedBrand?.name}</p>
            </div>
            <Link href="/create" className="btn btn-primary">✏️ Create Post</Link>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', marginBottom: 32 }}>
            <div className="card">
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Total Posts</div>
              <div style={{ fontSize: 32, fontWeight: 800 }}>{posts.length}</div>
            </div>
            <div className="card">
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Published</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--success)' }}>{publishedPosts.length}</div>
            </div>
            <div className="card">
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Drafts / Scheduled</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--warning)' }}>{draftPosts.length}</div>
            </div>
            <div className="card">
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Connections</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent-light)' }}>{connections.length}</div>
            </div>
          </div>

          {/* Quick Actions */}
          {connections.length === 0 && (
            <div className="card" style={{ marginBottom: 24, textAlign: 'center', padding: '40px 24px' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔗</div>
              <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Connect your accounts</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 14 }}>
                Link your social media accounts to start publishing
              </p>
              <Link href="/accounts" className="btn btn-primary">Connect Accounts</Link>
            </div>
          )}

          {/* Recent Posts */}
          <div className="page-header">
            <div>
              <h1 className="page-title" style={{ fontSize: 22 }}>Recent Posts</h1>
              <p className="page-subtitle">{posts.length} post{posts.length !== 1 ? 's' : ''}</p>
            </div>
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
              {posts.slice(0, 10).map(p => (
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
                      {p.scheduledTime
                        ? `📅 ${new Date(p.scheduledTime).toLocaleString('vi-VN')}`
                        : new Date(p.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(p.status === 'DRAFT' || p.status === 'SCHEDULED') && (
                        <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); publishPost(p.id); }}>
                          🚀 Publish
                        </button>
                      )}
                      <Link href={`/posts/${p.id}`} className="btn btn-secondary btn-sm" onClick={e => e.stopPropagation()}>
                        View
                      </Link>
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

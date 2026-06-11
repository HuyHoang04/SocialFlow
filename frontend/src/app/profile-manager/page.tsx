'use client';
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';
import AppShell from '@/components/AppShell';
import { PlatformIcon } from '@/components/Icons';

interface SocialPage {
  id: string;
  pageId: string;
  pageName: string;
  platform: string;
  platformPageId: string;
}

interface FormState {
  bio: string;
  coverImageUrl: string;
  avatarUrl: string;
  website: string;
}

const PLATFORM_SUPPORT: Record<string, { bio: boolean; cover: boolean; avatar: boolean; website: boolean }> = {
  FACEBOOK:  { bio: true,  cover: true,  avatar: true,  website: false },
  LINKEDIN:  { bio: true,  cover: false, avatar: false, website: false },
  BLUESKY:   { bio: true,  cover: false, avatar: false, website: false },
  TWITTER:   { bio: false, cover: false, avatar: false, website: false },
  THREADS:   { bio: false, cover: false, avatar: false, website: false },
  INSTAGRAM: { bio: false, cover: false, avatar: false, website: false },
};

export default function ProfileManagerPage() {
  const { selectedBrand } = useBrand();
  const [pages, setPages] = useState<SocialPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState<SocialPage | null>(null);
  const [form, setForm] = useState<FormState>({ bio: '', coverImageUrl: '', avatarUrl: '', website: '' });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<Record<string, string> | null>(null);
  const { toast } = useToast();

  const loadPages = useCallback(async () => {
    if (!selectedBrand) return;
    setLoading(true);
    try {
      const data = await api.getAllPagesForBrand(selectedBrand.id);
      setPages(data);
      if (data.length > 0) setSelectedPage(data[0]);
    } catch (e: any) {
      toast('Operation failed', 'error', e?.message || 'Failed to load pages')
    }
    setLoading(false);
  }, [selectedBrand]);

  useEffect(() => { loadPages(); }, [loadPages]);

  const support = selectedPage ? (PLATFORM_SUPPORT[selectedPage.platform?.toUpperCase()] ?? { bio: false, cover: false, avatar: false, website: false }) : null;
  const hasAnySupport = support && (support.bio || support.cover || support.avatar);

  const handleSave = async () => {
    if (!selectedPage) return;
    setSaving(true);
    setResult(null);
    
    try {
      const payload: any = {};
      if (form.bio.trim()) payload.bio = form.bio.trim();
      if (form.coverImageUrl.trim()) payload.coverImageUrl = form.coverImageUrl.trim();
      if (form.avatarUrl.trim()) payload.avatarUrl = form.avatarUrl.trim();
      if (form.website.trim()) payload.website = form.website.trim();

      const res = await api.updatePageProfile(selectedPage.id, payload);
      setResult(res);
    } catch (e: any) {
      toast('Operation failed', 'error', e?.message || 'Update failed')
    }
    setSaving(false);
  };

  return (
    <AppShell>
      <div style={{ width: '100%', padding: '0 40px', animation: 'fadeIn 0.5s ease-out' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Profile Manager</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
            Update bio, cover photo, and avatar for your connected pages
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24 }}>
            <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius)' }} />
            <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius)' }} />
          </div>
        ) : pages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔌</div>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No connected pages</p>
            <p style={{ fontSize: 13 }}>Connect a social account first from the Accounts page.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24 }}>

            {/* Left: Page list */}
            <div className="card" style={{ padding: 16, height: 'fit-content' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                Connected Pages
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pages.map(page => (
                  <button
                    key={page.id}
                    onClick={() => { setSelectedPage(page); setForm({ bio: '', coverImageUrl: '', avatarUrl: '', website: '' }); setResult(null);  }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                      border: '1px solid',
                      borderColor: selectedPage?.id === page.id ? 'var(--accent)' : 'transparent',
                      background: selectedPage?.id === page.id ? 'var(--accent-glow)' : 'transparent',
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                      transition: 'var(--transition)'
                    }}
                  >
                    <PlatformIcon platform={page.platform} size={18} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {page.pageName}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {page.platform?.toLowerCase()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Edit form */}
            <div className="card" style={{ padding: 28 }}>
              {selectedPage && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
                    <PlatformIcon platform={selectedPage.platform} size={28} />
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{selectedPage.pageName}</h2>
                      <p style={{ margin: '2px 0 0 0', fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {selectedPage.platform?.toLowerCase()}
                      </p>
                    </div>
                  </div>

                  {!hasAnySupport ? (
                    <div style={{
                      padding: '24px', borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-glass)', border: '1px solid var(--border)',
                      textAlign: 'center', color: 'var(--text-muted)'
                    }}>
                      <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
                      <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                        Profile editing not available for {selectedPage.platform}
                      </p>
                      <p style={{ fontSize: 13 }}>
                        {selectedPage.platform === 'TWITTER' && 'Twitter requires OAuth1 user context. Please update your profile directly on X.com.'}
                        {selectedPage.platform === 'THREADS' && 'Threads profile updates are managed through your Instagram Professional Account.'}
                        {selectedPage.platform === 'INSTAGRAM' && 'Instagram profile updates must be done through the Instagram app or Meta Business Suite.'}
                        {!['TWITTER','THREADS','INSTAGRAM'].includes(selectedPage.platform) && 'Profile updates for this platform are not yet supported.'}
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                      {support?.bio && (
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)' }}>
                            Bio / Description
                          </label>
                          <textarea
                            value={form.bio}
                            onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                            placeholder="Write a bio or page description..."
                            rows={4}
                            style={{
                              width: '100%', padding: '10px 12px',
                              border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                              background: 'var(--bg-glass)', color: 'var(--text-primary)',
                              fontSize: 13, fontFamily: 'Inter, sans-serif', resize: 'vertical',
                              outline: 'none', transition: 'var(--transition)'
                            }}
                          />
                        </div>
                      )}

                      {support?.avatar && (
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)' }}>
                            Profile Picture URL
                          </label>
                          <input
                            type="url"
                            value={form.avatarUrl}
                            onChange={e => setForm(f => ({ ...f, avatarUrl: e.target.value }))}
                            placeholder="https://res.cloudinary.com/..."
                            style={{
                              width: '100%', padding: '10px 12px',
                              border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                              background: 'var(--bg-glass)', color: 'var(--text-primary)',
                              fontSize: 13, outline: 'none', transition: 'var(--transition)'
                            }}
                          />
                          {form.avatarUrl && (
                            <img src={form.avatarUrl} alt="avatar preview" style={{ marginTop: 10, width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                          )}
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                            Upload the image via Media Assets first, then paste the Cloudinary URL here.
                          </p>
                        </div>
                      )}

                      {support?.cover && (
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)' }}>
                            Cover Photo URL
                          </label>
                          <input
                            type="url"
                            value={form.coverImageUrl}
                            onChange={e => setForm(f => ({ ...f, coverImageUrl: e.target.value }))}
                            placeholder="https://res.cloudinary.com/..."
                            style={{
                              width: '100%', padding: '10px 12px',
                              border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                              background: 'var(--bg-glass)', color: 'var(--text-primary)',
                              fontSize: 13, outline: 'none', transition: 'var(--transition)'
                            }}
                          />
                          {form.coverImageUrl && (
                            <img src={form.coverImageUrl} alt="cover preview" style={{ marginTop: 10, width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
                          )}
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                            Recommended size: 820 × 312 px (Facebook). Upload via Media Assets first.
                          </p>
                        </div>
                      )}

                      {/* Result */}
                      {result && (
                        <div style={{ padding: '14px 16px', background: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: 'var(--radius-sm)' }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)', marginBottom: 6 }}>Update sent</p>
                          {Object.entries(result).filter(([k]) => k !== 'platform' && k !== 'pageName').map(([k, v]) => (
                            <div key={k} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                              <strong style={{ textTransform: 'capitalize' }}>{k}:</strong> {String(v)}
                            </div>
                          ))}
                        </div>
                      )}



                      <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
                        <button
                          className="btn btn-primary"
                          onClick={handleSave}
                          disabled={saving || (!form.bio && !form.avatarUrl && !form.coverImageUrl && !form.website)}
                          style={{ minWidth: 140 }}
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => { setForm({ bio: '', coverImageUrl: '', avatarUrl: '', website: '' }); setResult(null);  }}
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

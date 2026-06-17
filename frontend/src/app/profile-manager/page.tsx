'use client';
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';
import AppShell from '@/components/AppShell';
import { PlatformIcon } from '@/components/Icons';
import ImagePickerModal from '@/components/ImagePickerModal';

function ProfilePreview({ form, page }: {
  form: { bio: string; coverImageUrl: string; avatarUrl: string };
  page: { pageName: string; platform: string } | null;
}) {
  if (!page) return null;
  const hasCover  = !!form.coverImageUrl.trim();
  const hasAvatar = !!form.avatarUrl.trim();
  const hasBio    = !!form.bio.trim();

  return (
    <div style={{ position: 'sticky', top: 80 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Live Preview
        </p>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 10, border: '1px solid var(--border)', textTransform: 'capitalize' }}>
          {page.platform.toLowerCase()}
        </span>
      </div>

      {/* Phone frame */}
      <div style={{
        width: 270, height: 520,
        borderRadius: 40,
        background: '#1a1a1a',
        padding: '14px 10px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.08)',
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', width: 72, height: 18, background: '#1a1a1a', borderRadius: 10, zIndex: 2 }} />
        <div style={{ position: 'absolute', right: -3, top: 100, width: 4, height: 48, background: '#333', borderRadius: '0 3px 3px 0' }} />
        <div style={{ position: 'absolute', left: -3, top: 90,  width: 4, height: 32, background: '#333', borderRadius: '3px 0 0 3px' }} />
        <div style={{ position: 'absolute', left: -3, top: 130, width: 4, height: 32, background: '#333', borderRadius: '3px 0 0 3px' }} />

        {/* Screen */}
        <div style={{ width: '100%', height: '100%', borderRadius: 28, overflow: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column' }}>
          {/* Cover */}
          <div style={{
            width: '100%', height: 90, flexShrink: 0, position: 'relative',
            background: hasCover ? 'transparent' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}>
            {hasCover && <img src={form.coverImageUrl} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
            {/* Avatar */}
            <div style={{
              position: 'absolute', bottom: -20, left: 14,
              width: 44, height: 44, borderRadius: '50%',
              border: '3px solid #fff',
              background: hasAvatar ? 'transparent' : '#d0d0d0',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}>
              {hasAvatar
                ? <img src={form.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#aaa' }}>👤</div>
              }
            </div>
          </div>

          {/* Info */}
          <div style={{ padding: '26px 14px 14px', flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1c1c1e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {page.pageName}
            </div>
            {hasBio
              ? <p style={{ fontSize: 11, color: '#555', margin: '6px 0 0', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{form.bio}</p>
              : <p style={{ fontSize: 11, color: '#bbb', margin: '6px 0 0', fontStyle: 'italic' }}>Bio will appear here…</p>
            }
            <div style={{ display: 'flex', gap: 14, marginTop: 14, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
              {['Posts', 'Followers', 'Following'].map(label => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ width: 26, height: 8, background: '#ebebeb', borderRadius: 4, marginBottom: 3 }} />
                  <div style={{ fontSize: 9, color: '#bbb' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
        Updates as you type
      </p>
    </div>
  );
}

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
  const [picker, setPicker] = useState<'avatar' | 'cover' | null>(null);
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
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 280px', gap: 24, alignItems: 'start' }}>

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

            {/* Middle: Edit form */}
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
                            Profile Picture
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {form.avatarUrl
                              ? <img src={form.avatarUrl} alt="avatar" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)', flexShrink: 0 }} />
                              : <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--bg-glass)', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>👤</div>
                            }
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <button
                                className="btn btn-secondary"
                                onClick={() => setPicker('avatar')}
                                style={{ fontSize: 12, padding: '6px 14px', width: '100%' }}
                              >
                                {form.avatarUrl ? '🔄 Change Photo' : '📁 Choose Photo'}
                              </button>
                              {form.avatarUrl && (
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {form.avatarUrl.split('/').pop()}
                                </p>
                              )}
                            </div>
                            {form.avatarUrl && (
                              <button onClick={() => setForm(f => ({ ...f, avatarUrl: '' }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, padding: 4 }} title="Remove">×</button>
                            )}
                          </div>
                        </div>
                      )}

                      {support?.cover && (
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)' }}>
                            Cover Photo
                          </label>
                          {form.coverImageUrl ? (
                            <div style={{ position: 'relative', marginBottom: 8 }}>
                              <img src={form.coverImageUrl} alt="cover" style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'block' }} />
                              <button
                                onClick={() => setForm(f => ({ ...f, coverImageUrl: '' }))}
                                style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Remove"
                              >×</button>
                            </div>
                          ) : null}
                          <button
                            className="btn btn-secondary"
                            onClick={() => setPicker('cover')}
                            style={{ fontSize: 12, padding: '6px 14px', width: '100%' }}
                          >
                            {form.coverImageUrl ? '🔄 Change Cover' : '📁 Choose Cover Photo'}
                          </button>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                            Recommended: 820 × 312 px
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

            {/* Right: Live preview */}
            <ProfilePreview form={form} page={selectedPage} />
          </div>
        )}
      </div>

      {picker && (
        <ImagePickerModal
          title={picker === 'avatar' ? 'Select Profile Picture' : 'Select Cover Photo'}
          onSelect={url => { setForm(f => picker === 'avatar' ? { ...f, avatarUrl: url } : { ...f, coverImageUrl: url }); setPicker(null); }}
          onClose={() => setPicker(null)}
        />
      )}
    </AppShell>
  );
}

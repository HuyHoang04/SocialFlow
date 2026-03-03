'use client';
import { useEffect, useState, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';

interface PageAnalytics {
    id: string;
    pageId: string;
    pageName: string;
    platform: string;
    brandName: string;
    followers: number;
    totalPageLikes: number;
    pageViews: number;
    newFollowers: number;
    pageImpressions: number;
    pageEngagedUsers: number;
    postsCount: number;
    avgEngagementRate: number;
    fetchedAt: string;
}

interface PostAnalytics {
    id: string;
    postId: string;
    postContent: string;
    platformPostId: string;
    platformPostUrl: string;
    platform: string;
    pageName: string;
    likes: number;
    comments: number;
    shares: number;
    impressions: number;
    reach: number;
    engagedUsers: number;
    clicks: number;
    engagementRate: number;
    fetchedAt: string;
    publishedAt: string;
}

interface AnalyticsOverview {
    totalPosts: number;
    totalPublished: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalImpressions: number;
    totalReach: number;
    avgEngagementRate: number;
    topPosts: PostAnalytics[];
    pages: PageAnalytics[];
}

interface Brand {
    id: string;
    name: string;
}

type TabType = 'overview' | 'posts' | 'pages';

export default function AnalyticsPage() {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [selectedBrand, setSelectedBrand] = useState<string>('');
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
    const [postAnalytics, setPostAnalytics] = useState<PostAnalytics[]>([]);
    const [syncing, setSyncing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [lastSynced, setLastSynced] = useState<string | null>(null);

    useEffect(() => {
        api.getBrands().then((data: Brand[]) => {
            setBrands(data || []);
            if (data && data.length > 0) setSelectedBrand(data[0].id);
        });
    }, []);

    const loadAnalytics = useCallback(async (brandId: string) => {
        if (!brandId) return;
        setLoading(true);
        try {
            const [ov, posts] = await Promise.all([
                api.getAnalyticsOverview(brandId),
                api.getPostAnalyticsByBrand(brandId),
            ]);
            setOverview(ov);
            setPostAnalytics(posts || []);
        } catch {
            // Data not yet synced — that's OK
            setOverview(null);
            setPostAnalytics([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedBrand) loadAnalytics(selectedBrand);
    }, [selectedBrand, loadAnalytics]);

    const handleSync = async () => {
        if (!selectedBrand) return;
        setSyncing(true);
        try {
            await api.syncAnalytics(selectedBrand);
            setLastSynced(new Date().toLocaleTimeString());
            await loadAnalytics(selectedBrand);
        } catch (e: unknown) {
            alert('Sync failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
        } finally {
            setSyncing(false);
        }
    };

    const formatNumber = (n: number) => {
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
        if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
        return n.toString();
    };

    const formatDate = (d: string | null) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    return (
        <AppShell>
            <div style={{ padding: '32px', maxWidth: 1200, margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                    <div>
                        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>📊 Analytics</h1>
                        <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                            Facebook page &amp; post performance
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <select
                            value={selectedBrand}
                            onChange={e => setSelectedBrand(e.target.value)}
                            className="input"
                            style={{ minWidth: 180 }}
                        >
                            {brands.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                        <button
                            className="btn btn-primary"
                            onClick={handleSync}
                            disabled={syncing || !selectedBrand}
                        >
                            {syncing ? '⏳ Syncing...' : '🔄 Sync Data'}
                        </button>
                    </div>
                </div>

                {lastSynced && (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                        Last synced: {lastSynced}
                    </div>
                )}

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: '1px solid var(--border)' }}>
                    {(['overview', 'posts', 'pages'] as TabType[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '10px 24px',
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                                color: activeTab === tab ? 'var(--accent-light)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontWeight: activeTab === tab ? 600 : 400,
                                fontSize: 15,
                                textTransform: 'capitalize',
                                transition: 'all 0.2s',
                            }}
                        >
                            {tab === 'overview' ? '📈 Overview' : tab === 'posts' ? '📝 Posts' : '📄 Pages'}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>
                        Loading analytics...
                    </div>
                ) : activeTab === 'overview' ? (
                    <OverviewTab overview={overview} formatNumber={formatNumber} formatDate={formatDate} />
                ) : activeTab === 'posts' ? (
                    <PostsTab posts={postAnalytics} formatNumber={formatNumber} formatDate={formatDate} />
                ) : (
                    <PagesTab pages={overview?.pages || []} formatNumber={formatNumber} formatDate={formatDate} />
                )}
            </div>
        </AppShell>
    );
}

/* ─── OVERVIEW TAB ─── */
function OverviewTab({ overview, formatNumber, formatDate }: {
    overview: AnalyticsOverview | null;
    formatNumber: (n: number) => string;
    formatDate: (d: string | null) => string;
}) {
    if (!overview || (overview.totalPosts === 0 && overview.topPosts.length === 0)) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: 60 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                <h3 style={{ margin: '0 0 8px' }}>No analytics data yet</h3>
                <p style={{ color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto' }}>
                    Click <strong>&quot;Sync Data&quot;</strong> to fetch analytics from your Facebook pages.
                    Make sure you have published posts first.
                </p>
            </div>
        );
    }

    const stats = [
        { label: 'Total Posts', value: overview.totalPosts, icon: '📝', color: '#6c5ce7' },
        { label: 'Published', value: overview.totalPublished, icon: '✅', color: '#00b894' },
        { label: 'Total Likes', value: overview.totalLikes, icon: '❤️', color: '#e17055' },
        { label: 'Comments', value: overview.totalComments, icon: '💬', color: '#0984e3' },
        { label: 'Shares', value: overview.totalShares, icon: '🔁', color: '#fdcb6e' },
        { label: 'Impressions', value: overview.totalImpressions, icon: '👁️', color: '#a29bfe' },
        { label: 'Reach', value: overview.totalReach, icon: '📡', color: '#55efc4' },
        { label: 'Avg Engagement', value: overview.avgEngagementRate, icon: '📊', color: '#fd79a8', suffix: '%' },
    ];

    return (
        <div>
            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 16,
                marginBottom: 32,
            }}>
                {stats.map(s => (
                    <div key={s.label} className="card" style={{ padding: 20, position: 'relative', overflow: 'hidden' }}>
                        <div style={{
                            position: 'absolute', top: 12, right: 16,
                            fontSize: 28, opacity: 0.3,
                        }}>{s.icon}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                            {s.label}
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>
                            {typeof s.value === 'number' && !s.suffix
                                ? formatNumber(s.value)
                                : s.value + (s.suffix || '')}
                        </div>
                    </div>
                ))}
            </div>

            {/* Engagement Bar Chart */}
            {overview.topPosts.length > 0 && (
                <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                    <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>🏆 Top Posts by Engagement</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {overview.topPosts.slice(0, 5).map((post, idx) => {
                            const total = post.likes + post.comments + post.shares;
                            const maxTotal = overview.topPosts[0]
                                ? overview.topPosts[0].likes + overview.topPosts[0].comments + overview.topPosts[0].shares
                                : 1;
                            const barWidth = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

                            return (
                                <div key={post.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{
                                        width: 24, textAlign: 'center',
                                        fontWeight: 700, color: idx === 0 ? '#fdcb6e' : 'var(--text-secondary)',
                                        fontSize: 14,
                                    }}>
                                        #{idx + 1}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: 13, color: 'var(--text-primary)',
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            marginBottom: 4,
                                        }}>
                                            {post.postContent}
                                        </div>
                                        <div style={{ position: 'relative', height: 20, borderRadius: 10, background: 'var(--bg-glass)' }}>
                                            <div style={{
                                                position: 'absolute', top: 0, left: 0,
                                                height: '100%', borderRadius: 10,
                                                width: `${barWidth}%`,
                                                background: 'linear-gradient(90deg, #6c5ce7, #a29bfe)',
                                                transition: 'width 0.5s ease',
                                            }} />
                                            <div style={{
                                                position: 'absolute', top: 0, left: 8,
                                                height: '100%', display: 'flex', alignItems: 'center',
                                                fontSize: 11, fontWeight: 600, color: '#fff',
                                            }}>
                                                {total > 0 && `❤️${post.likes} 💬${post.comments} 🔁${post.shares}`}
                                            </div>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 50, textAlign: 'right' }}>
                                        {post.engagementRate}%
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Pages Summary */}
            {overview.pages.length > 0 && (
                <div className="card" style={{ padding: 24 }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>📄 Pages Overview</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                        {overview.pages.map(pg => (
                            <div key={pg.id} style={{
                                padding: 16, borderRadius: 12,
                                background: 'var(--bg-glass)', border: '1px solid var(--border)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                    <span style={{
                                        width: 36, height: 36, borderRadius: 8,
                                        background: 'linear-gradient(135deg, #1877f2, #42a5f5)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 18,
                                    }}>f</span>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{pg.pageName}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pg.brandName}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    <MiniStat label="Followers" value={formatNumber(pg.followers)} />
                                    <MiniStat label="Page Likes" value={formatNumber(pg.totalPageLikes)} />
                                    <MiniStat label="Impressions" value={formatNumber(pg.pageImpressions)} />
                                    <MiniStat label="Engaged Users" value={formatNumber(pg.pageEngagedUsers)} />
                                    <MiniStat label="Posts" value={String(pg.postsCount)} />
                                    <MiniStat label="Avg Eng. Rate" value={pg.avgEngagementRate + '%'} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function MiniStat({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ padding: '6px 0' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{value}</div>
        </div>
    );
}

/* ─── POSTS TAB ─── */
function PostsTab({ posts, formatNumber, formatDate }: {
    posts: PostAnalytics[];
    formatNumber: (n: number) => string;
    formatDate: (d: string | null) => string;
}) {
    const [sortBy, setSortBy] = useState<'likes' | 'comments' | 'shares' | 'impressions' | 'reach' | 'engagementRate'>('likes');

    const sorted = [...posts].sort((a, b) => b[sortBy] - a[sortBy]);

    if (posts.length === 0) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: 60 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
                <h3 style={{ margin: '0 0 8px' }}>No post analytics</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Sync your data first to see post performance metrics.
                </p>
            </div>
        );
    }

    return (
        <div>
            {/* Sort bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Sort by:</span>
                {(['likes', 'comments', 'shares', 'impressions', 'reach', 'engagementRate'] as const).map(key => (
                    <button
                        key={key}
                        onClick={() => setSortBy(key)}
                        style={{
                            padding: '4px 14px',
                            borderRadius: 20,
                            border: sortBy === key ? '1px solid var(--accent)' : '1px solid var(--border)',
                            background: sortBy === key ? 'var(--accent-glow)' : 'transparent',
                            color: sortBy === key ? 'var(--accent-light)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: sortBy === key ? 600 : 400,
                            transition: 'all 0.2s',
                        }}
                    >
                        {key === 'engagementRate' ? 'Engagement %' : key.charAt(0).toUpperCase() + key.slice(1)}
                    </button>
                ))}
            </div>

            {/* Post cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sorted.map(post => (
                    <div key={post.id} className="card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, lineHeight: 1.5 }}>
                                    {post.postContent}
                                </div>
                                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                                    <span>📄 {post.pageName}</span>
                                    <span>📅 {formatDate(post.publishedAt)}</span>
                                    {post.platformPostUrl && (
                                        <a
                                            href={post.platformPostUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ color: 'var(--accent-light)' }}
                                        >
                                            🔗 View on Facebook
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                            gap: 12,
                            padding: '12px 0 0',
                            borderTop: '1px solid var(--border)',
                        }}>
                            <MetricCard icon="❤️" label="Likes" value={formatNumber(post.likes)} color="#e17055" />
                            <MetricCard icon="💬" label="Comments" value={formatNumber(post.comments)} color="#0984e3" />
                            <MetricCard icon="🔁" label="Shares" value={formatNumber(post.shares)} color="#fdcb6e" />
                            <MetricCard icon="👁️" label="Impressions" value={formatNumber(post.impressions)} color="#a29bfe" />
                            <MetricCard icon="📡" label="Reach" value={formatNumber(post.reach)} color="#55efc4" />
                            <MetricCard icon="📊" label="Engagement" value={post.engagementRate + '%'} color="#fd79a8" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MetricCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>{icon}</span>
            <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
            </div>
        </div>
    );
}

/* ─── PAGES TAB ─── */
function PagesTab({ pages, formatNumber, formatDate }: {
    pages: PageAnalytics[];
    formatNumber: (n: number) => string;
    formatDate: (d: string | null) => string;
}) {
    if (pages.length === 0) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: 60 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
                <h3 style={{ margin: '0 0 8px' }}>No page analytics</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Sync your data to see page-level metrics.
                </p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {pages.map(pg => (
                <div key={pg.id} className="card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 12,
                            background: 'linear-gradient(135deg, #1877f2, #42a5f5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 24, fontWeight: 700, color: '#fff',
                        }}>f</div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 18 }}>{pg.pageName}</h3>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                {pg.brandName} · Facebook · Updated {formatDate(pg.fetchedAt)}
                            </div>
                        </div>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                        gap: 16,
                    }}>
                        <PageMetric icon="👥" label="Followers" value={formatNumber(pg.followers)} color="#6c5ce7" />
                        <PageMetric icon="❤️" label="Page Likes" value={formatNumber(pg.totalPageLikes)} color="#e17055" />
                        <PageMetric icon="👁️" label="Impressions" value={formatNumber(pg.pageImpressions)} color="#a29bfe" />
                        <PageMetric icon="🖱️" label="Engaged Users" value={formatNumber(pg.pageEngagedUsers)} color="#00b894" />
                        <PageMetric icon="📄" label="Page Views" value={formatNumber(pg.pageViews)} color="#0984e3" />
                        <PageMetric icon="🆕" label="New Followers" value={formatNumber(pg.newFollowers)} color="#55efc4" />
                        <PageMetric icon="📝" label="Total Posts" value={String(pg.postsCount)} color="#fdcb6e" />
                        <PageMetric icon="📊" label="Avg Engagement" value={pg.avgEngagementRate + '%'} color="#fd79a8" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function PageMetric({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
    return (
        <div style={{
            padding: 14, borderRadius: 10,
            background: 'var(--bg-glass)', border: '1px solid var(--border)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
        </div>
    );
}

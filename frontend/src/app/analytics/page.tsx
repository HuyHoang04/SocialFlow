'use client';
import { useEffect, useState, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';
import TrendingAnalyticsWidget from '@/components/TrendingAnalyticsWidget';
import {
    IconBarChart, IconRefreshCw, IconClock, IconTrendingUp, IconFileText,
    IconHeart, IconMessageCircle, IconShare, IconEye, IconRadio,
    IconActivity, IconCheckCircle, IconTrophy, IconUsers, IconUserPlus,
    IconMousePointer, IconGlobe, SkeletonCard, IconSparkles,
} from '@/components/Icons';
import styles from './analytics.module.css';

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
    imageUrl?: string;
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

export default function AnalyticsPage() {
    const { selectedBrand: brand } = useBrand();
    const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
    const [postAnalytics, setPostAnalytics] = useState<PostAnalytics[]>([]);
    const [syncing, setSyncing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [lastSynced, setLastSynced] = useState<string | null>(null);
    const [trendingOpen, setTrendingOpen] = useState(false);

    // Posts table state
    const [sortBy, setSortBy] = useState<keyof Pick<PostAnalytics, 'likes' | 'comments' | 'shares' | 'impressions' | 'reach' | 'engagementRate'>>('engagementRate');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [search, setSearch] = useState('');
    const [showAllPosts, setShowAllPosts] = useState(false);

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
            setOverview(null);
            setPostAnalytics([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (brand) loadAnalytics(brand.id);
    }, [brand, loadAnalytics]);

    const handleSync = async () => {
        if (!brand) return;
        setSyncing(true);
        try {
            await api.syncAnalytics(brand.id);
            setLastSynced(new Date().toLocaleTimeString());
            await loadAnalytics(brand.id);
        } catch (e: unknown) {
            alert('Sync failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
        } finally {
            setSyncing(false);
        }
    };

    const fmt = (n: number) => {
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
        if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
        return n?.toString() ?? '0';
    };

    const fmtDate = (d: string | null) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
        });
    };

    // Sorted + filtered posts
    const filteredPosts = postAnalytics
        .filter(p => !search || p.postContent?.toLowerCase().includes(search.toLowerCase()) || p.pageName?.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => sortDir === 'desc' ? b[sortBy] - a[sortBy] : a[sortBy] - b[sortBy]);
    const visiblePosts = showAllPosts ? filteredPosts : filteredPosts.slice(0, 10);

    const handleSort = (col: typeof sortBy) => {
        if (col === sortBy) {
            setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        } else {
            setSortBy(col);
            setSortDir('desc');
        }
    };

    const handleSendToChat = (message: string, contextData: any) => {
        const event = new CustomEvent('socialflow-chat-open', {
            detail: { message, contextData }
        });
        window.dispatchEvent(event);
    };

    const handleSendOverviewToChat = () => {
        if (!overview) return;
        const ctx = {
            totalFollowers: overview.pages.reduce((s, p) => s + p.followers, 0),
            avgEngagement: overview.avgEngagementRate,
            totalReach: overview.totalReach,
            totalImpressions: overview.totalImpressions,
            totalPosts: overview.totalPosts,
        };
        handleSendToChat("", ctx);
    };

    const handleSendPostToChat = (post: PostAnalytics) => {
        const ctx = {
            ...post,
            image: post.imageUrl || "/logoAI.svg"
        };
        handleSendToChat("", ctx);
    };

    const hasData = overview && (overview.totalPosts > 0 || overview.topPosts.length > 0);

    // Best post for engagement bar scale (using total interactions for visual volume)
    const maxEngagement = postAnalytics.length > 0
        ? Math.max(...postAnalytics.map(p => p.likes + p.comments + p.shares))
        : 1;

    return (
        <AppShell>
            <div className={styles.page}>

                {/* ── Page Header ── */}
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>
                            <IconBarChart size={26} /> Analytics
                        </h1>
                        <p className={styles.pageSubtitle}>
                            {brand ? `${brand.name} — Facebook performance` : 'Select a brand to view analytics'}
                            {lastSynced && <span className={styles.lastSynced}> · Last synced {lastSynced}</span>}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button
                            className={styles.syncBtn}
                            style={{ background: 'var(--primary-glow)', color: 'var(--primary)', borderColor: 'var(--primary)' }}
                            onClick={handleSendOverviewToChat}
                            disabled={!brand || !overview}
                        >
                            <IconSparkles size={15} /> Analyze with Evie
                        </button>
                        <button
                            className={styles.syncBtn}
                            onClick={handleSync}
                            disabled={syncing || !brand}
                        >
                            {syncing
                                ? <><IconClock size={15} /> Syncing…</>
                                : <><IconRefreshCw size={15} /> Sync Data</>}
                        </button>
                    </div>
                </div>

                {/* ── Loading skeleton ── */}
                {loading ? (
                    <div className={styles.skeletonGrid}>
                        <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
                    </div>
                ) : !hasData ? (
                    <div className={styles.emptyState}>
                        <IconBarChart size={52} color="var(--text-muted)" />
                        <h3>No analytics data yet</h3>
                        <p>Click <strong>Sync Data</strong> to fetch analytics from your Facebook pages.</p>
                    </div>
                ) : (
                    <>
                        {/* ── KPI Row ── */}
                        <div className={styles.kpiRow}>
                            <KpiCard
                                icon={<IconUsers size={20} />}
                                label="Total Followers"
                                value={fmt(overview!.pages.reduce((s, p) => s + p.followers, 0))}
                                color="#6c5ce7"
                            />
                            <KpiCard
                                icon={<IconActivity size={20} />}
                                label="Avg Engagement"
                                value={overview!.avgEngagementRate + '%'}
                                color="#fd79a8"
                            />
                            <KpiCard
                                icon={<IconRadio size={20} />}
                                label="Total Reach"
                                value={fmt(overview!.totalReach)}
                                color="#00b894"
                            />
                            <KpiCard
                                icon={<IconUserPlus size={20} />}
                                label="New Followers"
                                value={fmt(overview!.pages.reduce((s, p) => s + p.newFollowers, 0))}
                                color="#0984e3"
                            />
                            <KpiCard
                                icon={<IconEye size={20} />}
                                label="Impressions"
                                value={fmt(overview!.totalImpressions)}
                                color="#a29bfe"
                            />
                            <KpiCard
                                icon={<IconCheckCircle size={20} />}
                                label="Published Posts"
                                value={String(overview!.totalPublished)}
                                color="#55efc4"
                            />
                        </div>

                        {/* ── Engagement summary row ── */}
                        <div className={styles.engageSummary}>
                            <EngageStat icon={<IconHeart size={16} />} label="Total Likes" value={fmt(overview!.totalLikes)} color="#e17055" />
                            <div className={styles.engageDivider} />
                            <EngageStat icon={<IconMessageCircle size={16} />} label="Comments" value={fmt(overview!.totalComments)} color="#0984e3" />
                            <div className={styles.engageDivider} />
                            <EngageStat icon={<IconShare size={16} />} label="Shares" value={fmt(overview!.totalShares)} color="#fdcb6e" />
                        </div>

                        {/* ── 2-col: Top Posts + Pages ── */}
                        <div className={styles.twoCol}>
                            {/* Top posts leaderboard */}
                            <div className={styles.card}>
                                <h2 className={styles.cardTitle}>
                                    <IconTrophy size={18} color="#fdcb6e" /> Top Posts by Engagement
                                </h2>
                                {overview!.topPosts.length === 0 ? (
                                    <p className={styles.empty}>No posts synced yet.</p>
                                ) : (
                                    <div className={styles.leaderboard}>
                                        {overview!.topPosts.slice(0, 5).map((post, idx) => {
                                            const total = post.likes + post.comments + post.shares;
                                            const pct = maxEngagement > 0 ? (total / maxEngagement) * 100 : 0;
                                            return (
                                                <div key={post.id} className={styles.leaderRow}>
                                                    <span className={`${styles.rank} ${idx === 0 ? styles.rankGold : ''}`}>#{idx + 1}</span>
                                                    <div className={styles.leaderContent}>
                                                        <div className={styles.leaderText}>
                                                            {post.postContent?.slice(0, 80) || '(no content)'}
                                                            {(post.postContent?.length ?? 0) > 80 && '…'}
                                                        </div>
                                                        <div className={styles.barWrap}>
                                                            <div className={styles.bar} style={{ width: `${pct}%` }} />
                                                            <span className={styles.barLabel}>
                                                                {post.likes > 0 && `♥${fmt(post.likes)} `}
                                                                {post.comments > 0 && `💬${fmt(post.comments)} `}
                                                                {post.shares > 0 && `↗${fmt(post.shares)}`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                                                        <span className={styles.engRate}>{post.engagementRate}%</span>
                                                        <button
                                                            className={styles.chatSmallBtn}
                                                            onClick={() => handleSendPostToChat(post)}
                                                            title="Analyze this post with AI"
                                                        >
                                                            <IconSparkles size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Pages summary */}
                            {overview!.pages.length > 0 && (
                                <div className={styles.card}>
                                    <h2 className={styles.cardTitle}>
                                        <IconGlobe size={18} /> Pages
                                    </h2>
                                    <div className={styles.pagesList}>
                                        {overview!.pages.map(pg => (
                                            <div key={pg.id} className={styles.pageItem}>
                                                <div className={styles.pageBadge}>f</div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div className={styles.pageName}>{pg.pageName}</div>
                                                    <div className={styles.pageMeta}>Updated {fmtDate(pg.fetchedAt)}</div>
                                                </div>
                                                <div className={styles.pageStats}>
                                                    <span title="Followers"><IconUsers size={12} /> {fmt(pg.followers)}</span>
                                                    <span title="Avg Engagement"><IconActivity size={12} /> {pg.avgEngagementRate}%</span>
                                                    <span title="New Followers"><IconUserPlus size={12} /> +{fmt(pg.newFollowers)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Posts Table ── */}
                        {postAnalytics.length > 0 && (
                            <div className={styles.card}>
                                <div className={styles.tableHeader}>
                                    <h2 className={styles.cardTitle} style={{ margin: 0 }}>
                                        <IconFileText size={18} /> All Posts
                                        <span className={styles.countBadge}>{postAnalytics.length}</span>
                                    </h2>
                                    <div className={styles.searchWrap}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
                                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                        </svg>
                                        <input
                                            className={styles.searchInput}
                                            placeholder="Search posts…"
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className={styles.tableWrap}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th className={styles.th}>Post</th>
                                                <th className={styles.th}>Page</th>
                                                <th className={styles.th}>Date</th>
                                                {([
                                                    ['likes', 'Likes'],
                                                    ['comments', 'Comments'],
                                                    ['shares', 'Shares'],
                                                    ['impressions', 'Impressions'],
                                                    ['reach', 'Reach'],
                                                    ['engagementRate', 'Eng.%'],
                                                ] as const).map(([col, label]) => (
                                                    <th
                                                        key={col}
                                                        className={`${styles.th} ${styles.thSortable} ${sortBy === col ? styles.thActive : ''}`}
                                                        onClick={() => handleSort(col as typeof sortBy)}
                                                    >
                                                        {label}
                                                        <span className={styles.sortArrow}>
                                                            {sortBy === col ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
                                                        </span>
                                                    </th>
                                                ))}
                                                <th className={styles.th} />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {visiblePosts.map(post => (
                                                <tr key={post.id} className={styles.tr}>
                                                    <td className={`${styles.td} ${styles.tdContent}`}>
                                                        {post.postContent?.slice(0, 80) || '(no content)'}
                                                        {(post.postContent?.length ?? 0) > 80 && '…'}
                                                    </td>
                                                    <td className={styles.td}>{post.pageName}</td>
                                                    <td className={`${styles.td} ${styles.tdMuted}`}>{fmtDate(post.publishedAt)}</td>
                                                    <td className={styles.td}><Num val={post.likes} color="#e17055" /></td>
                                                    <td className={styles.td}><Num val={post.comments} color="#0984e3" /></td>
                                                    <td className={styles.td}><Num val={post.shares} color="#fdcb6e" /></td>
                                                    <td className={styles.td}><Num val={post.impressions} /></td>
                                                    <td className={styles.td}><Num val={post.reach} /></td>
                                                    <td className={styles.td}>
                                                        <span className={styles.engBadge}>{post.engagementRate}%</span>
                                                    </td>
                                                    <td className={styles.td}>
                                                        {post.platformPostUrl && (
                                                            <a href={post.platformPostUrl} target="_blank" rel="noreferrer" className={styles.postLink} title="View on Facebook">
                                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                                                    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                                                                </svg>
                                                            </a>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {filteredPosts.length > 10 && (
                                    <div className={styles.loadMoreWrap}>
                                        <button
                                            className={styles.loadMoreBtn}
                                            onClick={() => setShowAllPosts(v => !v)}
                                        >
                                            {showAllPosts
                                                ? 'Show less'
                                                : `Show all ${filteredPosts.length} posts`}
                                        </button>
                                    </div>
                                )}

                                {filteredPosts.length === 0 && search && (
                                    <div className={styles.empty}>No posts match &quot;{search}&quot;</div>
                                )}
                            </div>
                        )}

                        {/* ── Trending (collapsible) ── */}
                        <div className={styles.card} style={{ padding: 0 }}>
                            <button
                                className={styles.trendingToggle}
                                onClick={() => setTrendingOpen(v => !v)}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <IconTrendingUp size={18} /> Trending Now
                                </span>
                                <svg
                                    width="16" height="16" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                                    style={{ transform: trendingOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                                >
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>
                            {trendingOpen && (
                                <div style={{ padding: '0 24px 24px' }}>
                                    <TrendingAnalyticsWidget />
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </AppShell>
    );
}

/* ── Small helper components ── */

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
    return (
        <div className={styles.kpiCard}>
            <div className={styles.kpiIcon} style={{ background: `${color}20`, color }}>{icon}</div>
            <div>
                <div className={styles.kpiLabel}>{label}</div>
                <div className={styles.kpiValue} style={{ color }}>{value}</div>
            </div>
        </div>
    );
}

function EngageStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
    return (
        <div className={styles.engageStat}>
            <span style={{ color, display: 'flex' }}>{icon}</span>
            <div>
                <div className={styles.engageLabel}>{label}</div>
                <div className={styles.engageValue} style={{ color }}>{value}</div>
            </div>
        </div>
    );
}

function Num({ val, color }: { val: number; color?: string }) {
    const fmt = (n: number) => {
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
        if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
        return n?.toString() ?? '0';
    };
    return <span style={{ fontWeight: 600, color: color ?? 'var(--text-primary)' }}>{fmt(val)}</span>;
}

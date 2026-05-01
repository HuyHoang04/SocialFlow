'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';
import TrendingConfigModal from './TrendingConfigModal';
import styles from '@/styles/ai-suggestions.module.css';

interface NewsItem {
  title?: string;
  link?: string;
  source?: string;
  image?: string;
  [key: string]: any;
}

interface TrendingSearch {
  query?: string;
  text?: string;         // Facebook: message content
  traffic?: string;      // Google: traffic string
  news?: string | NewsItem[] | object; // Google: related news
  link?: string;
  image?: string;
  // Facebook-specific
  author_name?: string;
  author_url?: string;
  author_picture?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  posted_date?: string;
  is_short?: boolean;
  [key: string]: any;
}

interface TrendingResponse {
  success: boolean;
  config_found?: boolean;
  trending_searches: TrendingSearch[];
  geo?: string;
  category_id?: string;
  error?: string;
}

export default function TrendingAnalyticsWidget() {
  const { selectedBrand } = useBrand();

  const [selectedSource, setSelectedSource] = useState<'google' | 'facebook' | 'bluesky'>('google');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<TrendingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [configFound, setConfigFound] = useState<boolean | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [connections, setConnections] = useState<any[]>([]);
  const itemsPerPage = 10;

  // ── Load from cache ──────────────────────────────────────────────────────

  const handleLoadTrending = useCallback(async () => {
    if (!selectedBrand) {
      setError('No brand selected');
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentPage(1);

    try {
      let response: TrendingResponse;

      if (selectedSource === 'google') {
        response = await api.getTrendingSearches({ brand_id: selectedBrand.id });
      } else if (selectedSource === 'facebook') {
        response = await api.searchFacebookTrending({ brand_id: selectedBrand.id });
      } else {
        response = await api.searchBlueskyTrending({ brand_id: selectedBrand.id });
      }

      setConfigFound(response.config_found !== false);
      setData(response);

      if (!response.success && response.error) {
        setError(response.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching trending');
      setData(null);
      setConfigFound(null);
    } finally {
      setLoading(false);
    }
  }, [selectedBrand, selectedSource]);

  // ── Refresh from API ─────────────────────────────────────────────────────

  const handleRefreshTrending = async () => {
    if (!selectedBrand) {
      setError('No brand selected');
      return;
    }

    setRefreshing(true);
    setError(null);
    setCurrentPage(1);

    try {
      let response: TrendingResponse;

      if (selectedSource === 'google') {
        response = await api.refreshTrendingSearches({ brand_id: selectedBrand.id });
      } else if (selectedSource === 'facebook') {
        response = await api.refreshFacebookTrending({ brand_id: selectedBrand.id });
      } else {
        response = await api.refreshBlueskyTrending({ brand_id: selectedBrand.id });
      }

      setConfigFound(response.config_found !== false);
      setData(response);

      if (!response.success && response.error) {
        setError(response.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error refreshing trending');
    } finally {
      setRefreshing(false);
    }
  };

  // ── Connections ──────────────────────────────────────────────────────────
  
  const fetchConnections = useCallback(async () => {
    if (!selectedBrand) return;
    try {
      const conns = await api.getBrandConnections(selectedBrand.id);
      setConnections(conns || []);
      
      // If current source is not available, switch to first available
      const hasFb = conns?.some((c: any) => c.platform === 'FACEBOOK');
      const hasBsky = conns?.some((c: any) => c.platform === 'BLUESKY');
      
      if (selectedSource === 'facebook' && !hasFb) {
        setSelectedSource('google');
      } else if (selectedSource === 'bluesky' && !hasBsky) {
        setSelectedSource('google');
      }
    } catch (err) {
      console.error('Error fetching connections:', err);
    }
  }, [selectedBrand, selectedSource]);

  // Auto-load on mount and when brand / source changes
  useEffect(() => {
    if (selectedBrand) {
      fetchConnections();
      handleLoadTrending();
    }
  }, [selectedBrand, selectedSource]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ──────────────────────────────────────────────────────────────

  const handleCopyQuery = (query: string) => {
    navigator.clipboard.writeText(query);
    alert('Copied: ' + query);
  };

  const handleAnalyzeWithAI = (message: string, contextData: any) => {
    const event = new CustomEvent('socialflow-chat-open', {
        detail: { message, contextData }
    });
    window.dispatchEvent(event);
  };

  const parseNews = (newsData: string | NewsItem[] | object | undefined): NewsItem[] => {
    if (!newsData) return [];
    if (Array.isArray(newsData)) return newsData;
    if (typeof newsData === 'string') {
      try {
        const parsed = JSON.parse(newsData);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [];
      }
    }
    if (typeof newsData === 'object') return [newsData as NewsItem];
    return [];
  };

  // ── Pagination ────────────────────────────────────────────────────────────

  const displayData = data?.trending_searches || [];
  
  // Group data by query for Bluesky to avoid "duplicate" feeling
  const groupedData = React.useMemo(() => {
    if (selectedSource !== 'bluesky') return [];
    
    const groups: { query: string, category?: string, items: TrendingSearch[] }[] = [];
    const map = new Map<string, number>();
    
    displayData.forEach(item => {
      const q = item.query || 'Unknown';
      if (!map.has(q)) {
        map.set(q, groups.length);
        groups.push({ query: q, category: item.category, items: [] });
      }
      groups[map.get(q)!].items.push(item);
    });
    
    return groups;
  }, [displayData, selectedSource]);

  const isGroupedView = selectedSource === 'bluesky';
  const totalPages = isGroupedView
    ? Math.ceil(groupedData.length / 2) // 2 topics per page
    : Math.ceil(displayData.length / itemsPerPage);

  const startIndex = (currentPage - 1) * (isGroupedView ? 2 : itemsPerPage);
  
  const paginatedData = !isGroupedView
    ? displayData.slice(startIndex, startIndex + itemsPerPage)
    : [];
    
  const paginatedGroups = isGroupedView
    ? groupedData.slice(startIndex, startIndex + 2) // 2 topics per page
    : [];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.widget}>

      {/* ── Header — always visible ── */}
      <div className={styles.header}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0 }}>
              {selectedSource === 'google' ? 'Google Trends' : selectedSource === 'facebook' ? 'Facebook Posts' : 'Bluesky Trends'}
            </h2>

            {/* Source toggle — icon+label pill tabs */}
            <div className={styles.sourceTabs}>
              <button
                className={`${styles.sourceTab} ${selectedSource === 'google' ? styles.sourceTabActive : ''}`}
                onClick={() => { setSelectedSource('google'); setCurrentPage(1); }}
                title="Google Trends"
              >
                {/* Google / chart icon */}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                Google
              </button>

              {connections.some(c => c.platform === 'FACEBOOK') && (
                <button
                  className={`${styles.sourceTab} ${selectedSource === 'facebook' ? styles.sourceTabActive : ''}`}
                  onClick={() => { setSelectedSource('facebook'); setCurrentPage(1); }}
                  title="Facebook Posts"
                >
                  {/* People / users icon */}
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Facebook
                </button>
              )}

              {connections.some(c => c.platform === 'BLUESKY') && (
                <button
                  className={`${styles.sourceTab} ${selectedSource === 'bluesky' ? styles.sourceTabActive : ''}`}
                  onClick={() => { setSelectedSource('bluesky'); setCurrentPage(1); }}
                  title="Bluesky Trends"
                >
                  {/* Cloud icon for bluesky */}
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                  </svg>
                  Bluesky
                </button>
              )}
            </div>

            {/* Action buttons — icon only */}
            <div className={styles.headerActions}>
              <button
                onClick={handleRefreshTrending}
                disabled={refreshing || loading}
                className={styles.iconBtn}
                title="Refresh Trends"
              >
                {/* Refresh / rotate-cw icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                  style={refreshing ? { animation: 'spin 0.8s linear infinite' } : {}}>
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </button>
              <button
                onClick={() => setShowConfigModal(true)}
                className={styles.iconBtn}
                title="Configure"
              >
                {/* Settings / sliders icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="21" x2="4" y2="14" />
                  <line x1="4" y1="10" x2="4" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12" y2="3" />
                  <line x1="20" y1="21" x2="20" y2="16" />
                  <line x1="20" y1="12" x2="20" y2="3" />
                  <line x1="1" y1="14" x2="7" y2="14" />
                  <line x1="9" y1="8" x2="15" y2="8" />
                  <line x1="17" y1="16" x2="23" y2="16" />
                </svg>
              </button>
            </div>
          </div>

          <p className={styles.subtitle}>
            {loading
              ? 'Loading trending data…'
              : displayData.length > 0
                ? `${displayData.length} trending items`
                : configFound === false
                  ? 'Not configured — open Configure to set up'
                  : 'No data — click Refresh to fetch'}
          </p>
        </div>
      </div>

      {error && configFound !== false && (
        <div className={styles.error}>❌ {error}</div>
      )}

      {/* ── Loading spinner (inline, header stays visible) ── */}
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <div className={styles.loadingText}>Fetching trending searches…</div>
        </div>

      ) : configFound === false ? (
        /* Config not set up yet */
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>⚙️</div>
          <div className={styles.emptyText}>
            {selectedSource === 'google'
              ? 'No Google Trends config yet'
              : selectedSource === 'facebook'
                ? 'No Facebook config yet'
                : 'No Bluesky config yet'}
          </div>
          <p className={styles.emptyHint}>
            {selectedSource === 'google'
              ? 'Select your country and category to start tracking trends.'
              : selectedSource === 'facebook'
                ? 'Enter a keyword to search Facebook posts about your topic.'
                : 'Configure to get global trends or search specific topics on Bluesky.'}
          </p>
          <button onClick={() => setShowConfigModal(true)} className={styles.primaryButton}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: 'middle' }}>
              <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
            </svg>
            Configure Now
          </button>
        </div>

      ) : !displayData || displayData.length === 0 ? (
        /* Config exists but cache is empty */
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📭</div>
          <div className={styles.emptyText}>No trending data in cache</div>
          <p className={styles.emptyHint}>
            Click &quot;Load Trending Data&quot; to fetch fresh results from the API.
          </p>
          <button
            onClick={handleRefreshTrending}
            disabled={refreshing}
            className={styles.primaryButton}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              style={refreshing ? { marginRight: 6, verticalAlign: 'middle', animation: 'spin 0.8s linear infinite' } : { marginRight: 6, verticalAlign: 'middle' }}>
              <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            {refreshing ? 'Loading...' : 'Load Trending Data'}
          </button>
        </div>

      ) : (
        /* ── Has data ── */
        <div className={styles.resultsContainer}>

          {/* ── Google: table layout ── */}
          {selectedSource === 'google' && (
            <div className={styles.section}>
              <div className={styles.rankingTable}>
                <div className={styles.tableHead}>
                  <div className={styles.tableHeadRow}>
                    <div className={styles.tableHeadCell}>Rank</div>
                    <div className={styles.tableHeadCell}>Trending Query</div>
                    {/* <div className={styles.tableHeadCell}>Traffic</div>
                    <div className={styles.tableHeadCell}>Link</div> */}
                    <div className={styles.tableHeadCell}>Actions</div>
                  </div>
                </div>
                <div className={styles.tableBody}>
                  {paginatedData.map((item, idx) => (
                    <div key={startIndex + idx} className={styles.tableRow}>
                      <div className={styles.rankColumn}>{startIndex + idx + 1}</div>

                      <div className={styles.queryColumn}>
                        <div className={styles.queryTitle}>{item.query}</div>
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.query}
                            className={`${styles.queryImage} ${styles.visible}`}
                          />
                        )}
                        {parseNews(item.news).length > 0 && (
                          <div className={styles.newsBadges}>
                            {parseNews(item.news).slice(0, 3).map((newsItem, nIdx) => (
                              <div key={nIdx} className={styles.newsBadge} title={newsItem.title || newsItem.source}>
                                📰 {newsItem.title || newsItem.source || 'News'}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className={styles.trafficColumn}>
                        {item.traffic && (
                          <>
                            <span className={styles.trafficValue}>{item.traffic}</span>
                            <span className={styles.trafficLabel}>Trending</span>
                          </>
                        )}
                      </div>

                      <div className={styles.linkColumn}>
                        {item.link && (
                          <a href={item.link} target="_blank" rel="noreferrer" className={styles.linkIcon} title="Open link">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                          </a>
                        )}
                      </div>

                      <div className={styles.actionButtons}>
                        <button
                          onClick={() => handleAnalyzeWithAI("", item)}
                          className={styles.chatBtn}
                          title="Analyze with AI"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
                          </svg>
                        </button>
                        <button onClick={() => handleCopyQuery(item.query || '')} className={styles.iconBtn} title="Copy">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Facebook: flat card-grid layout ── */}
          {selectedSource === 'facebook' && (
            <div className={styles.fbCardGrid}>
              {paginatedData.map((item, idx) => (
                <div key={`${item.query}-${idx}`} className={styles.fbCard}>
                  {/* Rank badge */}
                  <div className={styles.fbRankBadge}>{startIndex + idx + 1}</div>

                  {/* Image — full-width at top of card */}
                  {item.image ? (
                    <div className={styles.fbCardImageWrap}>
                      <img
                        src={item.image}
                        alt={item.text || 'Post image'}
                        className={styles.fbCardImage}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  ) : (
                    <div className={styles.fbCardImagePlaceholder}>
                      <div className={styles.fbPlaceholderTopic}>{item.text || item.query}</div>
                    </div>
                  )}

                  {/* Body */}
                  <div className={styles.fbCardBody}>
                    {item.author_name && (
                      <div className={styles.fbCardAuthor}>
                        {item.author_picture && (
                          <img
                            src={item.author_picture}
                            alt={item.author_name}
                            className={styles.fbCardAvatar}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                        <span className={styles.fbCardAuthorName}>{item.author_name}</span>
                        {item.posted_date && (
                          <span className={styles.fbCardDate}>{item.posted_date}</span>
                        )}
                      </div>
                    )}

                    <p className={styles.fbCardText}>
                      {item.text || '(No content)'}
                    </p>
                  </div>

                  {/* Footer: stats + actions */}
                  <div className={styles.fbCardFooter}>
                    <div className={styles.fbCardStats}>
                      <div className={styles.fbStat}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                        </svg>
                        {item.likes || 0}
                      </div>
                      <div className={styles.fbStat}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        {item.comments || 0}
                      </div>
                      <div className={styles.fbStat}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                        </svg>
                        {item.shares || 0}
                      </div>
                    </div>
                    
                    <div className={styles.fbCardActions}>
                      <button
                        onClick={() => handleAnalyzeWithAI("", item)}
                        className={styles.chatBtn}
                        title="Analyze with AI"
                        style={{ width: 28, height: 28 }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
                        </svg>
                      </button>
                      {item.link && (
                        <a href={item.link} target="_blank" rel="noreferrer" className={styles.linkIcon} title="Open post" style={{ width: 28, height: 28 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Bluesky: grouped layout ── */}
          {selectedSource === 'bluesky' && (
            <div className={styles.groupedContainer}>
              {paginatedGroups.map((group, groupIdx) => (
                <div key={group.query} className={styles.topicGroup}>
                  <div className={styles.topicHeader}>
                    <div className={styles.topicBadge}>#{startIndex + groupIdx + 1}</div>
                    <h3 className={styles.topicTitle}>{group.query}</h3>
                    {group.category && <span className={styles.topicCategory}>{group.category}</span>}
                  </div>
                  
                  <div className={styles.fbCardGrid} style={{ marginTop: '12px' }}>
                    {group.items.map((item, idx) => (
                      <div key={`${group.query}-${idx}`} className={styles.fbCard}>
                        {/* Image — full-width at top of card */}
                        {item.image ? (
                          <div className={styles.fbCardImageWrap}>
                            <img
                              src={item.image}
                              alt={item.text || 'Post image'}
                              className={styles.fbCardImage}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </div>
                        ) : (
                          <div className={styles.fbCardImagePlaceholder} style={{ background: 'linear-gradient(135deg, #0085ff 0%, #00d2ff 100%)' }}>
                            <div className={styles.fbPlaceholderTopic}>{item.text || item.query}</div>
                          </div>
                        )}

                        {/* Body */}
                        <div className={styles.fbCardBody}>
                          {item.author_name && (
                            <div className={styles.fbCardAuthor}>
                              {item.author_picture && (
                                <img
                                  src={item.author_picture}
                                  alt={item.author_name}
                                  className={styles.fbCardAvatar}
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              )}
                              <span className={styles.fbCardAuthorName}>{item.author_name}</span>
                              {item.posted_date && (
                                <span className={styles.fbCardDate}>{item.posted_date}</span>
                              )}
                            </div>
                          )}

                          <p className={styles.fbCardText}>
                            {item.text?.slice(0, 220) || item.query || '(no text)'}
                            {(item.text?.length ?? 0) > 220 && (
                                <span className={styles.fbCardMore}>&nbsp;…</span>
                            )}
                          </p>
                        </div>

                        {/* Footer: stats + actions */}
                        <div className={styles.fbCardFooter}>
                          <div className={styles.fbCardStats}>
                            <div className={styles.fbStat}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                              </svg>
                              {item.likes || 0}
                            </div>
                            <div className={styles.fbStat}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                              </svg>
                              {item.comments || 0}
                            </div>
                            <div className={styles.fbStat}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                              </svg>
                              {item.shares || 0}
                            </div>
                          </div>
                          
                          <div className={styles.fbCardActions}>
                            <button
                                onClick={() => handleAnalyzeWithAI("", item)}
                                className={styles.chatBtn}
                                title="Analyze with AI"
                                style={{ width: 28, height: 28 }}
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
                                </svg>
                            </button>
                            {item.link && (
                              <a href={item.link} target="_blank" rel="noreferrer" className={styles.linkIcon} title="Open post" style={{ width: 28, height: 28 }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                  <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                              </a>
                            )}
                            <button
                                onClick={() => handleCopyQuery(item.text || item.query || '')}
                                className={styles.iconBtn}
                                title="Copy text"
                                style={{ width: 28, height: 28 }}
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={styles.paginationButton}
              >
                ← Previous
              </button>
              <div className={styles.pageInfo}>
                Page <span className={styles.currentPage}>{currentPage}</span> of{' '}
                <span className={styles.totalPages}>{totalPages}</span>
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={styles.paginationButton}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      <TrendingConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        defaultTab={selectedSource}
        onSaved={handleLoadTrending}
      />
    </div>
  );
}
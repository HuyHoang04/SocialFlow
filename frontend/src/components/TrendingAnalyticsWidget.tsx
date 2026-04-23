'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';
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
  traffic?: string;
  news?: string | NewsItem[] | object;
  link?: string;
  image?: string;
  [key: string]: any;
}

interface TrendingResponse {
  success: boolean;
  trending_searches: TrendingSearch[];
  geo?: string;
  category_id?: string;
  error?: string;
}

interface TrendingAnalyticsWidgetProps {
  brandName?: string;
  geo?: string;
  categoryId?: string;
  autoLoad?: boolean;
}

const TREND_CATEGORIES = [
  { id: '', label: 'All Categories' },
  { id: '1', label: 'Autos and Vehicles' },
  { id: '2', label: 'Beauty and Fashion' },
  { id: '3', label: 'Business and Finance' },
  { id: '20', label: 'Climate' },
  { id: '4', label: 'Entertainment' },
  { id: '5', label: 'Food and Drink' },
  { id: '6', label: 'Games' },
  { id: '7', label: 'Health' },
  { id: '8', label: 'Hobbies and Leisure' },
  { id: '9', label: 'Jobs and Education' },
  { id: '10', label: 'Law and Government' },
  { id: '11', label: 'Other' },
  { id: '13', label: 'Pets and Animals' },
  { id: '14', label: 'Politics' },
  { id: '15', label: 'Science' },
  { id: '16', label: 'Shopping' },
  { id: '17', label: 'Sports' },
  { id: '18', label: 'Technology' },
  { id: '19', label: 'Travel and Transportation' },
];

export default function TrendingAnalyticsWidget({
  brandName,
  geo = 'VN',
  categoryId,
  autoLoad = true,
}: TrendingAnalyticsWidgetProps) {
  const { selectedBrand } = useBrand();
  
  const [loading, setLoading] = useState(autoLoad);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<TrendingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Auto-load trending data from cache on component mount
  useEffect(() => {
    if (autoLoad && selectedBrand) {
      handleLoadTrending();
    }
  }, [autoLoad, geo, categoryId, selectedBrand]);

  const handleLoadTrending = async () => {
    if (!selectedBrand) {
      setError('No brand selected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.getTrendingSearches({
        brand_id: selectedBrand.id,
        geo,
        category_id: categoryId,
        brand_name: brandName,
      });

      if (response.success || response.trending_searches?.length > 0) {
        setData(response);
      } else {
        setData(response);
        if (!response.success && response.error) {
          setError(response.error);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching trending');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshTrending = async () => {
    if (!selectedBrand) {
      setError('No brand selected');
      return;
    }

    setRefreshing(true);
    setError(null);
    setCurrentPage(1);

    try {
      const response = await api.refreshTrendingSearches({
        brand_id: selectedBrand.id,
        geo,
        category_id: categoryId,
        brand_name: brandName,
      });

      if (response.success || response.trending_searches?.length > 0) {
        setData(response);
      } else {
        setError(response.error || 'Failed to refresh trending');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error refreshing trending');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCopyQuery = (query: string) => {
    navigator.clipboard.writeText(query);
    alert('Copied: ' + query);
  };

  const parseNews = (newsData: string | NewsItem[] | object | undefined): NewsItem[] => {
    if (!newsData) return [];
    
    // If already an array, return it
    if (Array.isArray(newsData)) return newsData;
    
    // If it's a string, try to parse it as JSON
    if (typeof newsData === 'string') {
      try {
        const parsed = JSON.parse(newsData);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [];
      }
    }
    
    // If it's an object, wrap it in an array
    if (typeof newsData === 'object') {
      return [newsData];
    }
    
    return [];
  };

  // Pagination logic
  const displayData = data?.trending_searches || [];
  const totalPages = Math.ceil(displayData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = displayData.slice(startIndex, startIndex + itemsPerPage);

  const getCategoryLabel = (id: string | undefined) => {
    return TREND_CATEGORIES.find(cat => cat.id === (id || ''))?.label || 'All Categories';
  };

  if (loading) {
    return (
      <div className={styles.widget}>
        <div className={styles.header}>
          <div>
            <h2>✨ Google Trends</h2>
            <p className={styles.subtitle}>Loading trending data...</p>
          </div>
        </div>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <div className={styles.loadingText}>Fetching trending searches...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <div>
          <h2>✨ Google Trends ({geo})</h2>
          <p className={styles.subtitle}>
            {data && data.trending_searches && data.trending_searches.length > 0 
              ? `${data.trending_searches.length} trending searches • ${getCategoryLabel(categoryId)}`
              : 'No data - Click refresh'}
          </p>
        </div>
      </div>

      {error && <div className={styles.error}>❌ {error}</div>}

      {!data?.trending_searches || data.trending_searches.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📭</div>
          <div className={styles.emptyText}>No trending data available</div>
          <p className={styles.emptyHint}>
            Go to <a href="/analytics/trending-config" style={{color: '#667eea', textDecoration: 'underline'}}>Config</a> to set up your preferences
          </p>

          <button
            onClick={handleRefreshTrending}
            disabled={refreshing}
            className={styles.primaryButton}
          >
            {refreshing ? '⏳ Loading...' : '🚀 Load Trending Data'}
          </button>
        </div>
      ) : (
        <div className={styles.resultsContainer}>
          {/* Refresh Button */}
          <div className={styles.refreshSection}>
            <button
              onClick={handleRefreshTrending}
              disabled={refreshing}
              className={styles.secondaryButton}
            >
              {refreshing ? '⏳ Refreshing...' : '🔄 Refresh Trends'}
            </button>
            <a href="/analytics/trending-config" className={styles.configLink}>
              ⚙️ Configure
            </a>
          </div>

          {/* Trending Table */}
          <div className={styles.section}>
            <div className={styles.rankingTable}>
              {/* Table Header */}
              <div className={styles.tableHead}>
                <div className={styles.tableHeadRow}>
                  <div className={styles.tableHeadCell}>Rank</div>
                  <div className={styles.tableHeadCell}>Trending Query</div>
                  <div className={styles.tableHeadCell}>Traffic</div>
                  <div className={styles.tableHeadCell}>Link</div>
                  <div className={styles.tableHeadCell}>Actions</div>
                </div>
              </div>

              {/* Table Body */}
              <div className={styles.tableBody}>
                {paginatedData.map((item, idx) => (
                  <div key={startIndex + idx}>
                    {/* Main Row */}
                    <div className={styles.tableRow}>
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
                              <div 
                                key={nIdx}
                                className={styles.newsBadge}
                                title={newsItem.title || newsItem.source}
                              >
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
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.linkIcon}
                            title="View on Google"
                          >
                            🔗
                          </a>
                        )}
                      </div>

                      <div className={styles.actionButtons}>
                        <button
                          onClick={() => handleCopyQuery(item.query || '')}
                          className={styles.copyBtn}
                          title="Copy query to clipboard"
                        >
                          📋 Copy
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

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
                Page <span className={styles.currentPage}>{currentPage}</span> of <span className={styles.totalPages}>{totalPages}</span>
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
    </div>
  );
}
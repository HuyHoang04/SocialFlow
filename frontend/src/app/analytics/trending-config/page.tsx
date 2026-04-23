import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './trending-config.module.css';
import { api } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';

interface TrendingConfig {
  id: number;
  brandId: string;
  geo: string;
  source: string;
  categoryId?: string;
  searchKeyword?: string;
  createdAt: string;
  updatedAt: string;
}

const TREND_CATEGORIES = [
  { id: '', label: 'Tất cả' },
  { id: 'Autos', label: 'Autos' },
  { id: 'Beauty', label: 'Beauty' },
  { id: 'Business', label: 'Business' },
  { id: 'Climate', label: 'Climate' },
  { id: 'Entertainment', label: 'Entertainment' },
  { id: 'Food_Drink', label: 'Food and Drink' },
  { id: 'Games', label: 'Games' },
  { id: 'Health', label: 'Health' },
  { id: 'Hobbies_Leisure', label: 'Hobbies Leisure' },
  { id: 'Jobs_Education', label: 'Jobs and Education' },
  { id: 'Law_Government', label: 'Law and Government' },
  { id: 'Other', label: 'Other' },
  { id: 'Pets_Animals', label: 'Pets and Animals' },
  { id: 'Politics', label: 'Politics' },
  { id: 'Science', label: 'Science' },
  { id: 'Shopping', label: 'Shopping' },
  { id: 'Sports', label: 'Sports' },
  { id: 'Technology', label: 'Technology' },
  { id: 'Travel_Transportation', label: 'Travel and Transportation' },
];

const SOURCES = [
  { id: 'google', label: ' Google Trends' },
  { id: 'facebook', label: ' Facebook Top Posts' },
];

const GEO_OPTIONS = [
  { code: 'VN', label: 'Viet Nam' },
  { code: 'US', label: 'United States' },
  { code: 'UK', label: 'United Kingdom' },
  { code: 'CN', label: 'China' },
  { code: 'JP', label: 'Japan' },
  { code: 'TH', label: 'Thailand' },
];

export default function TrendingConfigPage() {
  const router = useRouter();
  const { selectedBrand } = useBrand();
  
  const [configs, setConfigs] = useState<TrendingConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedGeo, setSelectedGeo] = useState('VN');
  const [selectedSource, setSelectedSource] = useState('google');
  const [categoryId, setCategoryId] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Check if brand is selected
  useEffect(() => {
    if (!selectedBrand) {
      router.push('/brands');
    }
  }, [selectedBrand, router]);

  // Load configs on component mount or when geo/brand changes
  useEffect(() => {
    if (selectedBrand) {
      loadConfigs();
    }
  }, [selectedGeo, selectedBrand]);

  const loadConfigs = async () => {
    if (!selectedBrand) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/trending/config/${selectedBrand.id}/${selectedGeo}`);
      if (response.ok) {
        const data = await response.json();
        setConfigs(data);
        setError('');
      } else {
        setConfigs([]);
      }
    } catch (err) {
      console.error('Error loading configs:', err);
      setError('Error loading configs');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadExisting = async (config: TrendingConfig) => {
    setSelectedSource(config.source);
    setCategoryId(config.categoryId || '');
    setSearchKeyword(config.searchKeyword || '');
    setMessage('');
  };

  const handleSaveConfig = async () => {
    if (!selectedBrand) {
      setError('Please select a brand first');
      return;
    }

    if (!selectedGeo || !selectedSource) {
      setError('Please select a location and data source');
      return;
    }

    if (selectedSource === 'google' && !categoryId) {
      setError('Please select a category for Google Trends');
      return;
    }

    if (selectedSource === 'facebook' && !searchKeyword.trim()) {
      setError('Please enter a search keyword for Facebook');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/trending/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: selectedBrand.id,
          geo: selectedGeo,
          source: selectedSource,
          categoryId: selectedSource === 'google' ? categoryId : null,
          searchKeyword: selectedSource === 'facebook' ? searchKeyword : null,
        }),
      });

      if (response.ok) {
        setMessage(' Config saved successfully!');
        setError('');
        setTimeout(() => {
          loadConfigs();
          setMessage('');
        }, 1500);
      } else {
        setError('Error saving config');
      }
    } catch (err) {
      console.error('Error saving config:', err);
      setError('Error connecting to server');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfig = async (id: number) => {
    if (!confirm('Are you sure you want to delete this config?')) return;

    try {
      const response = await fetch(`/api/trending/config/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage('Config deleted successfully!');
        setTimeout(() => {
          loadConfigs();
          setMessage('');
        }, 1000);
      } else {
        setError('Error deleting config');
      }
    } catch (err) {
      console.error('Error deleting config:', err);
      setError('Lỗi kết nối');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>⚙️ Trending Configurations</h1>
        <p>Manage data sources and options for each location</p>
      </div>

      <div className={styles.content}>
        {/* Config Form */}
        <div className={styles.configForm}>
          <h2>Add/Update Configuration</h2>

          <div className={styles.formGroup}>
            <label>Location</label>
            <select
              value={selectedGeo}
              onChange={(e) => {
                setSelectedGeo(e.target.value);
                setCategoryId('');
                setSearchKeyword('');
              }}
              className={styles.select}
            >
              {GEO_OPTIONS.map((geo) => (
                <option key={geo.code} value={geo.code}>
                  {geo.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Data Source</label>
            <div className={styles.sourceButtons}>
              {SOURCES.map((source) => (
                <button
                  key={source.id}
                  className={`${styles.sourceBtn} ${selectedSource === source.id ? styles.active : ''}`}
                  onClick={() => {
                    setSelectedSource(source.id);
                    setCategoryId('');
                    setSearchKeyword('');
                  }}
                >
                  {source.label}
                </button>
              ))}
            </div>
          </div>

          {selectedSource === 'google' && (
            <div className={styles.formGroup}>
              <label>📂 Google Trends Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={styles.select}
              >
                <option value="">-- Select Category --</option>
                {TREND_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedSource === 'facebook' && (
            <div className={styles.formGroup}>
              <label>🔑 Search Keyword</label>
              <input
                type="text"
                placeholder="e.g., technology, sports, entertainment..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className={styles.input}
              />
            </div>
          )}

          {message && <div className={styles.success}>{message}</div>}
          {error && <div className={styles.error}>{error}</div>}

          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className={styles.saveBtn}
          >
            {saving ? '💾 Saving...' : '💾 Save Configuration'}
          </button>
        </div>

        {/* Existing Configs */}
        <div className={styles.configsList}>
          <h2>Configurations for {GEO_OPTIONS.find((g) => g.code === selectedGeo)?.label}</h2>

          {loading ? (
            <p className={styles.loading}>⏳ Loading...</p>
          ) : configs.length === 0 ? (
            <p className={styles.empty}>No configurations available. Add a new configuration above!</p>
          ) : (
            <div className={styles.configCards}>
              {configs.map((config) => (
                <div key={config.id} className={styles.configCard}>
                  <div className={styles.cardHeader}>
                    <h3>
                      {SOURCES.find((s) => s.id === config.source)?.label}
                    </h3>
                    <button
                      onClick={() => handleDeleteConfig(config.id)}
                      className={styles.deleteBtn}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>

                  {config.source === 'google' && config.categoryId && (
                    <div className={styles.cardContent}>
                      <p>
                        <strong>📂 Category:</strong>{' '}
                        {TREND_CATEGORIES.find((c) => c.id === config.categoryId)?.label ||
                          config.categoryId}
                      </p>
                    </div>
                  )}

                  {config.source === 'facebook' && config.searchKeyword && (
                    <div className={styles.cardContent}>
                      <p>
                        <strong>🔑 Search Keyword:</strong> {config.searchKeyword}
                      </p>
                    </div>
                  )}

                  <div className={styles.cardFooter}>
                    <small>Updated: {new Date(config.updatedAt).toLocaleDateString('vi-VN')}</small>
                    <button
                      onClick={() => handleLoadExisting(config)}
                      className={styles.editBtn}
                    >
                       Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

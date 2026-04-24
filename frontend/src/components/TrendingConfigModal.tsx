'use client';

import React, { useState, useEffect } from 'react';
import { useBrand } from '@/lib/brand-context';
import { api } from '@/lib/api';
import styles from '@/styles/trending-config-modal.module.css';

interface TrendingConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'google' | 'facebook';
  /** Called after a successful save so the parent can re-fetch trending data. */
  onSaved?: () => void;
}

const CATEGORIES = [
  { id: '1',  label: 'Autos & Vehicles' },
  { id: '2',  label: 'Beauty & Fashion' },
  { id: '3',  label: 'Business & Finance' },
  { id: '20', label: 'Climate' },
  { id: '4',  label: 'Entertainment' },
  { id: '5',  label: 'Food & Drink' },
  { id: '6',  label: 'Games' },
  { id: '7',  label: 'Health' },
  { id: '8',  label: 'Hobbies & Leisure' },
  { id: '9',  label: 'Jobs & Education' },
  { id: '10', label: 'Law & Government' },
  { id: '11', label: 'Other' },
  { id: '13', label: 'Pets & Animals' },
  { id: '14', label: 'Politics' },
  { id: '15', label: 'Science' },
  { id: '16', label: 'Shopping' },
  { id: '17', label: 'Sports' },
  { id: '18', label: 'Technology' },
  { id: '19', label: 'Travel & Transportation' },
];

const GEOS = ['VN', 'US', 'UK', 'CN', 'JP', 'TH'];

export default function TrendingConfigModal({
  isOpen,
  onClose,
  defaultTab = 'google',
  onSaved,
}: TrendingConfigModalProps) {
  const { selectedBrand } = useBrand();
  const [activeTab, setActiveTab] = useState<'google' | 'facebook'>(defaultTab);
  const [geo, setGeo] = useState('VN');
  const [googleCategory, setGoogleCategory] = useState('');
  const [facebookKeyword, setFacebookKeyword] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [message, setMessage] = useState('');

  // Sync tab when defaultTab prop changes (e.g., opened from google vs facebook section)
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Pre-fill form with existing saved config when modal opens or tab switches
  useEffect(() => {
    if (!isOpen || !selectedBrand) return;

    const fetchExistingConfig = async () => {
      setLoadingConfig(true);
      setMessage('');
      try {
        const config = await api.getTrendingConfig(selectedBrand.id, activeTab);
        if (config && config.id) {
          setGeo(config.geo || 'VN');
          if (activeTab === 'google') {
            setGoogleCategory(config.categoryId || '');
          } else {
            setFacebookKeyword(config.searchKeyword || '');
          }
        }
      } catch {
        // No existing config — leave form at defaults, that's fine
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchExistingConfig();
  }, [isOpen, activeTab, selectedBrand]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!selectedBrand) {
      setMessage('Please select a brand');
      return;
    }
    if (activeTab === 'google' && !googleCategory) {
      setMessage('Select a category for Google Trends');
      return;
    }
    if (activeTab === 'facebook' && !facebookKeyword.trim()) {
      setMessage('Enter a keyword for Facebook');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const response = await api.saveTrendingConfig({
        brandId: selectedBrand.id,
        geo,
        source: activeTab,
        categoryId: activeTab === 'google' ? googleCategory : undefined,
        searchKeyword: activeTab === 'facebook' ? facebookKeyword.trim() : undefined,
      });

      if (response?.success || response?.id) {
        setMessage('✓ Saved!');
        setTimeout(() => {
          onClose();
          setMessage('');
          onSaved?.();   // ← notify parent to re-fetch trending with new config
        }, 800);
      } else {
        setMessage('Save failed — please try again');
      }
    } catch (err) {
      setMessage('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>⚙️ Trending Config</h2>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'google' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('google')}
          >
            📊 Google Trends
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'facebook' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('facebook')}
          >
            👥 Facebook Posts
          </button>
        </div>

        <div className={styles.content}>
          {loadingConfig ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
              Loading existing config...
            </div>
          ) : (
            <>
              <div className={styles.field}>
                <label>Location</label>
                <select value={geo} onChange={(e) => setGeo(e.target.value)}>
                  {GEOS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              {activeTab === 'google' ? (
                <div className={styles.field}>
                  <label>Category</label>
                  <select value={googleCategory} onChange={(e) => setGoogleCategory(e.target.value)}>
                    <option value="">Select category...</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className={styles.field}>
                  <label>Search Keyword</label>
                  <input
                    type="text"
                    value={facebookKeyword}
                    onChange={(e) => setFacebookKeyword(e.target.value)}
                    placeholder="e.g. AI, marketing, fashion..."
                  />
                  <small style={{ color: '#888', marginTop: 4, display: 'block' }}>
                    This keyword will be used every time Facebook trending is fetched.
                  </small>
                </div>
              )}
            </>
          )}
        </div>

        {message && (
          <div className={styles.message} style={{ color: message.startsWith('✓') ? '#22c55e' : '#ef4444' }}>
            {message}
          </div>
        )}

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving || loadingConfig}
          >
            {saving ? 'Saving...' : 'Save Config'}
          </button>
        </div>
      </div>
    </div>
  );
}

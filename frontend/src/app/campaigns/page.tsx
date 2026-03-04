'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';
import AppShell from '@/components/AppShell';
import { IconPlus, IconTrash, IconCalendar, IconTarget } from '@/components/Icons';

interface Campaign {
    id: string;
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    brandId: string;
}

export default function CampaignsPage() {
    const { selectedBrand: brand } = useBrand();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(false);

    // Create form state
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [error, setError] = useState('');

    const loadCampaigns = useCallback(async () => {
        if (!brand) return;
        setLoading(true);
        try {
            const data = await api.getCampaigns(brand.id);
            setCampaigns(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load campaigns');
        } finally {
            setLoading(false);
        }
    }, [brand]);

    useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!brand) return;
        if (!name.trim()) return setError('Campaign name is required');

        setSubmitting(true);
        setError('');
        try {
            await api.createCampaign(brand.id, {
                name,
                description,
                startDate: startDate || undefined,
                endDate: endDate || undefined
            });
            setShowForm(false);
            setName('');
            setDescription('');
            setStartDate('');
            setEndDate('');
            loadCampaigns();
        } catch (err: any) {
            setError(err.message || 'Failed to create campaign');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this campaign?')) return;
        try {
            await api.deleteCampaign(id);
            setCampaigns(prev => prev.filter(c => c.id !== id));
        } catch (err: any) {
            alert(err.message || 'Delete failed');
        }
    };

    return (
        <AppShell>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Campaigns</h1>
                    <p className="page-subtitle">Group and track related posts together</p>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                        {showForm ? 'Cancel' : <><IconPlus size={16} /> New Campaign</>}
                    </button>
                </div>
            </div>

            {error && <div className="error-msg" style={{ marginBottom: 24 }}>{error}</div>}

            {showForm && (
                <div className="card" style={{ marginBottom: 32 }}>
                    <h2 style={{ fontSize: 18, marginBottom: 16 }}>Create New Campaign</h2>
                    <form onSubmit={handleCreate} style={{ display: 'grid', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Campaign Name *</label>
                            <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Summer Sale 2026" required autoFocus />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea className="form-textarea" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Marketing details..." />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div className="form-group">
                                <label className="form-label">Start Date</label>
                                <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">End Date</label>
                                <input type="date" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={submitting}>
                                {submitting ? 'Creating...' : 'Create Campaign'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="loading-center"><div className="spinner" /></div>
            ) : campaigns.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon"><IconTarget size={40} color="var(--text-muted)" /></div>
                    <div className="empty-state-title">No campaigns found</div>
                    <div className="empty-state-text">Create your first campaign to group your marketing posts.</div>
                </div>
            ) : (
                <div className="grid grid-3">
                    {campaigns.map(camp => (
                        <div key={camp.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {camp.name}
                                </div>
                                <button
                                    onClick={() => handleDelete(camp.id)}
                                    style={{
                                        background: 'transparent', border: 'none', color: 'var(--error)',
                                        cursor: 'pointer', padding: 4, borderRadius: 'var(--radius-sm)'
                                    }}
                                    className="hover-bg"
                                    title="Delete Campaign"
                                >
                                    <IconTrash size={16} />
                                </button>
                            </div>
                            {camp.description && (
                                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
                                    {camp.description}
                                </p>
                            )}
                            <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-glass)', padding: '8px 12px', borderRadius: 'var(--radius)', width: 'fit-content' }}>
                                <span><IconCalendar size={14} /></span>
                                <span>
                                    {camp.startDate ? new Date(camp.startDate).toLocaleDateString() : 'N/A'}
                                    {' '}—{' '}
                                    {camp.endDate ? new Date(camp.endDate).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </AppShell>
    );
}

'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, isTokenExpired, api, logout, isAdminInBrand } from '@/lib/api';
import { useBrand, Brand } from '@/lib/brand-context';
import CreateBrandForm from '@/components/CreateBrandForm';

export default function BrandsPage() {
    const router = useRouter();
    const { selectBrand, reloadBrands, brands } = useBrand();
    const [localBrands, setLocalBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    // useState(null) ensures server & client both start with null → no hydration mismatch
    const [user, setUser] = useState<{ email: string; name: string; userId: string } | null>(null);
    const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

    const load = useCallback(async () => {
        setError(null);
        try {
            const b = await api.getBrands();
            setLocalBrands(b);
            await reloadBrands();
        } catch (err: any) {
            // 401 → api.ts already calls logout() and redirects — no need to handle here
            // Other errors: surface them so the user knows what happened
            if (err?.message !== 'Unauthorized') {
                setError(err?.message || 'Failed to load brands. Please try again.');
            }
        }
        setLoading(false);
    }, [reloadBrands]);

    useEffect(() => {
        const u = getUser();
        if (!u) { router.replace('/login'); return; }
        // Proactive token expiry check — redirect before making any API call
        if (isTokenExpired()) { logout(); return; }
        setUser(u);
        load();
    }, [load, router]);

    const handleSelectBrand = (brand: Brand) => {
        selectBrand(brand);
        router.push('/dashboard');
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Delete this brand and all its connections, posts, and data?')) return;
        setDeletingId(id);
        try {
            await api.deleteBrand(id);
            await load();
        } catch { /* */ }
        setDeletingId(null);
    };

    // Generate gradient based on brand name
    const getBrandGradient = (name: string) => {
        const gradients = [
            ['#6c5ce7', '#a29bfe'],
            ['#00b894', '#55efc4'],
            ['#e17055', '#fab1a0'],
            ['#0984e3', '#74b9ff'],
            ['#fd79a8', '#fdcb6e'],
            ['#e84393', '#a29bfe'],
            ['#00cec9', '#81ecec'],
            ['#6c5ce7', '#fd79a8'],
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return gradients[Math.abs(hash) % gradients.length];
    };

    // Generate initials
    const getInitials = (name: string) => {
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    // Handle image load failure - fallback to avatar
    const handleImageError = (brandId: string) => {
        setFailedImages(prev => new Set(prev).add(brandId));
    };

    return (
        <div className="brand-select-page">
            {/* Background effects */}
            <div className="brand-select-bg">
                <div className="brand-select-orb brand-select-orb-1" />
                <div className="brand-select-orb brand-select-orb-2" />
                <div className="brand-select-orb brand-select-orb-3" />
            </div>

            <div className="brand-select-container">
                {/* Header */}
                <div className="brand-select-header">
                    <img
                        src="/logo.svg"
                        alt="SocialFlow"
                        style={{
                            width: 140,
                            height: 'auto',
                            maxHeight: 60,
                            objectFit: 'contain'
                        }}
                    />
                    <div className="brand-select-logo">SocialFlow</div>
                    <div className="brand-select-welcome">
                        <h1>Welcome back{user ? `, ${user.name}` : ''}</h1>
                        <p>Choose a brand to get started</p>
                    </div>
                </div>

                {loading ? (
                    <div className="brand-select-loading">
                        <div className="spinner" />
                        <p>Loading your brands...</p>
                    </div>
                ) : (
                    <>
                        {/* Error banner */}
                        {error && (
                            <div style={{
                                background: 'rgba(220,38,38,0.12)',
                                border: '1px solid rgba(220,38,38,0.35)',
                                borderRadius: 10,
                                padding: '12px 16px',
                                marginBottom: 20,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 12,
                                color: '#fca5a5',
                                fontSize: 14,
                            }}>
                                <span>⚠️ {error}</span>
                                <button
                                    onClick={load}
                                    style={{
                                        background: 'rgba(220,38,38,0.2)',
                                        border: '1px solid rgba(220,38,38,0.4)',
                                        borderRadius: 6,
                                        color: '#fca5a5',
                                        padding: '4px 12px',
                                        cursor: 'pointer',
                                        fontSize: 13,
                                        whiteSpace: 'nowrap',
                                    }}
                                >Retry</button>
                            </div>
                        )}

                        {/* Brands grid */}
                        <div className="brand-select-grid">
                            {localBrands.map((brand, index) => {
                                const [color1, color2] = getBrandGradient(brand.name);
                                const isAdmin = isAdminInBrand(brand.id);
                                return (
                                    <div
                                        key={brand.id}
                                        className={`brand-select-card ${hoveredId === brand.id ? 'hovered' : ''}`}
                                        style={{ animationDelay: `${index * 0.08}s` }}
                                        onClick={() => handleSelectBrand(brand)}
                                        onMouseEnter={() => setHoveredId(brand.id)}
                                        onMouseLeave={() => setHoveredId(null)}
                                    >
                                        <div className="brand-card-glow" style={{
                                            background: `radial-gradient(circle at 50% 0%, ${color1}30, transparent 70%)`
                                        }} />
                                        <div className="brand-card-content">
                                            {/* Logo or Avatar */}
                                            {brand.logoUrl && !failedImages.has(brand.id) ? (
                                                <img 
                                                    src={brand.logoUrl} 
                                                    alt={brand.name}
                                                    onError={() => handleImageError(brand.id)}
                                                    style={{
                                                        width: '48px',
                                                        height: '48px',
                                                        borderRadius: '10px',
                                                        objectFit: 'contain',
                                                        background: 'rgba(255,255,255,0.05)',
                                                        padding: '4px',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        flexShrink: 0,
                                                    }}
                                                />
                                            ) : (
                                                <div className="brand-card-avatar" style={{
                                                    background: brand.logoUrl ? 'transparent' : `linear-gradient(135deg, ${color1}, ${color2})`,
                                                overflow: 'hidden'
                                                }}>
                                                    {brand.logoUrl ? (
                                                    <img src={brand.logoUrl} alt={brand.name} style={{
                                                        width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit'
                                                    }} />
                                                ) : (
                                                    getInitials(brand.name)
                                                )}
                                                </div>
                                            )}
                                            {/* Text Content */}
                                            <div className="brand-card-info">
                                                <h3 className="brand-card-name">{brand.name}</h3>
                                                {brand.description && (
                                                    <p className="brand-card-description">{brand.description.substring(0, 60)}{brand.description.length > 60 ? '...' : ''}</p>
                                                )}
                                                <p className="brand-card-meta">
                                                    {brand.connectionCount} connection{brand.connectionCount !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                            <div className="brand-card-arrow">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M5 12h14M12 5l7 7-7 7"/>
                                                </svg>
                                            </div>
                                        </div>
                                        {isAdmin && (
                                            <button
                                                className="brand-card-delete"
                                                onClick={(e) => handleDelete(e, brand.id)}
                                                disabled={deletingId === brand.id}
                                                title="Delete brand (admin only)"
                                            >
                                                {deletingId === brand.id ? '...' : '×'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Add new brand card */}
                            <div
                                className="brand-select-card brand-select-add"
                                onClick={() => setShowForm(true)}
                                style={{ animationDelay: `${localBrands.length * 0.08}s` }}
                            >
                                <div className="brand-card-content">
                                    <div className="brand-add-icon">+</div>
                                    <div className="brand-card-info">
                                        <h3 className="brand-card-name">New Brand</h3>
                                        <p className="brand-card-meta">Create a new workspace</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Create form modal */}
                        {showForm && (
                            <CreateBrandForm
                                onSuccess={() => {
                                    setShowForm(false);
                                    load();
                                }}
                                onCancel={() => setShowForm(false)}
                            />
                        )}
                    </>
                )}

                {/* Footer */}
                <div className="brand-select-footer">
                    <button className="brand-logout-btn" onClick={logout}>
                        Sign out
                    </button>
                </div>
            </div>
        </div>
    );
}

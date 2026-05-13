'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';

interface BrandFormData {
    name: string;
    description: string;
    logoUrl: string;
    website: string;
    contactEmail: string;
    phone: string;
    industry: string;
    country: string;
    brandSlogan: string;
    primaryColor: string;
    secondaryColor: string;
}

export default function BrandSettingsContent() {
    const { selectedBrand, selectBrand } = useBrand();
    const [formData, setFormData] = useState<BrandFormData>({
        name: '',
        description: '',
        logoUrl: '',
        website: '',
        contactEmail: '',
        phone: '',
        industry: '',
        country: '',
        brandSlogan: '',
        primaryColor: '#0066FF',
        secondaryColor: '#666666'
    });
    const [saving, setSaving] = useState(false);
    const [loading, setSuggestionLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        if (selectedBrand) {
            setFormData({
                name: selectedBrand.name || '',
                description: selectedBrand.description || '',
                logoUrl: selectedBrand.logoUrl || '',
                website: selectedBrand.website || '',
                contactEmail: selectedBrand.contactEmail || '',
                phone: selectedBrand.phone || '',
                industry: selectedBrand.industry || '',
                country: selectedBrand.country || '',
                brandSlogan: selectedBrand.brandSlogan || '',
                primaryColor: selectedBrand.primaryColor || '#0066FF',
                secondaryColor: selectedBrand.secondaryColor || '#666666'
            });
        }
    }, [selectedBrand]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const generateSuggestions = async () => {
        if (!formData.name.trim()) {
            setMessage({ type: 'error', text: 'Please enter a brand name first' });
            return;
        }

        setSuggestionLoading(true);
        setMessage(null);
        try {
            const suggestions = await api.generateBrandSuggestions(formData.name);
            
            setFormData(prev => ({
                ...prev,
                industry: suggestions.suggestedIndustry || prev.industry,
                brandSlogan: suggestions.brandSlogan || prev.brandSlogan,
                primaryColor: suggestions.primaryColor || prev.primaryColor,
                secondaryColor: suggestions.secondaryColor || prev.secondaryColor,
                website: suggestions.website || prev.website
            }));
            
            setMessage({ type: 'success', text: '🎯 Gợi ý tự động được tạo thành công!' });
            setShowSuggestions(false);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to generate suggestions' });
        } finally {
            setSuggestionLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBrand) return;

        setSaving(true);
        setMessage(null);
        try {
            const updated = await api.updateBrand(selectedBrand.id, formData);
            selectBrand(updated);
            setMessage({ type: 'success', text: 'Brand settings updated successfully! ✨' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to update brand' });
        } finally {
            setSaving(false);
        }
    };

    if (!selectedBrand) return null;

    return (
        <div style={{ width: '100%', maxWidth: '1200px' }}>
            {message && (
                <div style={{
                    padding: '16px 20px',
                    borderRadius: 'var(--radius)',
                    marginBottom: 32,
                    background: message.type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)',
                    border: `1px solid ${message.type === 'success' ? 'var(--success)' : 'var(--error)'}`,
                    color: 'var(--text-primary)',
                    display: 'flex', alignItems: 'center', gap: 12,
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    <span style={{ fontSize: 20 }}>{message.type === 'success' ? '✅' : '❌'}</span>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{message.text}</span>
                </div>
            )}

            <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '40px',
                boxShadow: 'var(--shadow-lg)',
                backdropFilter: 'blur(10px)'
            }}>
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                    {/* Logo Section */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 24, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
                        <div style={{
                            width: 80, height: 80,
                            borderRadius: 'var(--radius-lg)',
                            background: 'var(--bg-glass-strong)',
                            border: '2px dashed var(--border-hover)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden', flexShrink: 0
                        }}>
                            {formData.logoUrl ? (
                                <img src={formData.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span style={{ fontSize: 20, opacity: 0.3 }}>🖼️</span>
                            )}
                        </div>
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: 18 }}>Brand Logo</h3>
                            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                                URL to your brand's official logo image.
                            </p>
                        </div>
                    </div>

                    {/* Auto-Fill Suggestions Button */}
                    {!showSuggestions && (
                        <button
                            type="button"
                            onClick={() => setShowSuggestions(true)}
                            style={{
                                padding: '12px 20px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                border: 'none',
                                borderRadius: 'var(--radius)',
                                color: 'white',
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                justifyContent: 'center',
                                transition: 'opacity 0.2s'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                        >
                            ✨ {loading ? 'Generating...' : 'Generate Auto-Fill Suggestions'}
                        </button>
                    )}

                    {/* Auto-Fill Suggestion Form */}
                    {showSuggestions && (
                        <div style={{
                            padding: 20,
                            background: 'var(--bg-glass-strong)',
                            border: '2px solid var(--border-hover)',
                            borderRadius: 'var(--radius)',
                            display: 'flex',
                            gap: 12,
                            alignItems: 'flex-end'
                        }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                                    Brand Name
                                </label>
                                <input
                                    className="form-input"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    name="name"
                                    placeholder="Enter brand name..."
                                    required
                                />
                            </div>
                            <button
                                type="button"
                                onClick={generateSuggestions}
                                disabled={loading}
                                style={{
                                    padding: '10px 24px',
                                    background: 'var(--primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 'var(--radius)',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    opacity: loading ? 0.6 : 1
                                }}
                            >
                                {loading ? '⏳' : '🎯'} Generate
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowSuggestions(false)}
                                style={{
                                    padding: '10px 24px',
                                    background: 'transparent',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius)',
                                    fontSize: 14,
                                    cursor: 'pointer'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    )}

                    {/* Form Fields - Grouped */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                        {/* Basic Information */}
                        <div>
                            <h4 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>📋 Basic Information</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase' }}>
                                        Brand Name
                                    </label>
                                    <input className="form-input" name="name" value={formData.name} onChange={handleInputChange} required />
                                </div>

                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase' }}>
                                        Industry
                                    </label>
                                    <input className="form-input" name="industry" value={formData.industry} onChange={handleInputChange} placeholder="e.g., Technology, E-commerce..." />
                                </div>

                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase' }}>
                                        Country
                                    </label>
                                    <input className="form-input" name="country" value={formData.country} onChange={handleInputChange} placeholder="e.g., Vietnam, USA..." />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginTop: 20 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase' }}>
                                    Description
                                </label>
                                <textarea className="form-input" name="description" value={formData.description} onChange={handleInputChange} style={{ height: 100 }} placeholder="Describe your brand..." />
                            </div>

                            <div className="form-group" style={{ marginTop: 20 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase' }}>
                                    Brand Slogan / Tagline
                                </label>
                                <input className="form-input" name="brandSlogan" value={formData.brandSlogan} onChange={handleInputChange} placeholder="Your brand's motto..." />
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div>
                            <h4 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>📞 Contact Information</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase' }}>
                                        Website
                                    </label>
                                    <input className="form-input" name="website" value={formData.website} onChange={handleInputChange} placeholder="https://..." />
                                </div>

                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase' }}>
                                        Email
                                    </label>
                                    <input className="form-input" name="contactEmail" value={formData.contactEmail} onChange={handleInputChange} type="email" placeholder="contact@brand.com" />
                                </div>

                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase' }}>
                                        Phone
                                    </label>
                                    <input className="form-input" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="+84 (0)123456789" />
                                </div>
                            </div>
                        </div>

                        {/* Brand Visual Identity */}
                        <div>
                            <h4 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>🎨 Visual Identity</h4>
                            <div className="form-group" style={{ marginBottom: 20 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase' }}>
                                    Logo URL
                                </label>
                                <input className="form-input" name="logoUrl" value={formData.logoUrl} onChange={handleInputChange} placeholder="https://..." />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase' }}>
                                        Primary Color
                                    </label>
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                        <input
                                            type="color"
                                            name="primaryColor"
                                            value={formData.primaryColor}
                                            onChange={handleInputChange}
                                            style={{ width: 50, height: 45, border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer' }}
                                        />
                                        <input
                                            className="form-input"
                                            name="primaryColor"
                                            value={formData.primaryColor}
                                            onChange={handleInputChange}
                                            style={{ flex: 1 }}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase' }}>
                                        Secondary Color
                                    </label>
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                        <input
                                            type="color"
                                            name="secondaryColor"
                                            value={formData.secondaryColor}
                                            onChange={handleInputChange}
                                            style={{ width: 50, height: 45, border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer' }}
                                        />
                                        <input
                                            className="form-input"
                                            name="secondaryColor"
                                            value={formData.secondaryColor}
                                            onChange={handleInputChange}
                                            style={{ flex: 1 }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
                        <button
                            type="button"
                            onClick={() => setFormData({
                                name: selectedBrand.name || '',
                                description: selectedBrand.description || '',
                                logoUrl: selectedBrand.logoUrl || '',
                                website: selectedBrand.website || '',
                                contactEmail: selectedBrand.contactEmail || '',
                                phone: selectedBrand.phone || '',
                                industry: selectedBrand.industry || '',
                                country: selectedBrand.country || '',
                                brandSlogan: selectedBrand.brandSlogan || '',
                                primaryColor: selectedBrand.primaryColor || '#0066FF',
                                secondaryColor: selectedBrand.secondaryColor || '#666666'
                            })}
                            style={{
                                padding: '10px 24px',
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius)',
                                cursor: 'pointer',
                                fontSize: 14,
                                fontWeight: 600
                            }}
                        >
                            Reset
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving}
                            style={{ padding: '10px 32px', fontSize: 14, fontWeight: 600 }}
                        >
                            {saving ? '💾 Saving...' : '✅ Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

'use client';
import { useState } from 'react';
import { api, setToken } from '@/lib/api';

interface CreateBrandFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

// Quick industry options for fast selection
const QUICK_INDUSTRIES = [
    { name: 'Technology', icon: '💻', emoji: 'tech' },
    { name: 'E-commerce', icon: '🛍️', emoji: 'shop' },
    { name: 'Food & Beverage', icon: '🍔', emoji: 'food' },
    { name: 'Beauty & Wellness', icon: '💄', emoji: 'beauty' },
    { name: 'Health & Fitness', icon: '💪', emoji: 'fitness' },
    { name: 'Travel & Tourism', icon: '✈️', emoji: 'travel' },
    { name: 'Real Estate', icon: '🏠', emoji: 'real-estate' },
    { name: 'Education', icon: '🎓', emoji: 'education' }
];

// Color presets by industry
const INDUSTRY_COLORS: Record<string, { primary: string; secondary: string; }> = {
    'Technology': { primary: '#0066FF', secondary: '#00D9FF' },
    'E-commerce': { primary: '#FF6B6B', secondary: '#FFB3B3' },
    'Food & Beverage': { primary: '#FF8C42', secondary: '#FFA64D' },
    'Beauty & Wellness': { primary: '#E91E8C', secondary: '#FFC0CB' },
    'Health & Fitness': { primary: '#00C853', secondary: '#81C784' },
    'Travel & Tourism': { primary: '#FF6F00', secondary: '#FFB74D' },
    'Real Estate': { primary: '#5E35B1', secondary: '#9C27B0' },
    'Education': { primary: '#1976D2', secondary: '#64B5F6' }
};

// Scrollbar CSS
const SCROLLBAR_STYLES = `
    .create-brand-modal::-webkit-scrollbar {
        width: 8px;
    }
    .create-brand-modal::-webkit-scrollbar-track {
        background: transparent;
    }
    .create-brand-modal::-webkit-scrollbar-thumb {
        background: var(--border-hover);
        border-radius: 4px;
        border: 2px solid transparent;
        background-clip: padding-box;
    }
    .create-brand-modal::-webkit-scrollbar-thumb:hover {
        background: var(--primary);
        background-clip: padding-box;
    }
    .create-brand-modal {
        scrollbar-color: var(--border-hover) transparent;
        scrollbar-width: thin;
    }
`;

export default function CreateBrandForm({ onSuccess, onCancel }: CreateBrandFormProps) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
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
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string>('');
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [creating, setCreating] = useState(false);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [dragActive, setDragActive] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoSelect = (file: File) => {
        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Please select an image file' });
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'Image must be less than 5MB' });
            return;
        }

        setLogoFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
            setLogoPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        setMessage(null);
    };

    const handleLogoUpload = async (file: File) => {
        setUploadingLogo(true);
        setMessage(null);
        try {
            const response = await api.uploadMedia(file);
            setFormData(prev => ({ ...prev, logoUrl: response.url }));
            setMessage({ type: 'success', text: '✅ Logo uploaded successfully' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to upload logo' });
            setLogoFile(null);
            setLogoPreview('');
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleRemoveLogo = () => {
        setLogoFile(null);
        setLogoPreview('');
        setFormData(prev => ({ ...prev, logoUrl: '' }));
        setMessage(null);
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const files = e.dataTransfer.files;
        if (files && files[0]) {
            handleLogoSelect(files[0]);
        }
    };

    const generateSuggestions = async () => {
        if (!formData.name.trim()) {
            setMessage({ type: 'error', text: 'Please enter a brand name first' });
            return;
        }

        setLoadingSuggestions(true);
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

            setMessage({ type: 'success', text: '🎯 Suggestions generated successfully!' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to generate suggestions' });
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const applyQuickIndustry = (industryName: string) => {
        const colors = INDUSTRY_COLORS[industryName];
        setFormData(prev => ({
            ...prev,
            industry: industryName,
            primaryColor: colors.primary,
            secondaryColor: colors.secondary
        }));
        setMessage({ type: 'success', text: `✨ ${industryName} theme applied!` });
    };

    const handleCreate = async () => {
        if (!formData.name.trim()) {
            setMessage({ type: 'error', text: 'Brand name is required' });
            return;
        }

        setCreating(true);
        setMessage(null);
        try {
            // Upload logo if selected
            let finalLogoUrl = formData.logoUrl;
            if (logoFile && !formData.logoUrl) {
                const response = await api.uploadMedia(logoFile);
                finalLogoUrl = response.url;
            }

            const brandResponse = await api.createBrand({
                ...formData,
                logoUrl: finalLogoUrl
            });

            // Store the new JWT token with updated brand roles
            if (brandResponse.token) {
                setToken(brandResponse.token);
            }

            setMessage({ type: 'success', text: '✅ Brand created successfully!' });
            setTimeout(() => onSuccess(), 1000);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to create brand' });
        } finally {
            setCreating(false);
        }
    };

    const renderStepIndicator = () => (
        <div style={{
            display: 'flex',
            gap: 12,
            marginBottom: 32,
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            {[1, 2, 3].map(s => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: s === step ? 'var(--primary)' : s < step ? 'var(--success)' : 'var(--border-hover)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: s < step ? 'pointer' : 'default',
                        transition: 'all 0.3s'
                    }}
                        onClick={() => s < step && setStep(s)}
                    >
                        {s < step ? '✓' : s}
                    </div>
                    {s < 3 && <div style={{ width: 24, height: 2, background: s < step ? 'var(--success)' : 'var(--border)' }} />}
                </div>
            ))}
        </div>
    );

    const renderStep1 = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 20, fontWeight: 600 }}>📋 Brand Basics</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>Start with your brand name (required) - other fields are optional</p>
            </div>

            <div className="form-group">
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    Brand Name *
                </label>
                <input
                    className="form-input"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., TechFlow, GlowUp Beauty..."
                    required
                />
            </div>


            <div className="form-group">
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    Industry (Optional)
                </label>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: 8,
                    paddingBottom: 8
                }}>
                    {QUICK_INDUSTRIES.map((ind) => (
                        <button
                            key={ind.name}
                            type="button"
                            onClick={() => applyQuickIndustry(ind.name)}
                            style={{
                                padding: '12px 8px',
                                background: formData.industry === ind.name ? 'var(--primary)' : 'var(--bg-glass-strong)',
                                color: formData.industry === ind.name ? 'white' : 'var(--text)',
                                border: formData.industry === ind.name ? '2px solid var(--primary)' : '1px solid var(--border)',
                                borderRadius: 'var(--radius)',
                                cursor: 'pointer',
                                fontSize: 12,
                                fontWeight: 600,
                                transition: 'all 0.2s',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 4
                            }}
                        >
                            <span style={{ fontSize: 20 }}>{ind.icon}</span>
                            <span style={{ fontSize: 11 }}>{ind.name}</span>
                        </button>
                    ))}
                </div>
                <input
                    className="form-input"
                    name="industry"
                    value={formData.industry}
                    onChange={handleInputChange}
                    placeholder="Or type your own industry..."
                />
                <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: 11 }}>Pick from above or type a custom industry</p>
            </div>

            <div className="form-group">
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    Brand Logo (Optional)
                </label>
                {!logoPreview ? (
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        style={{
                            border: '2px dashed var(--border-hover)',
                            borderRadius: 'var(--radius)',
                            padding: 32,
                            textAlign: 'center',
                            background: dragActive ? 'var(--bg-glass-strong)' : 'transparent',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 12
                        }}
                    >
                        <div style={{ fontSize: 48 }}>🖼️</div>
                        <div>
                            <p style={{ margin: '0 0 4px 0', fontWeight: 600, fontSize: 14 }}>Drag & drop your logo</p>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>or click to browse (Max 5MB)</p>
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files && handleLogoSelect(e.target.files[0])}
                            style={{ display: 'none' }}
                            id="logo-input"
                        />
                        <label
                            htmlFor="logo-input"
                            style={{
                                padding: '8px 16px',
                                background: 'var(--primary)',
                                color: 'white',
                                borderRadius: 'var(--radius)',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                border: 'none'
                            }}
                        >
                            📁 Choose File
                        </label>
                    </div>
                ) : (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        padding: 20,
                        background: 'var(--bg-glass-strong)',
                        border: '2px solid var(--border-hover)',
                        borderRadius: 'var(--radius)'
                    }}>
                        <div style={{
                            display: 'flex',
                            gap: 16,
                            alignItems: 'center'
                        }}>
                            <img
                                src={logoPreview}
                                alt="Logo preview"
                                style={{
                                    width: 100,
                                    height: 100,
                                    objectFit: 'contain',
                                    borderRadius: 'var(--radius)',
                                    background: 'white',
                                    border: '1px solid var(--border)'
                                }}
                            />
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: '0 0 8px 0', fontWeight: 600, fontSize: 14 }}>✅ Logo selected</p>
                                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                                    {logoFile?.name} ({(logoFile?.size ?? 0 / 1024).toFixed(1)}KB)
                                </p>
                                {uploadingLogo && (
                                    <p style={{ margin: '8px 0 0 0', fontSize: 12, color: 'var(--primary)' }}>⏳ Uploading...</p>
                                )}
                            </div>
                        </div>

                        {logoFile && !formData.logoUrl && (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    type="button"
                                    onClick={() => handleLogoUpload(logoFile)}
                                    disabled={uploadingLogo}
                                    style={{
                                        flex: 1,
                                        padding: '8px 12px',
                                        background: 'var(--success)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 'var(--radius)',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        cursor: uploadingLogo ? 'not-allowed' : 'pointer',
                                        opacity: uploadingLogo ? 0.6 : 1
                                    }}
                                >
                                    {uploadingLogo ? '⏳ Uploading...' : '📤 Upload Logo'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRemoveLogo}
                                    disabled={uploadingLogo}
                                    style={{
                                        flex: 1,
                                        padding: '8px 12px',
                                        background: 'transparent',
                                        color: 'var(--text-secondary)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius)',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        cursor: uploadingLogo ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    ✕ Remove
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="form-group">
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    Description (Optional)
                </label>
                <textarea
                    className="form-input"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe your brand..."
                    style={{ height: 100 }}
                />
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 20, fontWeight: 600 }}>📞 Contact & Business Info</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>All fields are optional - add details if you want</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                        Website (Optional)
                    </label>
                    <input
                        className="form-input"
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        placeholder="https://..."
                    />
                </div>

                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                        Email (Optional)
                    </label>
                    <input
                        className="form-input"
                        name="contactEmail"
                        type="email"
                        value={formData.contactEmail}
                        onChange={handleInputChange}
                        placeholder="contact@brand.com"
                    />
                </div>

                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                        Phone (Optional)
                    </label>
                    <input
                        className="form-input"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+84 (0)123456789"
                    />
                </div>

                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                        Country (Optional)
                    </label>
                    <input
                        className="form-input"
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        placeholder="e.g., Vietnam, USA..."
                    />
                </div>

                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                        Brand Slogan (Optional)
                    </label>
                    <input
                        className="form-input"
                        name="brandSlogan"
                        value={formData.brandSlogan}
                        onChange={handleInputChange}
                        placeholder="Your brand's motto..."
                    />
                </div>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 20, fontWeight: 600 }}>🎨 Brand Colors</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>All fields are optional - customize if you want</p>
            </div>

            {/* Quick Color Presets */}
            {formData.industry && (
                <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                        ⚡ Quick Presets
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
                        {Object.entries(INDUSTRY_COLORS).map(([industry, colors]) => (
                            <button
                                key={industry}
                                type="button"
                                onClick={() => {
                                    setFormData(prev => ({
                                        ...prev,
                                        primaryColor: colors.primary,
                                        secondaryColor: colors.secondary
                                    }));
                                }}
                                style={{
                                    padding: 12,
                                    background: 'var(--bg-glass-strong)',
                                    border: formData.primaryColor === colors.primary ? '2px solid var(--primary)' : '1px solid var(--border)',
                                    borderRadius: 'var(--radius)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 6,
                                    alignItems: 'center'
                                }}
                            >
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <div
                                        style={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: '50%',
                                            background: colors.primary,
                                            border: '1px solid var(--border)'
                                        }}
                                    />
                                    <div
                                        style={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: '50%',
                                            background: colors.secondary,
                                            border: '1px solid var(--border)'
                                        }}
                                    />
                                </div>
                                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>{industry}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                        Primary Color (Optional)
                    </label>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <input
                            type="color"
                            name="primaryColor"
                            value={formData.primaryColor}
                            onChange={handleInputChange}
                            style={{
                                width: 50,
                                height: 45,
                                border: '2px solid var(--border)',
                                borderRadius: 'var(--radius)',
                                cursor: 'pointer'
                            }}
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
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                        Secondary Color (Optional)
                    </label>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <input
                            type="color"
                            name="secondaryColor"
                            value={formData.secondaryColor}
                            onChange={handleInputChange}
                            style={{
                                width: 50,
                                height: 45,
                                border: '2px solid var(--border)',
                                borderRadius: 'var(--radius)',
                                cursor: 'pointer'
                            }}
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

            {/* Color Preview */}
            <div style={{
                padding: 20,
                background: 'var(--bg-glass-strong)',
                border: '2px solid var(--border-hover)',
                borderRadius: 'var(--radius)',
                display: 'flex',
                gap: 20,
                alignItems: 'center'
            }}>
                <div style={{
                    flex: 1,
                    height: 60,
                    borderRadius: 'var(--radius)',
                    background: formData.primaryColor,
                    border: '2px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: 12
                }}>
                    Primary
                </div>
                <div style={{
                    flex: 1,
                    height: 60,
                    borderRadius: 'var(--radius)',
                    background: formData.secondaryColor,
                    border: '2px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: 12
                }}>
                    Secondary
                </div>
            </div>

            {/* Summary */}
            <div style={{
                padding: 20,
                background: 'var(--bg-glass-strong)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
            }}>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>📦 Brand Summary</h4>
                <div style={{ fontSize: 13, display: 'grid', gap: 8 }}>
                    <div><strong>Name:</strong> {formData.name || 'Not set'}</div>
                    <div><strong>Industry:</strong> {formData.industry || 'Not set'}</div>
                    <div><strong>Country:</strong> {formData.country || 'Not set'}</div>
                    <div><strong>Website:</strong> {formData.website || 'Not set'}</div>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <style>{SCROLLBAR_STYLES}</style>
            <div style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px'
            }}>
                <div className="create-brand-modal" style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    maxWidth: '600px',
                    width: '100%',
                    maxHeight: 'calc(100vh - 40px)',
                    boxShadow: 'var(--shadow-lg)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    {/* Content Area - Scrollable */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: 'clamp(20px, 5vw, 40px)'
                    }}>
                        {/* Message */}
                        {message && (
                            <div style={{
                                padding: '12px 16px',
                                borderRadius: 'var(--radius)',
                                marginBottom: 24,
                                background: message.type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)',
                                border: `1px solid ${message.type === 'success' ? 'var(--success)' : 'var(--error)'}`,
                                color: 'var(--text-primary)',
                                fontSize: 13,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}>
                                <span>{message.type === 'success' ? '✅' : '❌'}</span>
                                {message.text}
                            </div>
                        )}

                        {/* Step Indicator */}
                        {renderStepIndicator()}

                        {/* Step Content */}
                        <div style={{ marginBottom: 0 }}>
                            {step === 1 && renderStep1()}
                            {step === 2 && renderStep2()}
                            {step === 3 && renderStep3()}
                        </div>
                    </div>

                    {/* Footer - Always Visible */}
                    <div style={{
                        display: 'flex',
                        gap: 12,
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 'clamp(16px, 5vw, 24px)',
                        borderTop: '1px solid var(--border)',
                        flexShrink: 0
                    }}>
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={creating}
                            style={{
                                padding: '10px 24px',
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius)',
                                cursor: creating ? 'not-allowed' : 'pointer',
                                fontSize: 14,
                                fontWeight: 600,
                                opacity: creating ? 0.5 : 1
                            }}
                        >
                            Cancel
                        </button>

                        <div style={{ display: 'flex', gap: 12 }}>
                            {step > 1 && (
                                <button
                                    type="button"
                                    onClick={() => setStep(step - 1)}
                                    disabled={creating}
                                    style={{
                                        padding: '10px 24px',
                                        background: 'var(--bg-glass-strong)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-hover)',
                                        borderRadius: 'var(--radius)',
                                        cursor: creating ? 'not-allowed' : 'pointer',
                                        fontSize: 14,
                                        fontWeight: 600,
                                        opacity: creating ? 0.5 : 1
                                    }}
                                >
                                    ← Back
                                </button>
                            )}

                            {step < 3 ? (
                                <button
                                    type="button"
                                    onClick={() => setStep(step + 1)}
                                    disabled={creating || (step === 1 && !formData.name.trim())}
                                    style={{
                                        padding: '10px 24px',
                                        background: 'var(--primary)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 'var(--radius)',
                                        cursor: creating || (step === 1 && !formData.name.trim()) ? 'not-allowed' : 'pointer',
                                        fontSize: 14,
                                        fontWeight: 600,
                                        opacity: creating || (step === 1 && !formData.name.trim()) ? 0.5 : 1
                                    }}
                                >
                                    Next →
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleCreate}
                                    disabled={creating || !formData.name.trim()}
                                    style={{
                                        padding: '10px 24px',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 'var(--radius)',
                                        cursor: creating || !formData.name.trim() ? 'not-allowed' : 'pointer',
                                        fontSize: 14,
                                        fontWeight: 600,
                                        opacity: creating || !formData.name.trim() ? 0.5 : 1
                                    }}
                                >
                                    {creating ? '⏳ Creating...' : '✅ Create Brand'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

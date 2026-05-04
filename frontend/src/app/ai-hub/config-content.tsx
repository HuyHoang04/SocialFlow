'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';
import { IconSparkles, IconDeviceFloppy, IconRefreshCw } from '@/components/Icons';

export default function AiConfigContent() {
    const { selectedBrand: brand } = useBrand();
    const [config, setConfig] = useState<any>({
        text_provider: '', text_model: '',
        image_provider: '', image_model: '',
        embedding_provider: '', embedding_model: ''
    });
    const [availableModels, setAvailableModels] = useState<any[]>([]);
    const [imageModels, setImageModels] = useState<any[]>([]);
    const [embeddingModels, setEmbeddingModels] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => { loadAvailableModels(); }, []);
    useEffect(() => { if (brand) loadConfig(); }, [brand]);

    const loadConfig = async () => {
        if (!brand) return;
        setLoading(true);
        try {
            const data = await api.getAiConfig(brand.id);
            if (data) {
                setConfig({
                    text_provider: data.textProvider || '',
                    text_model: data.textModel || '',
                    image_provider: data.imageProvider || '',
                    image_model: data.imageModel || '',
                    embedding_provider: data.embeddingProvider || '',
                    embedding_model: data.embeddingModel || ''
                });
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const loadAvailableModels = async () => {
        try {
            const [textRes, imageRes, embeddingRes] = await Promise.all([
                api.getModels(), api.getImageModels(), api.getRagModels()
            ]);

            const extractArray = (res: any) => {
                if (Array.isArray(res)) return res;
                if (res && res.models) return res.models;
                if (res && typeof res === 'object') {
                    const flattened = [];
                    for (const [provider, models] of Object.entries(res)) {
                        if (models && typeof models === 'object' && !Array.isArray(models)) {
                            for (const [modelId, details] of Object.entries(models)) {
                                flattened.push({ ...(details as object), id: modelId, provider });
                            }
                        }
                    }
                    return flattened;
                }
                return [];
            };

            setAvailableModels(extractArray(textRes));
            setImageModels(extractArray(imageRes));
            setEmbeddingModels(extractArray(embeddingRes));
        } catch (err) { console.error(err); }
    };

    const handleSave = async () => {
        if (!brand) return;
        setSaving(true);
        setMessage(null);
        try {
            await api.updateAiConfig(brand.id, config);
            setMessage({ type: 'success', text: 'AI configuration saved successfully! ✨' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to save' });
        } finally { setSaving(false); }
    };

    const renderModelOptions = (models: any[], selectedProvider: string) => {
        if (!selectedProvider) return null;
        return models.filter(m => m.provider === selectedProvider).map((m, idx) => (
            <option key={idx} value={m.id || m.name} style={{ color: 'black' }}>{m.displayName || m.id || m.name}</option>
        ));
    };

    if (!brand) return null;

    return (
        <div style={{ width: '100%' }}>
            {message && (
                <div className={`alert alert-${message.type}`} style={{ marginBottom: 24, padding: 16, borderRadius: 'var(--radius)', background: message.type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)', border: `1px solid ${message.type === 'success' ? 'var(--success)' : 'var(--error)'}` }}>
                    {message.text}
                </div>
            )}

            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gap: 24,
                width: '100%',
                alignItems: 'stretch'
            }}>
                {[
                    { title: 'Text Generation', icon: <IconSparkles color="var(--accent)" />, provider: 'text_provider', model: 'text_model', models: availableModels },
                    { title: 'Image Generation', icon: <IconSparkles color="var(--success)" />, provider: 'image_provider', model: 'image_model', models: imageModels },
                    { title: 'Embeddings (RAG)', icon: <IconSparkles color="var(--warning)" />, provider: 'embedding_provider', model: 'embedding_model', models: embeddingModels }
                ].map((section, idx) => (
                    <div key={idx} style={{ 
                        background: 'var(--bg-card)', 
                        padding: '28px', 
                        borderRadius: 'var(--radius-lg)', 
                        border: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'var(--transition)',
                        boxShadow: 'var(--shadow)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                            <div style={{ 
                                width: 36, height: 36, borderRadius: 'var(--radius-sm)', 
                                background: 'var(--bg-glass-strong)', display: 'flex', 
                                alignItems: 'center', justifyContent: 'center' 
                            }}>
                                {section.icon}
                            </div>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{section.title}</h3>
                        </div>
                        <div className="form-group" style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Provider</label>
                            <select className="form-input" value={config[section.provider]} onChange={e => setConfig({ ...config, [section.provider]: e.target.value })} style={{ fontSize: 13, background: 'var(--bg-glass-strong)' }}>
                                <option value="">Auto (Default)</option>
                                {Array.from(new Set(section.models.map(m => m.provider))).map(p => <option key={p} value={p} style={{color:"black"}}>{p}</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{ marginTop: 'auto' }}>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Model</label>
                            <select className="form-input" value={config[section.model]} onChange={e => setConfig({ ...config, [section.model]: e.target.value })} disabled={!config[section.provider]} style={{ fontSize: 13, background: 'var(--bg-glass-strong)' }}>
                                <option value="">Select a model...</option>
                                {renderModelOptions(section.models, config[section.provider])}
                            </select>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ 
                marginTop: 40, 
                paddingTop: 24, 
                borderTop: '1px solid var(--border)',
                display: 'flex', 
                justifyContent: 'flex-end' 
            }}>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '0 32px', height: 44, borderRadius: 'var(--radius-sm)' }}>
                    {saving ? 'Saving...' : 'Save AI Configuration'}
                </button>
            </div>
        </div>
    );
}

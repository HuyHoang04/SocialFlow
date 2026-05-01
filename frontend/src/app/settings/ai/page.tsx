'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';
import AppShell from '@/components/AppShell';
import { IconSparkles, IconDeviceFloppy, IconRefreshCw } from '@/components/Icons';

export default function AiConfigPage() {
    const { selectedBrand: brand } = useBrand();
    const [config, setConfig] = useState<any>({
        text_provider: '',
        text_model: '',
        image_provider: '',
        image_model: '',
        embedding_provider: '',
        embedding_model: ''
    });
    const [availableModels, setAvailableModels] = useState<any[]>([]);
    const [imageModels, setImageModels] = useState<any[]>([]);
    const [embeddingModels, setEmbeddingModels] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        loadAvailableModels();
    }, []);

    useEffect(() => {
        if (brand) {
            loadConfig();
        }
    }, [brand]);

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
        } catch (err) {
            console.error('Failed to load AI config:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadAvailableModels = async () => {
        try {
            console.log('🔄 Loading available models...');
            const [textRes, imageRes, embeddingRes] = await Promise.all([
                api.getModels(),
                api.getImageModels(),
                api.getRagModels()
            ]);

            console.log('📦 Responses:', { textRes, imageRes, embeddingRes });

            const extractArray = (res: any) => {
                if (Array.isArray(res)) return res;
                if (res && res.models && Array.isArray(res.models)) return res.models;
                if (res && res.data && Array.isArray(res.data)) return res.data;

                // Handle nested object format: { provider: { model_id: { ... } } }
                if (res && typeof res === 'object') {
                    const flattened = [];
                    for (const [provider, models] of Object.entries(res)) {
                        if (models && typeof models === 'object' && !Array.isArray(models)) {
                            for (const [modelId, details] of Object.entries(models)) {
                                const modelDetails = { ...(details as object) };
                                // If the service returns a generic "name": "model", remove it
                                if ((modelDetails as any).name === 'model') {
                                    delete (modelDetails as any).name;
                                }

                                flattened.push({
                                    ...modelDetails,
                                    id: modelId,
                                    name: modelId,
                                    displayName: modelId,
                                    provider: provider
                                });
                            }
                        }
                    }
                    if (flattened.length > 0) return flattened;
                }

                return [];
            };

            setAvailableModels(extractArray(textRes));
            setImageModels(extractArray(imageRes));
            setEmbeddingModels(extractArray(embeddingRes));

        } catch (err) {
            console.error('Failed to load models:', err);
        }
    };

    const handleSave = async () => {
        if (!brand) return;
        setSaving(true);
        setMessage(null);
        try {
            await api.updateAiConfig(brand.id, config);
            setMessage({ type: 'success', text: 'AI configuration saved successfully!' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to save configuration' });
        } finally {
            setSaving(false);
        }
    };

    if (!brand) {
        return (
            <AppShell>
                <div className="flex-center" style={{ height: '70vh' }}>
                    <div className="card text-center" style={{ maxWidth: 400, padding: 32 }}>
                        <IconSparkles size={48} color="var(--primary)" style={{ marginBottom: 16 }} />
                        <h2 className="page-title">Select a Brand</h2>
                        <p className="page-subtitle">Please select a brand from the sidebar to configure AI models.</p>
                    </div>
                </div>
            </AppShell>
        );
    }

    const textProviders = Array.from(new Set(availableModels.map(m => m.provider)));
    const imageProviders = Array.from(new Set(imageModels.map(m => m.provider)));
    const embeddingProviders = Array.from(new Set(embeddingModels.map(m => m.provider)));

    const renderModelOptions = (models: any[], selectedProvider: string) => {
        if (!selectedProvider) return null;
        return models
            .filter(m => m.provider === selectedProvider)
            .map((m, idx) => {
                const modelId = m.id || m.name || m.model || `model-${idx}`;
                const modelLabel = m.displayName || m.name || m.id || m.model || `Model ${idx}`;
                // Use provider prefix to ensure uniqueness across different providers
                const uniqueKey = `${m.provider}:${modelId}`;
                return <option style={{ color: 'black' }} key={uniqueKey} value={modelId}>{modelLabel}</option>;
            });
    };

    return (
        <AppShell>
            <div className="page-header">
                <div>
                    <h1 className="page-title">AI Model Configuration</h1>
                    <p className="page-subtitle">Configure default AI providers and models for {brand.name}</p>
                </div>
                <div className="flex gap-2">
                    {/* <button
                        className="btn btn-outline"
                        onClick={async () => {
                            setLoading(true);
                            try {
                                await api.refreshModels();
                                await loadAvailableModels();
                            } catch (err) {
                                console.error('Refresh failed:', err);
                            } finally {
                                setLoading(false);
                            }
                        }}
                    >
                        <IconRefreshCw size={18} />
                        <span>Refresh Models</span>
                    </button> */}
                    <button
                        className={`btn btn-primary ${saving ? 'disabled' : ''}`}
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? <IconRefreshCw className="spin" size={18} /> : <IconDeviceFloppy size={18} />}
                        <span>Save Changes</span>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex-center" style={{ height: '40vh' }}>
                    <IconRefreshCw className="spin" size={32} color="var(--primary)" />
                </div>
            ) : (
                <div className="config-grid">
                    {message && (
                        <div className={`alert alert-${message.type}`} style={{ gridColumn: '1 / -1' }}>
                            {message.text}
                        </div>
                    )}

                    <div className="card config-section">
                        <div className="section-header">
                            <IconSparkles size={20} color="var(--primary)" />
                            <h3>Text Generation</h3>
                        </div>
                        <div className="form-group">
                            <label>Provider</label>
                            <select
                                value={config.text_provider}
                                onChange={(e) => setConfig({ ...config, text_provider: e.target.value })}
                            >
                                <option style={{ color: 'black' }} value="">Auto (Default)</option>
                                {textProviders.map(p => <option style={{ color: 'black' }} key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Model</label>
                            <select
                                value={config.text_model}
                                onChange={(e) => setConfig({ ...config, text_model: e.target.value })}
                                disabled={!config.text_provider}
                            >
                                <option value="">{config.text_provider ? 'Select a model...' : 'Please select provider first'}</option>
                                {renderModelOptions(availableModels, config.text_provider)}
                            </select>
                        </div>
                    </div>

                    <div className="card config-section">
                        <div className="section-header">
                            <IconSparkles size={20} color="var(--success)" />
                            <h3>Image Generation</h3>
                        </div>
                        <div className="form-group">
                            <label>Provider</label>
                            <select
                                value={config.image_provider}
                                onChange={(e) => setConfig({ ...config, image_provider: e.target.value })}
                            >
                                <option value="">Auto (Default)</option>
                                {imageProviders.map(p => <option style={{ color: 'black' }} key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Model</label>
                            <select
                                value={config.image_model}
                                onChange={(e) => setConfig({ ...config, image_model: e.target.value })}
                                disabled={!config.image_provider}
                            >
                                <option value="">{config.image_provider ? 'Select a model...' : 'Please select provider first'}</option>
                                {renderModelOptions(imageModels, config.image_provider)}
                            </select>
                        </div>
                    </div>

                    <div className="card config-section">
                        <div className="section-header">
                            <IconSparkles size={20} color="var(--warning)" />
                            <h3>Embeddings (RAG)</h3>
                        </div>
                        <div className="form-group">
                            <label>Provider</label>
                            <select
                                value={config.embedding_provider}
                                onChange={(e) => setConfig({ ...config, embedding_provider: e.target.value })}
                            >
                                <option value="">Auto (Default)</option>
                                {embeddingProviders.map(p => <option style={{ color: 'black' }} key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Model</label>
                            <select
                                value={config.embedding_model}
                                onChange={(e) => setConfig({ ...config, embedding_model: e.target.value })}
                                disabled={!config.embedding_provider}
                            >
                                <option value="">{config.embedding_provider ? 'Select a model...' : 'Please select provider first'}</option>
                                {renderModelOptions(embeddingModels, config.embedding_provider)}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .config-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                    gap: 24px;
                    margin-top: 24px;
                }
                .config-section {
                    padding: 24px;
                }
                .section-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 20px;
                }
                .section-header h3 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 700;
                }
                .form-group {
                    margin-bottom: 16px;
                }
                .form-group label {
                    display: block;
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--text-secondary);
                    margin-bottom: 6px;
                }
                .form-group select {
                    width: 100%;
                    padding: 10px 12px;
                    border-radius: var(--radius-sm);
                    background: var(--bg-glass);
                    border: 1px solid var(--border);
                    color: var(--text-primary);
                    outline: none;
                    transition: border-color 0.2s;
                }
                .form-group select:focus {
                    border-color: var(--primary);
                }
                .alert {
                    padding: 12px 16px;
                    border-radius: var(--radius-sm);
                    font-size: 14px;
                    margin-bottom: 16px;
                }
                .alert-success {
                    background: rgba(34, 197, 94, 0.1);
                    border: 1px solid var(--success);
                    color: var(--success);
                }
                .alert-error {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid var(--danger);
                    color: var(--danger);
                }
            `}</style>
        </AppShell>
    );
}

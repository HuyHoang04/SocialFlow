'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';

interface WorkflowConfig {
    enabled: boolean;
    approvalLevels: number;
}

export default function WorkflowContent() {
    const { selectedBrand } = useBrand();
    const [workflowConfig, setWorkflowConfig] = useState<WorkflowConfig>({ enabled: false, approvalLevels: 1 });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (selectedBrand) {
            setLoading(true);
            api.getWorkflowConfig(selectedBrand.id)
                .then(config => setWorkflowConfig(config))
                .catch(err => {
                    console.warn('Failed to load workflow config:', err);
                    setWorkflowConfig({ enabled: false, approvalLevels: 1 });
                })
                .finally(() => setLoading(false));
        }
    }, [selectedBrand]);

    const handleSaveWorkflow = async () => {
        if (!selectedBrand) return;

        setSaving(true);
        setMessage(null);
        try {
            await api.updateWorkflowConfig(selectedBrand.id, workflowConfig.enabled, 1);
            setMessage({ type: 'success', text: 'Approval workflow settings updated! ✨' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to update workflow config' });
        } finally {
            setSaving(false);
        }
    };

    if (!selectedBrand) return null;

    return (
        <div style={{ width: '100%' }}>
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
                {loading ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 20px' }}>
                        <div className="spinner" style={{ margin: '0 auto 16px' }} />
                        <span style={{ fontSize: 13 }}>Loading workflow settings...</span>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                        {/* Header */}
                        <div>
                            <h2 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 600 }}>Approval Workflow</h2>
                            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                                Control how posts are reviewed and approved before publishing
                            </p>
                        </div>

                        {/* Toggle */}
                        <div style={{
                            padding: 20, borderRadius: 'var(--radius)',
                            background: 'var(--bg-glass-strong)',
                            border: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                            <div>
                                <p style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 500 }}>
                                    Require post approval before publishing
                                </p>
                                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                                    When enabled, creators must submit posts for approval. Managers/Admins can then approve or reject them.
                                </p>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0 }}>
                                <input
                                    type="checkbox"
                                    checked={workflowConfig.enabled}
                                    onChange={(e) => setWorkflowConfig({ ...workflowConfig, enabled: e.target.checked })}
                                    style={{ cursor: 'pointer', width: 20, height: 20 }}
                                />
                            </label>
                        </div>



                        {/* Info Box */}
                        <div style={{
                            padding: 16, borderRadius: 'var(--radius)',
                            background: 'rgba(100, 150, 255, 0.05)',
                            border: '1px solid rgba(100, 150, 255, 0.2)',
                            fontSize: 13, color: 'var(--text-secondary)', lineHeight: '1.6'
                        }}>
                            <p style={{ margin: '0 0 8px 0', fontWeight: 500 }}>💡 How it works:</p>
                            <ul style={{ margin: 0, paddingLeft: 20 }}>
                                <li>Creators submit posts for approval</li>
                                <li>Approvers (assigned per post) review and approve/reject</li>
                                <li>Scheduled posts bypass approval (published automatically)</li>
                            </ul>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 24, borderTop: '1px solid var(--border)' }}>
                            <button
                                className="btn btn-primary"
                                onClick={handleSaveWorkflow}
                                disabled={saving}
                                style={{ padding: '0 32px' }}
                            >
                                {saving ? 'Saving...' : 'Update Workflow'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import LibraryContent from '@/app/ai-hub/library-content';
import AiConfigContent from '@/app/ai-hub/config-content';
import { IconBook, IconSettings } from '@/components/Icons';

function AiHubContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const tabParam = searchParams.get('tab') || 'library';
    const [activeTab, setActiveTab] = useState(tabParam);

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        router.push(`/ai-hub?tab=${tab}`);
    };

    const tabs = [
        { id: 'library', label: 'Content Library', icon: <IconBook size={18} /> },
        { id: 'config', label: 'AI Configuration', icon: <IconSettings size={18} /> },
    ];

    return (
        <div style={{ width: '100%', padding: '0 40px' }}>
            <div className="page-header" style={{ marginBottom: 24 }}>
                <div>
                    <h1 className="page-title" style={{ fontSize: 24, marginBottom: 4 }}>AI Hub</h1>
                    <p className="page-subtitle" style={{ fontSize: 13, color: 'var(--text-muted)' }}>Manage knowledge base and model preferences</p>
                </div>
            </div>

            <div style={{ 
                display: 'flex', 
                gap: 16, 
                marginBottom: 24,
                borderBottom: '1px solid var(--border)',
                width: '100%'
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        style={{
                            padding: '8px 16px',
                            border: 'none',
                            background: 'transparent',
                            color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'var(--transition)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                            marginBottom: '-1px'
                        }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', opacity: activeTab === tab.id ? 1 : 0.6 }}>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            <div style={{ animation: 'fadeIn 0.3s ease-out', width: '100%' }}>
                {activeTab === 'library' ? <LibraryContent /> : <AiConfigContent />}
            </div>
        </div>
    );
}

export default function AiHubPage() {
    return (
        <AppShell>
            <Suspense fallback={<div className="loading-center"><div className="spinner" /></div>}>
                <AiHubContent />
            </Suspense>
        </AppShell>
    );
}

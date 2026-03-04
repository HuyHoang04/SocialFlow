'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { selectedBrand, loading } = useBrand();

    useEffect(() => {
        if (!getUser()) { router.replace('/login'); return; }
        if (!loading && !selectedBrand) router.replace('/brands');
    }, [router, selectedBrand, loading]);

    if (loading || !selectedBrand) {
        return (
            <div className="loading-center" style={{ minHeight: '100vh' }}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">{children}</main>
        </div>
    );
}

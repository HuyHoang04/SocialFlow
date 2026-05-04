'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, isTokenExpired, logout } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';
import Sidebar from './Sidebar';
import { IconMenu, IconSettings } from './Icons';
import ChatDrawer from './ChatDrawer';

export default function AppShell({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { selectedBrand, loading } = useBrand();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        // 1. No user info → not logged in
        if (!getUser()) { router.replace('/login'); return; }
        // 2. Token exists but JWT exp is in the past → redirect immediately
        //    (prevents "empty data with no redirect" when token silently expired)
        if (isTokenExpired()) { logout(); return; }
        // 3. Logged in but no brand selected
        if (!loading && !selectedBrand) router.replace('/brands');
    }, [router, selectedBrand, loading]);

    useEffect(() => {
        const saved = localStorage.getItem('sf_sidebar_collapsed');
        if (saved === 'true') setCollapsed(true);
    }, []);

    const toggleCollapse = () => {
        const next = !collapsed;
        setCollapsed(next);
        localStorage.setItem('sf_sidebar_collapsed', String(next));
    };

    if (loading || !selectedBrand) {
        return (
            <div className="loading-center" style={{ minHeight: '100vh' }}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className={`app-layout ${collapsed ? 'collapsed' : ''}`}>
            <Sidebar collapsed={collapsed} onToggle={toggleCollapse} />
            <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)}>
                <IconMenu size={22} />
            </button>
            <main className="main-content">
                <div className="main-bg-effects">
                    <div className="main-bg-orb main-bg-orb-1" />
                    <div className="main-bg-orb main-bg-orb-2" />
                </div>
                {children}
                <ChatDrawer />
            </main>
        </div>
    );
}

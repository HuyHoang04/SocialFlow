'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { getUser, logout } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    IconDashboard, IconBarChart, IconInbox, IconPenSquare,
    IconImage, IconTarget, IconLink, IconLogOut, IconZap,
    IconChevronLeft, IconChevronRight,
} from './Icons';

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { selectedBrand, clearBrand } = useBrand();
    const [user, setUser] = useState<{ name: string; email: string } | null>(null);

    useEffect(() => {
        setUser(getUser());
    }, []);

    const handleSwitchBrand = () => {
        clearBrand();
        router.push('/brands');
    };

    const nav = [
        { href: '/dashboard', icon: <IconDashboard size={20} />, label: 'Dashboard' },
        { href: '/analytics', icon: <IconBarChart size={20} />, label: 'Analytics' },
        { href: '/inbox', icon: <IconInbox size={20} />, label: 'Inbox' },
        { href: '/create', icon: <IconPenSquare size={20} />, label: 'Create Post' },
        { href: '/assets', icon: <IconImage size={20} />, label: 'Media Assets' },
        { href: '/campaigns', icon: <IconTarget size={20} />, label: 'Campaigns' },
        { href: '/accounts', icon: <IconLink size={20} />, label: 'Accounts' },
    ];

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <span className="sidebar-logo-icon"><IconZap size={24} /></span>
                    <span className="sidebar-logo-text">SocialFlow</span>
                </div>
                <button className="sidebar-toggle" onClick={onToggle}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                    {collapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
                </button>
            </div>

            {selectedBrand && (
                <div className="sidebar-brand" onClick={handleSwitchBrand} title="Switch brand" style={{ cursor: 'pointer' }}>
                    <div className="sidebar-brand-avatar">
                        {selectedBrand.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="sidebar-brand-info">
                        <span className="sidebar-brand-name">{selectedBrand.name}</span>
                        <span className="sidebar-brand-switch">Switch brand →</span>
                    </div>
                </div>
            )}

            <nav className="sidebar-nav">
                {nav.map(item => (
                    <Link key={item.href} href={item.href}
                        className={`nav-item ${pathname === item.href ? 'active' : ''}`}
                        title={collapsed ? item.label : undefined}>
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </Link>
                ))}
            </nav>
            <div className="sidebar-footer">
                {user && (
                    <div className="user-info">
                        <div className="user-avatar">{user.name[0]?.toUpperCase()}</div>
                        <div>
                            <div className="user-name">{user.name}</div>
                            <div className="user-email">{user.email}</div>
                        </div>
                    </div>
                )}
                <button className="nav-item" onClick={logout} style={{ marginTop: 8 }}>
                    <span className="nav-icon"><IconLogOut size={18} /></span>
                    <span className="nav-label">Logout</span>
                </button>
            </div>
        </aside>
    );
}

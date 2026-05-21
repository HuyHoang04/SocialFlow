'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    IconDashboard, IconBarChart, IconInbox, IconPenSquare,
    IconImage, IconTarget, IconZap,
    IconChevronLeft, IconChevronRight, IconSettings,
    IconUsers, IconCheckCircle, IconGlobe
} from './Icons';

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
    mobileOpen?: boolean;
    onCloseMobile?: () => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen = false, onCloseMobile }: SidebarProps) {
    const pathname = usePathname();

    const nav = [
        { href: '/dashboard', icon: <IconDashboard size={20} />, label: 'Dashboard' },
        { href: '/analytics', icon: <IconBarChart size={20} />, label: 'Analytics' },
        { href: '/inbox', icon: <IconInbox size={20} />, label: 'Inbox' },
        { href: '/create', icon: <IconPenSquare size={20} />, label: 'Create Post' },
        { href: '/assets', icon: <IconImage size={20} />, label: 'Media Assets' },
        { href: '/campaigns', icon: <IconTarget size={20} />, label: 'Campaigns' },
        { href: '/ai-hub', icon: <IconZap size={20} />, label: 'AI Hub' },
        { href: '/team', icon: <IconUsers size={20} />, label: 'Team' },
        { href: '/approvals', icon: <IconCheckCircle size={20} />, label: 'Approvals' },
        { href: '/public-page', icon: <IconGlobe size={20} />, label: 'Public Page' },
        { href: '/settings', icon: <IconSettings size={20} />, label: 'Settings' },
    ];

    const isLinkActive = (href: string) => {
        return pathname === href;
    };

    return (
        <>
            {/* Backdrop overlay for mobile drawer */}
            <div 
                className={`sidebar-overlay ${mobileOpen ? 'active' : ''}`} 
                onClick={onCloseMobile}
            />

            <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <span className="sidebar-logo-icon">
                            <img
                                src="/logo.svg"
                                alt="SocialFlow"
                                style={{
                                    width: collapsed ? 48 : 140,
                                    height: 'auto',
                                    maxHeight: collapsed ? 32 : 60,
                                    transition: '0.3s',
                                    marginBottom: collapsed ? 0 : 8,
                                    objectFit: 'contain'
                                }}
                            />
                        </span>
                        <span className="sidebar-logo-text">SocialFlow</span>
                    </div>
                    <button className="sidebar-toggle" onClick={onToggle}
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                        {collapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {nav.map(item => {
                        const active = isLinkActive(item.href);
                        return (
                            <Link 
                                key={item.href} 
                                href={item.href}
                                className={`nav-item ${active ? 'active' : ''}`}
                                title={collapsed ? item.label : undefined}
                                onClick={onCloseMobile}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                <span className="nav-label">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </aside>
        </>
    );
}

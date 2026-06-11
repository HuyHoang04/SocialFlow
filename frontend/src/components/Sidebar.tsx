'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    IconDashboard, IconBarChart, IconInbox, IconPenSquare,
    IconImage, IconTarget, IconZap,
    IconChevronLeft, IconChevronRight, IconSettings,
    IconUsers, IconCheckCircle, IconGlobe, IconUser
} from './Icons';

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
    mobileOpen?: boolean;
    onCloseMobile?: () => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen = false, onCloseMobile }: SidebarProps) {
    const pathname = usePathname();

    const navGroups = [
        {
            title: 'Overview',
            items: [
                { href: '/dashboard', icon: <IconDashboard size={20} />, label: 'Dashboard' },
                { href: '/analytics', icon: <IconBarChart size={20} />, label: 'Analytics' },
                { href: '/inbox', icon: <IconInbox size={20} />, label: 'Inbox' },
            ]
        },
        {
            title: 'Content & AI',
            items: [
                { href: '/create', icon: <IconPenSquare size={20} />, label: 'Create Post' },
                { href: '/assets', icon: <IconImage size={20} />, label: 'Media Assets' },
                { href: '/ai-hub', icon: <IconZap size={20} />, label: 'AI Hub' },
            ]
        },
        {
            title: 'Management',
            items: [
                { href: '/campaigns', icon: <IconTarget size={20} />, label: 'Campaigns' },
                { href: '/approvals', icon: <IconCheckCircle size={20} />, label: 'Approvals' },
                { href: '/profile-manager', icon: <IconUser size={20} />, label: 'Page Profiles' },
                { href: '/public-page', icon: <IconGlobe size={20} />, label: 'Public Page' },
                { href: '/team', icon: <IconUsers size={20} />, label: 'Team' },
            ]
        },
        {
            title: 'Configuration',
            items: [
                { href: '/settings', icon: <IconSettings size={20} />, label: 'Settings' },
            ]
        }
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

            <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`} style={{ overflowY: 'auto' }}>
                <div className="sidebar-header" style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10, paddingTop: 24, paddingBottom: 20 }}>
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

                <nav className="sidebar-nav" style={{ paddingBottom: 24, paddingTop: 12 }}>
                    {navGroups.map((group, groupIdx) => (
                        <div key={groupIdx} style={{ marginBottom: collapsed ? 4 : 8 }}>
                            {!collapsed && (
                                <div style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    padding: '0 16px 8px',
                                    marginTop: groupIdx > 0 ? 4 : 0
                                }}>
                                    {group.title}
                                </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {group.items.map(item => {
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
                            </div>
                        </div>
                    ))}
                </nav>
            </aside>
        </>
    );
}

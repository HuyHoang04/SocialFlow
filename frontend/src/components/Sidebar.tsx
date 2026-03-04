'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { getUser, logout } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Sidebar() {
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
        { href: '/dashboard', icon: '📊', label: 'Dashboard' },
        { href: '/analytics', icon: '📈', label: 'Analytics' },
        { href: '/inbox', icon: '📥', label: 'Inbox' },
        { href: '/create', icon: '✏️', label: 'Create Post' },
        { href: '/assets', icon: '🖼️', label: 'Media Assets' },
        { href: '/campaigns', icon: '🎯', label: 'Campaigns' },
        { href: '/accounts', icon: '🔗', label: 'Accounts' },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">⚡ SocialFlow</div>

            {/* Brand indicator */}
            {selectedBrand && (
                <div className="sidebar-brand" onClick={handleSwitchBrand} title="Switch brand">
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
                        className={`nav-item ${pathname === item.href ? 'active' : ''}`}>
                        <span className="nav-icon">{item.icon}</span>
                        {item.label}
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
                    <span className="nav-icon">🚪</span> Logout
                </button>
            </div>
        </aside>
    );
}

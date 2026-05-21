'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, logout } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';
import { useTheme } from '@/context/ThemeContext';
import { IconMenu, IconSun, IconMoon, IconSettings, IconUsers, IconLogOut } from './Icons';

interface TopbarProps {
    collapsed: boolean;
    onToggleSidebar: () => void;
    onToggleMobileSidebar: () => void;
}

export default function Topbar({ collapsed, onToggleSidebar, onToggleMobileSidebar }: TopbarProps) {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const { selectedBrand, clearBrand } = useBrand();
    const [user, setUser] = useState<{ name: string; email: string } | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setUser(getUser());
    }, []);

    // Click outside handler for dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSwitchBrand = () => {
        clearBrand();
        router.push('/brands');
    };

    const handleDropdownItemClick = (href: string) => {
        setDropdownOpen(false);
        router.push(href);
    };

    const handleLogout = () => {
        setDropdownOpen(false);
        logout();
    };

    return (
        <header className="topbar">
            <div className="topbar-left">
                <button className="topbar-menu-btn" onClick={onToggleMobileSidebar} title="Open navigation">
                    <IconMenu size={20} />
                </button>
                {selectedBrand && (
                    <button className="topbar-brand-btn" onClick={handleSwitchBrand} title="Switch brand">
                        <div className="topbar-brand-avatar">
                            {selectedBrand.logoUrl ? (
                                <img src={selectedBrand.logoUrl} alt={selectedBrand.name} />
                            ) : (
                                selectedBrand.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                            )}
                        </div>
                        <span className="topbar-brand-name">{selectedBrand.name}</span>
                        <span className="topbar-brand-arrow">▼</span>
                    </button>
                )}
            </div>

            <div className="topbar-right">
                <button 
                    className="topbar-theme-btn" 
                    onClick={toggleTheme} 
                    title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
                </button>

                {user && (
                    <div style={{ position: 'relative' }} ref={dropdownRef}>
                        <button className="topbar-user-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
                            <div className="topbar-user-avatar">
                                {(user as any).avatarUrl ? (
                                    <img src={(user as any).avatarUrl} alt={user.name} />
                                ) : (
                                    user.name[0]?.toUpperCase()
                                )}
                            </div>
                            <span className="topbar-user-name">{user.name}</span>
                            <span className="topbar-user-chevron">▼</span>
                        </button>

                        {dropdownOpen && (
                            <div className="topbar-dropdown">
                                <div className="topbar-dropdown-header">
                                    <div className="topbar-dropdown-name">{user.name}</div>
                                    <div className="topbar-dropdown-email">{user.email}</div>
                                    <span className="topbar-dropdown-badge">Administrator</span>
                                </div>
                                <div className="topbar-dropdown-divider" />
                                <button className="topbar-dropdown-item" onClick={() => handleDropdownItemClick('/settings')}>
                                    <IconSettings size={16} />
                                    <span>Settings</span>
                                </button>
                                <button className="topbar-dropdown-item" onClick={() => handleDropdownItemClick('/team')}>
                                    <IconUsers size={16} />
                                    <span>Team Management</span>
                                </button>
                                <div className="topbar-dropdown-divider" />
                                <button className="topbar-dropdown-item danger" onClick={handleLogout}>
                                    <IconLogOut size={16} />
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}

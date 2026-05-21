'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import styles from './linktree.module.css';
import { PlatformIcon, IconGlobe, IconLink } from '@/components/Icons';
import { api } from '@/lib/api';

interface SocialLink {
    platform: string;
    accountName: string;
    pageName?: string;
    pageImageUrl?: string;
}

interface LinktreeData {
    id: string;
    slug: string;
    displayName: string;
    bio?: string;
    website?: string;
    websiteLabel?: string;
    logoUrl?: string;
    primaryColor?: string;
    bgStyle: string;
    bgImageUrl?: string;
    buttonStyle: string;
    socialLinks: SocialLink[];
    customLinks?: string;
}

const PLATFORM_LABELS: Record<string, string> = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    twitter: 'X (Twitter)',
    linkedin: 'LinkedIn',
    bluesky: 'Bluesky',
    threads: 'Threads',
};

const PLATFORM_URLS: Record<string, (name: string) => string> = {
    facebook: (n) => `https://facebook.com/${n}`,
    instagram: (n) => `https://instagram.com/${n}`,
    twitter: (n) => `https://twitter.com/${n}`,
    linkedin: (n) => `https://linkedin.com/company/${n}`,
    bluesky: (n) => `https://bsky.app/profile/${n}`,
    threads: (n) => `https://www.threads.net/@${n}`,
};

interface ProfileBlock {
    id: string;
    type: 'link' | 'header' | 'text' | 'image' | 'video';
    title?: string;
    url?: string;
    description?: string;
    imageUrl?: string;
    platform?: string;
    iconUrl?: string;
}

export default function LinktreePage() {
    const params = useParams();
    const slug = params?.slug as string;

    const [data, setData] = useState<LinktreeData | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!slug) return;
        api.getPublicLinktree(slug)
            .then(setData)
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [slug]);

    if (loading) {
        return (
            <div className={`${styles.page} ${styles['bg-gradient-night']}`}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, marginTop: 80 }}>Loading…</div>
            </div>
        );
    }

    if (notFound || !data) {
        return (
            <div className={styles.notPublished}>
                <div style={{ fontSize: 48, opacity: 0.3 }}>🔗</div>
                <div>This page doesn&apos;t exist or isn&apos;t published yet.</div>
            </div>
        );
    }

    // Build CSS class for background
    const bgClass = data.bgImageUrl
        ? styles['bg-image']
        : styles[`bg-${data.bgStyle}`] || styles['bg-gradient-purple'];

    const bgStyle = data.bgImageUrl
        ? { backgroundImage: `url('${data.bgImageUrl}')` }
        : undefined;

    // Parse custom links
    const customLinks: ProfileBlock[] = data.customLinks
        ? (() => {
            try {
                return JSON.parse(data.customLinks);
            } catch {
                return [];
            }
          })()
        : [];

    const initials = (data.displayName || '?')
        .split(' ')
        .slice(0, 2)
        .map((w: string) => w[0]?.toUpperCase() || '')
        .join('');

    const btnRadius = data.buttonStyle === 'pill'
        ? styles.buttonStylePill
        : data.buttonStyle === 'square'
            ? styles.buttonStyleSquare
            : styles.buttonStyleRounded;

    return (
        <>
            <title>{data.displayName} | SocialFlow</title>

            <div className={`${styles.page} ${bgClass}`} style={bgStyle}>
                <div className={styles.card}>
                    {/* Avatar */}
                    {data.logoUrl ? (
                        <img
                             src={data.logoUrl}
                             alt={data.displayName}
                             className={styles.avatar}
                        />
                    ) : (
                        <div
                            className={styles.avatarInitials}
                            style={data.primaryColor ? { background: `${data.primaryColor}99` } : {}}
                        >
                            {initials}
                        </div>
                    )}

                    {/* Name & bio */}
                    <h1 className={styles.name}>{data.displayName}</h1>
                    {data.bio && <p className={styles.bio}>{data.bio}</p>}

                    {/* Social buttons */}
                    <div className={styles.buttons}>
                        {data.socialLinks.map((link) => {
                            const label = link.pageName || PLATFORM_LABELS[link.platform] || link.accountName;
                            const href = PLATFORM_URLS[link.platform]?.(link.accountName) || '#';
                            return (
                                <a
                                    key={link.platform}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`${styles.button} ${btnRadius} ${styles[`platform-${link.platform}`] || ''}`}
                                >
                                    <span className={styles.buttonIcon}>
                                        <PlatformIcon platform={link.platform} size={20} color="white" />
                                    </span>
                                    {label}
                                </a>
                            );
                        })}

                        {/* Custom Blocks */}
                        {customLinks.map((block) => {
                            switch (block.type) {
                                case 'header':
                                    return (
                                        <div key={block.id} className={styles.blockHeader}>
                                            {block.title}
                                        </div>
                                    );
                                case 'text':
                                    return (
                                        <div key={block.id} className={styles.blockText}>
                                            {block.description}
                                        </div>
                                    );
                                case 'image':
                                    const imageContent = (
                                        <div className={styles.blockImageContainer}>
                                            <img
                                                src={block.imageUrl}
                                                alt={block.title || ''}
                                                className={styles.blockImage}
                                            />
                                            {block.title && (
                                                <div className={styles.blockImageOverlay}>
                                                    {block.title}
                                                </div>
                                            )}
                                        </div>
                                    );
                                    if (block.url) {
                                        return (
                                            <a
                                                key={block.id}
                                                href={block.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ width: '100%', textDecoration: 'none' }}
                                            >
                                                {imageContent}
                                            </a>
                                        );
                                    }
                                    return (
                                        <div key={block.id} style={{ width: '100%' }}>
                                            {imageContent}
                                        </div>
                                    );
                                case 'video':
                                    const getYouTubeId = (url?: string) => {
                                        if (!url) return null;
                                        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                                        const match = url.match(regExp);
                                        return (match && match[2].length === 11) ? match[2] : null;
                                    };
                                    const ytId = getYouTubeId(block.url);
                                    if (!ytId) return null;
                                    return (
                                        <div key={block.id} className={styles.videoWrapper}>
                                            <iframe
                                                src={`https://www.youtube.com/embed/${ytId}`}
                                                title="YouTube video player"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                allowFullScreen
                                                className={styles.videoIframe}
                                            />
                                        </div>
                                    );
                                case 'link':
                                default:
                                    const platformKey = block.platform || 'custom';
                                    const hasCustomIcon = !!block.iconUrl;
                                    return (
                                        <a
                                            key={block.id}
                                            href={block.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`${styles.button} ${btnRadius} ${styles[`platform-${platformKey}`] || ''}`}
                                        >
                                            {platformKey !== 'none' && (
                                                <span className={styles.buttonIcon}>
                                                    {hasCustomIcon ? (
                                                        <img 
                                                            src={block.iconUrl} 
                                                            alt="" 
                                                            className={styles.customIconImage} 
                                                        />
                                                    ) : (
                                                        <PlatformIcon platform={platformKey} size={20} color="white" />
                                                    )}
                                                </span>
                                            )}
                                            {block.title}
                                        </a>
                                    );
                            }
                        })}

                        {/* Website link */}
                        {data.website && (
                            <a
                                href={data.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${styles.button} ${btnRadius} ${styles['platform-website']}`}
                            >
                                <span className={styles.buttonIcon}>
                                    <IconGlobe size={20} color="white" />
                                </span>
                                {data.websiteLabel || 'Visit our website'}
                            </a>
                        )}
                    </div>

                    {/* Subtle footer */}
                    <div className={styles.footer}>
                        Made with <a href="/" title="SocialFlow">SocialFlow</a>
                    </div>
                </div>
            </div>
        </>
    );
}

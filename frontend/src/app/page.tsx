'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getUser } from '@/lib/api';
import {
    IconZap, IconRocket, IconPenSquare, IconCalendar, IconBarChart,
    IconInbox, IconLayers, IconTarget, IconImage, IconShield,
    IconFacebook, IconTwitter, IconLinkedin, IconBluesky, IconThreads,
    IconSparkles, IconLink,
} from '@/components/Icons';

export default function LandingPage() {
    const [loggedIn, setLoggedIn] = useState(false);

    useEffect(() => {
        setLoggedIn(!!getUser());
    }, []);

    return (
        <div className="landing">
            {/* Video motion background */}
            <div className="landing-bg">
                <video
                    className="landing-video-bg"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                >
                    <source src="/motion.mp4" type="video/mp4" />
                </video>
                <div className="landing-video-overlay" />
                <div className="landing-grid-overlay" />
            </div>

            {/* Navigation */}
            <header className="landing-nav">
                <div className="landing-nav-inner">
                    <div className="landing-logo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="sidebar-logo-icon">
                            <img
                                src="/logo.svg"
                                alt="SocialFlow"
                                style={{
                                    width: 140,
                                    height: 'auto',
                                    maxHeight: 60,
                                    objectFit: 'contain'
                                }}
                            />
                        </span>
                        <span style={{ color: 'var(--text-primary)', fontSize: '2rem', marginLeft: '10px' }}>SocialFlow</span>
                    </div>
                    <div className="landing-nav-links">
                        <a href="#features" className="landing-link">Features</a>
                        <a href="#platforms" className="landing-link">Platforms</a>
                        <a href="#workflow" className="landing-link">Workflow</a>
                        {loggedIn ? (
                            <Link href="/brands" className="btn btn-primary">Go to Dashboard →</Link>
                        ) : (
                            <>
                                <Link href="/login" className="btn btn-ghost landing-nav-btn">Login</Link>
                                <Link href="/register" className="btn btn-primary landing-nav-btn">Register</Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="landing-hero">
                <div className="landing-badge"><IconRocket size={16} /> Social Media Management Platform</div>
                <h1 className="landing-hero-title">
                    Manage All Your<br />
                    <span className="landing-gradient-text">Social Media</span><br />
                    In One Place
                </h1>
                <p className="landing-hero-subtitle">
                    Write once, publish everywhere. Schedule posts, track analytics, engage with your
                    audience — all from a single, beautiful dashboard.
                </p>
                <div className="landing-hero-actions">
                    {loggedIn ? (
                        <Link href="/brands" className="btn btn-primary btn-lg landing-hero-btn">
                            Open Dashboard →
                        </Link>
                    ) : (
                        <>
                            <Link href="/register" className="btn btn-primary btn-lg landing-hero-btn">
                                Start Free Today
                            </Link>
                            <Link href="/login" className="btn btn-secondary btn-lg landing-hero-btn">
                                Sign In
                            </Link>
                        </>
                    )}
                </div>

                {/* Stats */}
                <div className="landing-stats">
                    <div className="landing-stat">
                        <span className="landing-stat-value">5+</span>
                        <span className="landing-stat-label">Platforms</span>
                    </div>
                    <div className="landing-stat-divider" />
                    <div className="landing-stat">
                        <span className="landing-stat-value">∞</span>
                        <span className="landing-stat-label">Posts</span>
                    </div>
                    <div className="landing-stat-divider" />
                    <div className="landing-stat">
                        <span className="landing-stat-value">24/7</span>
                        <span className="landing-stat-label">Scheduling</span>
                    </div>
                    <div className="landing-stat-divider" />
                    <div className="landing-stat">
                        <span className="landing-stat-value">Free</span>
                        <span className="landing-stat-label">To Start</span>
                    </div>
                </div>
            </section>

            {/* Platforms Section */}
            <section className="landing-section" id="platforms">
                <div className="landing-section-inner">
                    <div className="landing-section-badge"><IconLink size={16} /> Integrations</div>
                    <h2 className="landing-section-title">Connect Your Favorite Platforms</h2>
                    <p className="landing-section-subtitle">
                        Publish to all major social networks with a single click
                    </p>
                    <div className="landing-platforms-grid">
                        {[
                            { name: 'Facebook', icon: <IconFacebook size={24} />, color: '#1877f2', desc: 'Pages, posts, photos & engagement' },
                            { name: 'X / Twitter', icon: <IconTwitter size={24} />, color: '#1d9bf0', desc: 'Tweets, threads & replies' },
                            { name: 'LinkedIn', icon: <IconLinkedin size={24} />, color: '#0a66c2', desc: 'Professional content & company pages' },
                            { name: 'Bluesky', icon: <IconBluesky size={24} />, color: '#0085ff', desc: 'Decentralized social posting' },
                            { name: 'Threads', icon: <IconThreads size={24} />, color: '#555', desc: 'Meta Threads text posts' },
                            { name: 'More Coming', icon: <IconRocket size={24} />, color: 'var(--accent)', desc: 'TikTok, YouTube & more soon' },
                        ].map(p => (
                            <div key={p.name} className="landing-platform-card">
                                <div className="landing-platform-icon" style={{ background: p.color }}>
                                    {p.icon}
                                </div>
                                <h3 className="landing-platform-name">{p.name}</h3>
                                <p className="landing-platform-desc">{p.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="landing-section landing-section-alt" id="features">
                <div className="landing-section-inner">
                    <div className="landing-section-badge"><IconSparkles size={16} /> Features</div>
                    <h2 className="landing-section-title">Everything You Need</h2>
                    <p className="landing-section-subtitle">
                        Powerful tools to streamline your social media workflow
                    </p>
                    <div className="landing-features-grid">
                        {[
                            {
                                icon: <IconPenSquare size={28} />,
                                title: 'Multi-Platform Publishing',
                                desc: 'Write one post and publish it to Facebook, Twitter, LinkedIn, Bluesky and Threads simultaneously.',
                            },
                            {
                                icon: <IconCalendar size={28} />,
                                title: 'Smart Scheduling',
                                desc: 'Schedule posts for the perfect time. Set it and forget it — SocialFlow handles the rest.',
                            },
                            {
                                icon: <IconBarChart size={28} />,
                                title: 'Analytics & Insights',
                                desc: 'Track likes, comments, shares, reach and engagement rates across all your platforms.',
                            },
                            {
                                icon: <IconInbox size={28} />,
                                title: 'Unified Inbox',
                                desc: 'Reply to comments and messages from all platforms in one place. Never miss an engagement.',
                            },
                            {
                                icon: <IconLayers size={28} />,
                                title: 'Multi-Brand Support',
                                desc: 'Manage multiple brands with separate social accounts, content and analytics for each.',
                            },
                            {
                                icon: <IconTarget size={28} />,
                                title: 'Campaign Management',
                                desc: 'Group related posts into campaigns. Track performance and stay organized.',
                            },
                            {
                                icon: <IconImage size={28} />,
                                title: 'Media Library',
                                desc: 'Upload and manage images and videos. Attach media to posts with drag and drop.',
                            },
                            {
                                icon: <IconShield size={28} />,
                                title: 'Secure & Private',
                                desc: 'OAuth 2.0 authentication with token management. Your data stays yours.',
                            },
                        ].map(f => (
                            <div key={f.title} className="landing-feature-card">
                                <div className="landing-feature-icon">{f.icon}</div>
                                <h3 className="landing-feature-title">{f.title}</h3>
                                <p className="landing-feature-desc">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Workflow Section */}
            <section className="landing-section" id="workflow">
                <div className="landing-section-inner">
                    <div className="landing-section-badge"><IconZap size={16} /> Simple Workflow</div>
                    <h2 className="landing-section-title">How It Works</h2>
                    <p className="landing-section-subtitle">
                        Get started in 3 simple steps
                    </p>
                    <div className="landing-steps">
                        {[
                            { step: '01', title: 'Create Your Brand', desc: 'Set up your brand and connect your social media accounts in seconds.' },
                            { step: '02', title: 'Write & Schedule', desc: 'Create content once and choose which platforms to publish to. Schedule or post immediately.' },
                            { step: '03', title: 'Engage & Analyze', desc: 'Monitor engagement from your unified inbox and track performance with real-time analytics.' },
                        ].map(s => (
                            <div key={s.step} className="landing-step">
                                <div className="landing-step-number">{s.step}</div>
                                <h3 className="landing-step-title">{s.title}</h3>
                                <p className="landing-step-desc">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="landing-cta">
                <div className="landing-cta-inner">
                    <h2 className="landing-cta-title">
                        Ready to Streamline Your<br />
                        <span className="landing-gradient-text">Social Media?</span>
                    </h2>
                    <p className="landing-cta-subtitle">
                        Join SocialFlow today and take control of your social media presence.
                    </p>
                    {loggedIn ? (
                        <Link href="/brands" className="btn btn-primary btn-lg landing-hero-btn">
                            Go to Dashboard →
                        </Link>
                    ) : (
                        <Link href="/register" className="btn btn-primary btn-lg landing-hero-btn">
                            Get Started Free →
                        </Link>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="landing-footer-inner">
                    <div className="landing-footer-brand">
                        <span className="landing-logo" style={{ fontSize: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <IconZap size={18} color="var(--accent)" /> SocialFlow
                        </span>
                        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
                            Social media management,<br />simplified.
                        </p>
                    </div>
                    <div className="landing-footer-links">
                        <div>
                            <h4 className="landing-footer-heading">Product</h4>
                            <a href="#features" className="landing-footer-link">Features</a>
                            <a href="#platforms" className="landing-footer-link">Platforms</a>
                            <a href="#workflow" className="landing-footer-link">How It Works</a>
                        </div>
                        <div>
                            <h4 className="landing-footer-heading">Account</h4>
                            <Link href="/login" className="landing-footer-link">Sign In</Link>
                            <Link href="/register" className="landing-footer-link">Register</Link>
                        </div>
                    </div>
                </div>
                <div className="landing-footer-bottom">
                    © 2026 SocialFlow. All rights reserved.
                </div>
            </footer>
        </div>
    );
}

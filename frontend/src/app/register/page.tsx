'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, setToken, setUser } from '@/lib/api';
import { IconZap } from '@/components/Icons';

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await api.register({ name, email, password });
            setToken(res.token);
            setUser({ email: res.email, name: res.name, userId: res.userId, avatarUrl: res.avatarUrl });
            router.push('/brands');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1 className="auth-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
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
                </h1>
                <p className="auth-subtitle">Create your account and start publishing</p>
                {error && <div className="error-msg">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Name</label>
                        <input type="text" className="form-input" value={name}
                            onChange={e => setName(e.target.value)} required placeholder="Your name" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input type="email" className="form-input" value={email}
                            onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input type="password" className="form-input" value={password}
                            onChange={e => setPassword(e.target.value)} required minLength={6}
                            placeholder="Minimum 6 characters" />
                    </div>
                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}
                        disabled={loading}>
                        {loading ? 'Creating...' : 'Create Account'}
                    </button>
                </form>
                <p className="auth-link">
                    Already have an account? <Link href="/login">Sign in</Link>
                </p>
            </div>
        </div>
    );
}

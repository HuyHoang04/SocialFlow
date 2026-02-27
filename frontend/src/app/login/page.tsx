'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, setToken, setUser } from '@/lib/api';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await api.login({ email, password });
            setToken(res.token);
            setUser({ email: res.email, name: res.name, userId: res.userId });
            router.push('/');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1 className="auth-title">⚡ SocialFlow</h1>
                <p className="auth-subtitle">Sign in to manage your social presence</p>
                {error && <div className="error-msg">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input type="email" className="form-input" value={email}
                            onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input type="password" className="form-input" value={password}
                            onChange={e => setPassword(e.target.value)} required placeholder="••••••" />
                    </div>
                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}
                        disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
                <p className="auth-link">
                    Don&apos;t have an account? <Link href="/register">Create one</Link>
                </p>
            </div>
        </div>
    );
}

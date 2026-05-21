'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getUser, isTokenExpired, api, logout, setToken } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';

interface InvitationDetails {
    id: string;
    email: string;
    brandName: string;
    brandId: string;
    role: 'ADMIN' | 'MANAGER' | 'CREATOR';
    expiresAt: string;
    createdAt: string;
    accepted: boolean;
    acceptedAt?: string;
}

function JoinPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const { reloadBrands } = useBrand();

    const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<{ email: string; name: string; userId: string } | null>(null);
    const [accepting, setAccepting] = useState(false);
    const [accepted, setAccepted] = useState(false);

    useEffect(() => {
        // For join page, we don't require authentication to view invitation
        // But we do require it to accept
        const u = getUser();
        if (u) {
            if (isTokenExpired()) {
                logout();
                return;
            }
            setUser(u);
        }

        // Load invitation details
        if (token) {
            loadInvitation();
        }
    }, [token]);

    const loadInvitation = useCallback(async () => {
        if (!token) {
            setError('No invitation token provided');
            setLoading(false);
            return;
        }

        try {
            const inv = await api.getInvitationByToken(token);
            setInvitation(inv);
        } catch (err: any) {
            setError(err?.message || 'Failed to load invitation');
        }
        setLoading(false);
    }, [token]);

    const handleAccept = async () => {
        if (!user) {
            router.push('/login?redirect=/join?token=' + token);
            return;
        }

        setError(null);
        setAccepting(true);

        try {
            const response = await api.acceptInvitation(token!);
            
            // Store the new JWT token with updated brand roles
            if (response.token) {
                setToken(response.token);
            }
            
            setAccepted(true);
            
            // Reload brands list so the new brand appears in the selector
            await reloadBrands();
            
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                router.push('/dashboard');
            }, 2000);
        } catch (err: any) {
            setError(err?.message || 'Failed to accept invitation');
            setAccepting(false);
        }
    };

    const isInvitationValid = invitation && !invitation.accepted && new Date(invitation.expiresAt) > new Date();
    const emailMatches = user && invitation && user.email === invitation.email;

    return (
        <div className="join-page">
            <div className="join-container">
                <div className="join-card">
                    {/* Loading State */}
                    {loading && (
                        <div className="join-content">
                            <div className="loading">Loading invitation...</div>
                        </div>
                    )}

                    {/* Error State */}
                    {!loading && error && (
                        <div className="join-content">
                            <div className="error-icon">⚠️</div>
                            <h2>Invitation Error</h2>
                            <p className="error-message">{error}</p>
                            <button className="btn-primary" onClick={() => router.push('/')}>
                                Back to Home
                            </button>
                        </div>
                    )}

                    {/* Expired State */}
                    {!loading && !error && invitation && new Date(invitation.expiresAt) <= new Date() && (
                        <div className="join-content">
                            <div className="error-icon">⏰</div>
                            <h2>Invitation Expired</h2>
                            <p>This invitation expired on {formatDate(invitation.expiresAt)}</p>
                            <p className="text-muted">Please ask the brand admin to send you a new invitation</p>
                            <button className="btn-primary" onClick={() => router.push('/')}>
                                Back to Home
                            </button>
                        </div>
                    )}

                    {/* Already Accepted State */}
                    {!loading && !error && invitation && invitation.accepted && (
                        <div className="join-content">
                            <div className="success-icon">✓</div>
                            <h2>Already Accepted</h2>
                            <p>You have already accepted this invitation</p>
                            <p className="text-muted">Accepted on {formatDate(invitation.acceptedAt!)}</p>
                            <button className="btn-primary" onClick={() => router.push('/dashboard')}>
                                Go to Dashboard
                            </button>
                        </div>
                    )}

                    {/* Valid Invitation - Not Logged In */}
                    {!loading && !error && isInvitationValid && !user && (
                        <div className="join-content">
                            <div className="brand-icon">{invitation!.brandName.charAt(0).toUpperCase()}</div>
                            <h2>{invitation!.brandName}</h2>
                            <p className="text-muted">invites you to join as</p>
                            <div className="role-badge" style={{ margin: '20px 0' }}>
                                {invitation!.role}
                            </div>
                            <p>To accept, please log in or create an account</p>
                            <div className="button-group">
                                <button
                                    className="btn-primary"
                                    onClick={() => router.push('/login?redirect=/join?token=' + token)}
                                >
                                    Log In
                                </button>
                                <button
                                    className="btn-secondary"
                                    onClick={() => router.push('/register?redirect=/join?token=' + token)}
                                >
                                    Sign Up
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Valid Invitation - Logged In - Email Matches */}
                    {!loading && !error && isInvitationValid && user && emailMatches && (
                        <div className="join-content">
                            <div className="success-icon">👋</div>
                            <h2>Welcome to {invitation!.brandName}</h2>
                            <p>You're invited to join as</p>
                            <div className="role-badge" style={{ margin: '20px 0' }}>
                                {invitation!.role}
                            </div>
                            <p className="text-muted">Logged in as {user.email}</p>
                            {accepted ? (
                                <div className="success-content">
                                    <p style={{ color: 'var(--success)', marginBottom: '20px' }}>
                                        ✓ Successfully accepted the invitation!
                                    </p>
                                    <p className="text-muted">Redirecting to dashboard...</p>
                                </div>
                            ) : (
                                <button
                                    className="btn-primary"
                                    onClick={handleAccept}
                                    disabled={accepting}
                                    style={{ marginTop: '20px' }}
                                >
                                    {accepting ? 'Accepting...' : 'Accept Invitation'}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Valid Invitation - Logged In - Email Mismatch */}
                    {!loading && !error && isInvitationValid && user && !emailMatches && (
                        <div className="join-content">
                            <div className="error-icon">✗</div>
                            <h2>Email Mismatch</h2>
                            <p>This invitation was sent to: <strong>{invitation!.email}</strong></p>
                            <p className="text-muted">But you're logged in as: <strong>{user.email}</strong></p>
                            <p style={{ marginTop: '20px' }}>Please log out and log back in with the correct email address</p>
                            <button
                                className="btn-primary"
                                onClick={() => {
                                    logout();
                                }}
                                style={{ marginTop: '20px' }}
                            >
                                Log Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function JoinPage() {
    return (
        <Suspense fallback={
            <div className="join-page">
                <div className="join-container">
                    <div className="join-card">
                        <div className="join-content">
                            <div className="loading" style={{ textAlign: 'center', padding: '40px 0' }}>Loading invitation...</div>
                        </div>
                    </div>
                </div>
            </div>
        }>
            <JoinPageContent />
        </Suspense>
    );
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

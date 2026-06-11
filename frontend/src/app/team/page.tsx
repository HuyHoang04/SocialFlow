'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, isTokenExpired, api, logout, canManageBrand } from '@/lib/api';
import { useBrand } from '@/lib/brand-context';
import AppShell from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { IconUsers } from '@/components/Icons';

interface TeamMember {
    userId: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'MANAGER' | 'CREATOR';
    joinedAt: string;
    isAdmin: boolean;
}

interface WorkflowConfig {
    enabled: boolean;
    approvalLevels: number;
}

export default function TeamPage() {
    const router = useRouter();
    const { selectedBrand } = useBrand();
    const { toast } = useToast();
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [user, setUser] = useState<{ email: string; name: string; userId: string } | null>(null);
    
    // Workflow config state
    const [workflowConfig, setWorkflowConfig] = useState<WorkflowConfig>({ enabled: false, approvalLevels: 1 });
    const [savingWorkflow, setSavingWorkflow] = useState(false);
    const [workflowMessage, setWorkflowMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    
    // Invitation form state
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'CREATOR' | 'MANAGER'>('CREATOR');
    const [inviting, setInviting] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

    // Invitation link modal state
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [invitationLink, setInvitationLink] = useState<string | null>(null);
    const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Role update state
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [newRole, setNewRole] = useState<'MANAGER' | 'CREATOR'>('CREATOR');
    const [updating, setUpdating] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);

    // Delete state
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

    const loadTeam = useCallback(async () => {
        if (!selectedBrand) return;
        
        try {
            const members = await api.getTeamMembers(selectedBrand.id);
            setTeamMembers(members);
            
            // Load workflow config
            try {
                const config = await api.getWorkflowConfig(selectedBrand.id);
                setWorkflowConfig(config);
            } catch (err: any) {
                console.warn('Failed to load workflow config:', err);
                setWorkflowConfig({ enabled: false, approvalLevels: 1 });
            }
        } catch (err: any) {
            if (err?.message !== 'Unauthorized') {
                toast('Operation failed', 'error', err?.message || 'Failed to load team members')
            }
        }
        setLoading(false);
    }, [selectedBrand]);

    useEffect(() => {
        const u = getUser();
        if (!u) { router.replace('/login'); return; }
        if (isTokenExpired()) { logout(); return; }
        if (!selectedBrand) { router.replace('/brands'); return; }
        
        setUser(u);
        loadTeam();
    }, [loadTeam, router, selectedBrand]);

    const handleInvite = async () => {
        if (!inviteEmail.trim()) return;
        setInviteError(null);
        setInviting(true);

        try {
            const response: any = await api.createInvitation(selectedBrand!.id, inviteEmail.trim(), inviteRole);
            
            // Show link modal
            setInvitationLink(response.invitationLink);
            setInvitedEmail(inviteEmail);
            setShowLinkModal(true);
            
            // Reset form
            setInviteEmail('');
            setInviteRole('CREATOR');
            setShowInviteForm(false);
            setCopied(false);
            
            // Refresh team list
            await loadTeam();
        } catch (err: any) {
            setInviteError(err?.message || 'Failed to send invitation');
        }
        setInviting(false);
    };

    const handleUpdateRole = async (userId: string) => {
        if (!user?.userId || !selectedBrand) return;
        const member = teamMembers.find(m => m.userId === userId);
        if (!member) return;

        setUpdateError(null);
        setUpdating(true);

        try {
            await api.updateTeamMemberRole(selectedBrand.id, userId, newRole);
            setEditingUserId(null);
            await loadTeam();
        } catch (err: any) {
            setUpdateError(err?.message || 'Failed to update role');
        }
        setUpdating(false);
    };

    const handleRemoveMember = async (userId: string) => {
        if (!user?.userId || !selectedBrand) return;
        if (userId === user.userId) {
            toast('You cannot remove yourself from the team', 'error');
            return;
        }
        if (!confirm('Remove this team member?')) return;

        setDeletingUserId(userId);
        try {
            await api.removeTeamMember(selectedBrand.id, userId);
            await loadTeam();
        } catch (err: any) {
            toast(err?.message || 'Failed to remove team member', 'error');
        }
        setDeletingUserId(null);
    };

    const handleCopyLink = () => {
        if (invitationLink) {
            navigator.clipboard.writeText(invitationLink).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };

    const handleSaveWorkflow = async () => {
        if (!selectedBrand) return;

        setSavingWorkflow(true);
        setWorkflowMessage(null);
        try {
            await api.updateWorkflowConfig(selectedBrand.id, workflowConfig.enabled, 1);
            setWorkflowMessage({ type: 'success', text: 'Approval workflow settings updated! ✨' });
            setTimeout(() => setWorkflowMessage(null), 3000);
        } catch (err: any) {
            setWorkflowMessage({ type: 'error', text: err.message || 'Failed to update workflow config' });
        } finally {
            setSavingWorkflow(false);
        }
    };

    const isCurrentUserAdmin = teamMembers.some(m => m.userId === user?.userId && m.role === 'ADMIN');
    const isCurrentUserManager = teamMembers.some(m => m.userId === user?.userId && m.role === 'MANAGER');
    const currentUserRole = teamMembers.find(m => m.userId === user?.userId)?.role;

    // Check permission from JWT token (faster than API response)
    const canManageFromToken = selectedBrand ? canManageBrand(selectedBrand.id) : false;
    const canManageTeam = (canManageFromToken || isCurrentUserAdmin || isCurrentUserManager) && currentUserRole !== 'CREATOR';
    const canEditAllRoles = isCurrentUserAdmin || canManageFromToken;
    const canEditCreatorOnly = isCurrentUserManager && !canManageFromToken;

    const canEditMember = (memberId: string, memberRole: string) => {
        if (memberId === user?.userId) return false;
        if (canEditAllRoles && memberRole !== 'ADMIN') return true;
        if (canEditCreatorOnly && memberRole === 'CREATOR') return true;
        return false;
    };

    const canRemoveMember = (memberId: string, memberRole: string) => {
        return canEditMember(memberId, memberRole);
    };

    return (
        <AppShell>
            <div style={{ width: '100%', padding: '0 40px', animation: 'fadeIn 0.5s ease-out' }}>
                {/* Header */}
                <div style={{ marginBottom: 32 }}>
                    <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, marginBottom: 8 }}>Team Management</h1>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>{selectedBrand?.name}</p>
                </div>

                {/* Error/Success Messages */}
                
                {loading && <div className="loading" style={{ marginBottom: 20 }}>Loading team members...</div>}

                {/* Workflow Config Card */}
                {canManageTeam && !loading && (
                    <div className="card" style={{ marginBottom: 32 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                            <div>
                                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px 0' }}>Approval Workflow</h3>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Control how posts are reviewed before publishing</p>
                            </div>
                        </div>

                        {workflowMessage && (
                            <div style={{
                                padding: '12px 16px',
                                borderRadius: 'var(--radius-sm)',
                                marginBottom: 16,
                                background: workflowMessage.type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)',
                                color: workflowMessage.type === 'success' ? 'var(--success)' : 'var(--error)',
                                fontSize: 13,
                                display: 'flex', alignItems: 'center', gap: 8
                            }}>
                                <span>{workflowMessage.type === 'success' ? '✅' : '❌'}</span>
                                {workflowMessage.text}
                            </div>
                        )}

                        <div style={{
                            padding: 16, borderRadius: 'var(--radius)',
                            background: 'var(--bg-glass-strong)',
                            border: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            marginBottom: 16
                        }}>
                            <div>
                                <p style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 500 }}>
                                    Require post approval before publishing
                                </p>
                                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                                    When enabled, creators must submit posts for approval
                                </p>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0 }}>
                                <input
                                    type="checkbox"
                                    checked={workflowConfig.enabled}
                                    onChange={(e) => setWorkflowConfig({ ...workflowConfig, enabled: e.target.checked })}
                                    style={{ cursor: 'pointer', width: 20, height: 20 }}
                                />
                            </label>
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={handleSaveWorkflow}
                            disabled={savingWorkflow}
                            style={{ width: '100%' }}
                        >
                            {savingWorkflow ? 'Saving...' : 'Save Workflow Settings'}
                        </button>
                    </div>
                )}

                {/* Invite Form Card - Always Visible */}
                {canManageTeam && (
                    <div className="card" style={{ marginBottom: 32 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Invite Team Member</h3>
                        {inviteError && <div className="error-message" style={{ marginBottom: 16 }}>{inviteError}</div>}
                        {inviteSuccess && <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: 13 }}>{inviteSuccess}</div>}
                        
                        <div style={{ marginBottom: 20 }}>
                            <div className="form-group">
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>Email Address</label>
                                <input
                                    type="email"
                                    placeholder="member@example.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    disabled={inviting}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'var(--bg-glass)',
                                        color: 'var(--text-primary)',
                                        fontSize: 13,
                                        transition: 'var(--transition)',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                            <div className="form-group" style={{ marginTop: 12 }}>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>Role</label>
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value as 'CREATOR' | 'MANAGER')}
                                    disabled={inviting}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'var(--bg-glass)',
                                        color: 'var(--text-primary)',
                                        fontSize: 13,
                                        cursor: 'pointer',
                                        outline: 'none',
                                        appearance: 'none',
                                        WebkitAppearance: 'none',
                                        MozAppearance: 'none',
                                        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23B8C4A9' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 4px center',
                                        backgroundSize: '16px',
                                        paddingRight: '24px'
                                    }}
                                >
                                    <option value="CREATOR">Creator - Can create posts</option>
                                    {canEditAllRoles && <option value="MANAGER">Manager - Can manage team & approve posts</option>}
                                </select>
                            </div>
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={handleInvite}
                            disabled={inviting || !inviteEmail.trim()}
                        >
                            {inviting ? 'Sending...' : 'Send Invitation'}
                        </button>
                    </div>
                )}

                {/* Team Members List */}
                {!loading && teamMembers.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 60, marginBottom: 32 }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, opacity: 0.3 }}>
                            <IconUsers size={48} />
                        </div>
                        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No team members yet</p>
                        {canManageTeam && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Invite your first team member to get started</p>}
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 32 }}>
                        {teamMembers.map((member) => (
                            <div key={member.userId} className="card" style={{ padding: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
                                        <div style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontWeight: 700,
                                            fontSize: 18,
                                            flexShrink: 0
                                        }}>
                                            {member.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{member.name}</span>
                                                {member.userId === user?.userId && <span style={{ fontSize: 11, padding: '2px 8px', background: 'var(--accent-glow)', color: 'var(--accent)', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>You</span>}
                                            </div>
                                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>{member.email}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Joined {formatDate(member.joinedAt)}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {editingUserId === member.userId ? (
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                <select
                                                    value={newRole}
                                                    onChange={(e) => setNewRole(e.target.value as 'MANAGER' | 'CREATOR')}
                                                    disabled={updating}
                                                    style={{
                                                        padding: '6px 10px 6px 10px',
                                                        border: '1px solid var(--border)',
                                                        borderRadius: 'var(--radius-sm)',
                                                        background: 'var(--bg-glass)',
                                                        color: 'var(--text-primary)',
                                                        fontSize: 12,
                                                        cursor: 'pointer',
                                                        outline: 'none',
                                                        appearance: 'none',
                                                        WebkitAppearance: 'none',
                                                        MozAppearance: 'none',
                                                        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23B8C4A9' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                                                        backgroundRepeat: 'no-repeat',
                                                        backgroundPosition: 'right 4px center',
                                                        backgroundSize: '16px',
                                                        paddingRight: '24px'
                                                    }}
                                                >
                                                    <option value="CREATOR">Creator</option>
                                                    {canEditAllRoles && <option value="MANAGER">Manager</option>}
                                                    {canEditAllRoles && <option value="ADMIN">Admin</option>}
                                                </select>
                                                <button
                                                    className="btn btn-sm"
                                                    style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--border)' }}
                                                    onClick={() => handleUpdateRole(member.userId)}
                                                    disabled={updating}
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    className="btn btn-sm"
                                                    onClick={() => setEditingUserId(null)}
                                                    disabled={updating}
                                                    style={{ background: 'var(--bg-glass)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                <span style={{
                                                    fontSize: 11,
                                                    padding: '4px 10px',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontWeight: 600,
                                                    background: member.role === 'ADMIN' ? 'rgba(230, 103, 103, 0.1)' : member.role === 'MANAGER' ? 'rgba(217, 125, 85, 0.1)' : 'rgba(184, 196, 169, 0.1)',
                                                    color: member.role === 'ADMIN' ? 'var(--error)' : member.role === 'MANAGER' ? 'var(--accent)' : 'var(--success)'
                                                }}>
                                                    {member.role}
                                                </span>
                                                {canEditMember(member.userId, member.role) && (
                                                    <button
                                                        className="btn btn-sm"
                                                        style={{ background: 'var(--bg-glass)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                                                        onClick={() => {
                                                            setEditingUserId(member.userId);
                                                            setNewRole(member.role === 'ADMIN' ? 'MANAGER' : member.role as 'MANAGER' | 'CREATOR');
                                                        }}
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                                {canRemoveMember(member.userId, member.role) && (
                                                    <button
                                                        className="btn btn-sm btn-danger"
                                                        onClick={() => handleRemoveMember(member.userId)}
                                                        disabled={deletingUserId === member.userId}
                                                    >
                                                        {deletingUserId === member.userId ? 'Removing...' : 'Remove'}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {updateError && editingUserId === member.userId && (
                                    <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                                        {updateError}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Invitation Link Modal */}
                {showLinkModal && invitationLink && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}>
                        <div className="card" style={{
                            width: '100%',
                            maxWidth: 500,
                            padding: 32,
                            margin: '0 20px'
                        }}>
                            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 16px 0' }}>Invitation Link Created ✨</h2>
                            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
                                Share this link with <strong>{invitedEmail}</strong> to invite them to the team:
                            </p>

                            <div style={{
                                background: 'var(--bg-glass)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '12px 16px',
                                marginBottom: 20,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                wordBreak: 'break-all'
                            }}>
                                <code style={{
                                    fontSize: 12,
                                    color: 'var(--text-muted)',
                                    flex: 1,
                                    fontFamily: 'monospace'
                                }}>
                                    {invitationLink}
                                </code>
                            </div>

                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setShowLinkModal(false)}
                                    style={{
                                        padding: '10px 20px',
                                        background: 'var(--bg-glass)',
                                        color: 'var(--text-secondary)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        fontSize: 14,
                                        fontWeight: 600,
                                        transition: 'var(--transition)'
                                    }}
                                >
                                    Close
                                </button>
                                <button
                                    onClick={handleCopyLink}
                                    className="btn btn-primary"
                                    style={{
                                        background: copied ? 'var(--success-bg)' : 'var(--accent)',
                                        color: copied ? 'var(--success)' : 'white'
                                    }}
                                >
                                    {copied ? '✓ Copied!' : 'Copy Link'}
                                </button>
                            </div>

                            <div style={{
                                marginTop: 24,
                                padding: '12px 16px',
                                background: 'rgba(217, 125, 85, 0.1)',
                                border: '1px solid rgba(217, 125, 85, 0.2)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: 12,
                                color: 'var(--accent)',
                                lineHeight: 1.6
                            }}>
                                <strong>📌 Note:</strong> Link expires in 3 days. Recipient must have an account or sign up to accept.
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    );
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
}

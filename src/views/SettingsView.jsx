import React, { useState, useEffect } from 'react';
import { User, Lock, Save, ShieldCheck, UserCircle, History, RotateCw, Info, Search, Shield, Key, ArrowRightLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

const SettingsView = ({ user, onUpdateUser }) => {
    const [formData, setFormData] = useState({
        username: user?.username || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [auditLogs, setAuditLogs] = useState([]);
    const [auditLoading, setAuditLoading] = useState(true);
    const [auditSearch, setAuditSearch] = useState('');
    const [auditTab, setAuditTab] = useState('All');
    const [expandedLog, setExpandedLog] = useState(null);

    useEffect(() => {
        fetchAuditLogs();
    }, []);

    const fetchAuditLogs = async () => {
        setAuditLoading(true);
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(100);

            if (error) throw error;
            setAuditLogs(data || []);
        } catch (err) {
            console.error('Error fetching audit logs:', err);
        } finally {
            setAuditLoading(false);
        }
    };

    const getActionCategory = (action) => {
        const accessActions = ['Approve Visitor', 'Reject Visitor', 'Check-in', 'Check-out', 'Log Vehicle', 'Check-out Vehicle'];
        const authActions = ['Login', 'Logout'];
        const securityActions = ['Password Reset', 'Update Profile'];

        if (accessActions.includes(action)) return { label: 'Access', color: '#3b82f6', icon: ArrowRightLeft };
        if (authActions.includes(action)) return { label: 'Auth', color: '#10b981', icon: Key };
        if (securityActions.includes(action)) return { label: 'Security', color: '#f59e0b', icon: Shield };
        return { label: 'System', color: '#8b5cf6', icon: Info };
    };

    const filteredAuditLogs = auditLogs.filter(log => {
        const category = getActionCategory(log.action).label;
        const matchesTab = auditTab === 'All' || category === auditTab;
        const matchesSearch = !auditSearch ||
            log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
            log.user_id?.toLowerCase().includes(auditSearch.toLowerCase()) ||
            JSON.stringify(log.details).toLowerCase().includes(auditSearch.toLowerCase());

        return matchesTab && matchesSearch;
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        setLoading(true);
        // Simulate API call/Update logic
        try {
            // In a real app, we would call Supabase auth update here
            // For now, we update the local user state and show success
            await new Promise(resolve => setTimeout(resolve, 800));

            const updatedUser = { ...user, username: formData.username };
            onUpdateUser(updatedUser);

            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="card" style={{ padding: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.5rem' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '20px',
                        background: 'linear-gradient(135deg, var(--primary), #ec4899)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                    }}>
                        <UserCircle size={40} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Account Settings</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Manage your personal information and security preferences</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Username / Email</label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem 1rem 0.875rem 3rem',
                                        borderRadius: '12px',
                                        border: '1px solid var(--glass-border)',
                                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                        color: 'var(--text-main)',
                                        fontWeight: 600,
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Access Role</label>
                            <div style={{
                                padding: '0.875rem 1rem',
                                borderRadius: '12px',
                                border: '1px solid var(--glass-border)',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                color: 'var(--text-muted)',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem'
                            }}>
                                <ShieldCheck size={18} />
                                {user?.role}
                            </div>
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '2rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1.5rem' }}>Change Password</h3>
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Current Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        type="password"
                                        placeholder="Enter current password"
                                        value={formData.currentPassword}
                                        onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '0.875rem 1rem 0.875rem 3rem',
                                            borderRadius: '12px',
                                            border: '1px solid var(--glass-border)',
                                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                            color: 'var(--text-main)',
                                            fontWeight: 600,
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>New Password</label>
                                    <input
                                        type="password"
                                        placeholder="Minimum 8 characters"
                                        value={formData.newPassword}
                                        onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '0.875rem 1rem',
                                            borderRadius: '12px',
                                            border: '1px solid var(--glass-border)',
                                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                            color: 'var(--text-main)',
                                            fontWeight: 600,
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Confirm New Password</label>
                                    <input
                                        type="password"
                                        placeholder="Repeat new password"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '0.875rem 1rem',
                                            borderRadius: '12px',
                                            border: '1px solid var(--glass-border)',
                                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                            color: 'var(--text-main)',
                                            fontWeight: 600,
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {message.text && (
                        <div style={{
                            padding: '1rem',
                            borderRadius: '12px',
                            backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: message.type === 'success' ? '#10b981' : '#ef4444',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            textAlign: 'center'
                        }}>
                            {message.text}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary"
                            style={{
                                padding: '0.875rem 2.5rem',
                                opacity: loading ? 0.7 : 1,
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <Save size={18} />
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Audit Trail Section */}
            <div className="card" style={{ padding: '2.5rem', marginTop: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '20px',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-main)',
                            border: '1px solid var(--glass-border)'
                        }}>
                            <History size={32} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Audit Trail</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Read-only history of system-wide actions and events</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchAuditLogs}
                        disabled={auditLoading}
                        style={{
                            padding: '0.75rem',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: 600
                        }}
                    >
                        <RotateCw size={16} className={auditLoading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>

                {/* Audit Controls */}
                <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                        {['All', 'Access', 'Security', 'Auth'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setAuditTab(tab)}
                                style={{
                                    padding: '0.5rem 1.25rem',
                                    borderRadius: '10px',
                                    border: '1px solid var(--glass-border)',
                                    backgroundColor: auditTab === tab ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                                    color: auditTab === tab ? 'white' : 'var(--text-muted)',
                                    fontWeight: 700,
                                    fontSize: '0.8125rem',
                                    cursor: 'pointer',
                                    transition: 'var(--transition)',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search by action, user, or details..."
                            value={auditSearch}
                            onChange={(e) => setAuditSearch(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.875rem 1rem 0.875rem 3rem',
                                borderRadius: '12px',
                                border: '1px solid var(--glass-border)',
                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                color: 'var(--text-main)',
                                fontSize: '0.875rem',
                                outline: 'none'
                            }}
                        />
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Timestamp</th>
                                <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Action</th>
                                <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>User</th>
                                <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Details</th>
                                <th style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            {auditLoading ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                            <RotateCw size={24} className="animate-spin" />
                                            <span>Loading system activity...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredAuditLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                        No matching activity found.
                                    </td>
                                </tr>
                            ) : (
                                filteredAuditLogs.map((log) => {
                                    const category = getActionCategory(log.action);
                                    const CategoryIcon = category.icon;
                                    const isExpanded = expandedLog === log.id;

                                    return (
                                        <React.Fragment key={log.id}>
                                            <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', transition: 'var(--transition)' }}>
                                                <td style={{ padding: '1.25rem 1rem', borderRadius: '12px 0 0 12px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{log.timestamp ? new Date(log.timestamp).toLocaleDateString() : 'N/A'}</span>
                                                        <span style={{ opacity: 0.7 }}>{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1.25rem 1rem' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <div style={{ padding: '0.25rem', borderRadius: '6px', backgroundColor: `${category.color}15`, color: category.color }}>
                                                                <CategoryIcon size={14} />
                                                            </div>
                                                            <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-main)' }}>{log.action}</span>
                                                        </div>
                                                        <span style={{ fontSize: '0.625rem', fontWeight: 900, textTransform: 'uppercase', color: category.color, letterSpacing: '0.05em' }}>{category.label}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1.25rem 1rem', fontSize: '0.8125rem', color: 'var(--text-main)', fontWeight: 600 }}>
                                                    {log.user_id || 'System'}
                                                </td>
                                                <td style={{ padding: '1.25rem 1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                                    {log.details?.name ? `Target: ${log.details.name}` : ''}
                                                    {log.table_name && !log.details?.name ? `Module: ${log.table_name}` : ''}
                                                    {!log.details?.name && !log.table_name ? 'System Event' : ''}
                                                </td>
                                                <td style={{ padding: '1.25rem 1rem', borderRadius: '0 12px 12px 0', textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'var(--text-muted)',
                                                            cursor: 'pointer',
                                                            padding: '0.5rem'
                                                        }}
                                                    >
                                                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                    </button>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan="5" style={{ padding: '0 1rem 1rem 1rem' }}>
                                                        <div style={{
                                                            padding: '1.5rem',
                                                            backgroundColor: 'rgba(0,0,0,0.2)',
                                                            borderRadius: '0 0 16px 16px',
                                                            border: '1px solid var(--glass-border)',
                                                            borderTop: 'none',
                                                            marginTop: '-0.5rem'
                                                        }}>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                                                                <div>
                                                                    <div style={{ fontSize: '0.625rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Full Resource ID</div>
                                                                    <code style={{ fontSize: '0.75rem', color: 'var(--primary)', fontFamily: 'monospace' }}>{log.record_id || 'N/A'}</code>
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: '0.625rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Technical Details</div>
                                                                    <pre style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                                                                        {JSON.stringify(log.details, null, 2)}
                                                                    </pre>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;

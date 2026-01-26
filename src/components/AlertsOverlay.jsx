import React, { useState, useMemo } from 'react';
import { X, AlertTriangle, Clock, Users, Car, Calendar, Filter, ChevronRight, CheckCircle2 } from 'lucide-react';
import AlertDetailView from './AlertDetailView';

const AlertsOverlay = ({ alerts, onClose, onMarkRead, userRole }) => {
    const [filter, setFilter] = useState('All');
    const [selectedAlert, setSelectedAlert] = useState(null);

    const filteredAlerts = useMemo(() => {
        if (filter === 'All') return alerts;
        return alerts.filter(a => a.type === filter);
    }, [alerts, filter]);

    const getIcon = (type) => {
        switch (type) {
            case 'Visitor': return <Users size={18} />;
            case 'Vehicle': return <Car size={18} />;
            case 'Meeting': return <Calendar size={18} />;
            default: return <AlertTriangle size={18} />;
        }
    };

    const isHOD = userRole === 'Security HOD';

    return (
        <>
            <div style={{
                position: 'fixed',
                top: '80px',
                right: '2rem',
                width: '400px',
                maxHeight: 'calc(100vh - 120px)',
                backgroundColor: 'var(--background)',
                backdropFilter: 'blur(20px)',
                border: '2px solid var(--glass-border)',
                borderRadius: '24px',
                boxShadow: 'var(--shadow)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                animation: 'slideInRight 0.3s ease-out'
            }}>
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid var(--glass-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    backgroundColor: 'rgba(255,255,255,0.02)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            Security Alerts
                            {alerts.filter(a => !a.is_read).length > 0 && (
                                <span style={{
                                    fontSize: '0.7rem',
                                    padding: '0.2rem 0.6rem',
                                    backgroundColor: 'var(--danger)',
                                    color: 'white',
                                    borderRadius: '10px'
                                }}>
                                    {alerts.filter(a => !a.is_read).length} NEW
                                </span>
                            )}
                        </h3>
                        <button onClick={onClose} style={{ padding: '0.5rem', color: 'var(--text-muted)', backgroundColor: 'transparent' }}>
                            <X size={20} />
                        </button>
                    </div>

                    {isHOD && (
                        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '12px' }}>
                            {['All', 'Visitor', 'Vehicle', 'Meeting'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    style={{
                                        flex: 1,
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        padding: '0.5rem',
                                        borderRadius: '10px',
                                        backgroundColor: filter === f ? 'var(--primary)' : 'transparent',
                                        color: filter === f ? 'white' : 'var(--text-muted)',
                                        border: 'none',
                                        transition: 'var(--transition)'
                                    }}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                    {filteredAlerts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                            <div style={{ marginBottom: '1.5rem', color: 'var(--accent)', opacity: 0.3 }}>
                                <CheckCircle2 size={48} />
                            </div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>No {filter !== 'All' ? filter : ''} alerts found.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {filteredAlerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    onClick={() => setSelectedAlert(alert)}
                                    style={{
                                        padding: '1.25rem',
                                        borderRadius: '16px',
                                        backgroundColor: alert.is_read ? 'rgba(255, 255, 255, 0.02)' : (alert.severity === 'critical' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)'),
                                        border: `1px solid ${alert.is_read ? 'var(--glass-border)' : (alert.severity === 'critical' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)')}`,
                                        cursor: 'pointer',
                                        transition: 'var(--transition)',
                                        position: 'relative'
                                    }}>
                                    {!alert.is_read && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '1.25rem',
                                            right: '1.25rem',
                                            width: '8px',
                                            height: '8px',
                                            backgroundColor: alert.severity === 'critical' ? 'var(--danger)' : 'var(--warning)',
                                            borderRadius: '50%'
                                        }} />
                                    )}
                                    <div style={{ display: 'flex', gap: '0.875rem' }}>
                                        <div style={{
                                            color: alert.is_read ? 'var(--text-muted)' : (alert.severity === 'critical' ? 'var(--danger)' : 'var(--warning)'),
                                            width: '32px',
                                            height: '32px',
                                            backgroundColor: 'rgba(255,255,255,0.05)',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            {getIcon(alert.type)}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{
                                                fontWeight: alert.is_read ? 600 : 800,
                                                fontSize: '0.95rem',
                                                color: alert.is_read ? 'var(--text-muted)' : 'var(--text-main)',
                                                marginBottom: '0.35rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between'
                                            }}>
                                                {alert.title}
                                            </div>
                                            <div style={{
                                                fontSize: '0.85rem',
                                                color: alert.is_read ? 'var(--text-muted)' : 'var(--text-secondary)',
                                                lineHeight: 1.4,
                                                marginBottom: '0.75rem'
                                            }}>
                                                {alert.message}
                                            </div>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                fontSize: '0.7rem',
                                                color: 'var(--text-muted)',
                                                fontWeight: 600
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                    <Clock size={12} />
                                                    {new Date(alert.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <ChevronRight size={14} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ padding: '1.25rem', borderTop: '1px solid var(--glass-border)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic' }}>
                        {alerts.length > 0 ? `Total alerts logged: ${alerts.length}` : 'Scanning for security anomalies...'}
                    </p>
                </div>
            </div>

            {selectedAlert && (
                <AlertDetailView
                    alert={selectedAlert}
                    onClose={() => setSelectedAlert(null)}
                    onMarkRead={onMarkRead}
                />
            )}
        </>
    );
};

export default AlertsOverlay;

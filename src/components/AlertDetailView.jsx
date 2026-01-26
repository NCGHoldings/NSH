import React from 'react';
import { X, Clock, User, Car, Calendar, AlertTriangle, ShieldCheck } from 'lucide-react';

const AlertDetailView = ({ alert, onClose, onMarkRead }) => {
    if (!alert) return null;

    const data = alert.details || {};

    const getIcon = (type) => {
        switch (type) {
            case 'Visitor': return <User size={32} />;
            case 'Vehicle': return <Car size={32} />;
            case 'Meeting': return <Calendar size={32} />;
            default: return <AlertTriangle size={32} />;
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '1.5rem',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div className="card" style={{
                width: '100%',
                maxWidth: '500px',
                padding: '0',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    background: alert.severity === 'critical' ? 'linear-gradient(135deg, #ef4444, #991b1b)' : 'linear-gradient(135deg, #f59e0b, #b45309)',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {getIcon(alert.type)}
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{alert.title}</h3>
                            <span style={{ fontSize: '0.75rem', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {alert.category} • {alert.type}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ color: 'white', backgroundColor: 'transparent', padding: '0.5rem' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '2rem' }}>
                    <div style={{ marginBottom: '2rem' }}>
                        <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Alert Reason</h4>
                        <div style={{
                            padding: '1rem',
                            backgroundColor: 'rgba(255,255,255,0.03)',
                            borderRadius: '12px',
                            borderLeft: `4px solid ${alert.severity === 'critical' ? 'var(--danger)' : 'var(--warning)'}`,
                            color: 'var(--text-main)',
                            fontWeight: 500,
                            lineHeight: 1.5
                        }}>
                            {alert.message}
                            {data.stay_duration && (
                                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    Current stay duration: <strong>{data.stay_duration} hours</strong>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                                {alert.type === 'Vehicle' ? 'Identification' : 'Full Name'}
                            </h4>
                            <p style={{ color: 'var(--text-main)', fontWeight: 700, margin: 0 }}>
                                {alert.type === 'Vehicle' ? data.vehicle_number : data.name}
                            </p>
                        </div>

                        {alert.type !== 'Vehicle' && (
                            <div>
                                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>ID Number</h4>
                                <p style={{ color: 'var(--text-main)', fontWeight: 700, margin: 0 }}>{data.nic || 'N/A'}</p>
                            </div>
                        )}

                        <div>
                            <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Check-in Time</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontWeight: 700 }}>
                                <Clock size={14} />
                                {data.entry_time ? new Date(data.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                            </div>
                        </div>

                        {data.end_time && (
                            <div>
                                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Scheduled Exit</h4>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontWeight: 700 }}>
                                    <Clock size={14} />
                                    {data.end_time}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '1.5rem 2rem',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    borderTop: '1px solid var(--glass-border)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '1rem'
                }}>
                    {!alert.is_read && (
                        <button
                            onClick={() => {
                                onMarkRead(alert.id);
                                onClose();
                            }}
                            className="btn-primary"
                            style={{ padding: '0.75rem 1.5rem' }}
                        >
                            <ShieldCheck size={18} /> Mark as Read
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        style={{
                            padding: '0.75rem 1.5rem',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            color: 'var(--text-main)',
                            borderRadius: '12px',
                            fontWeight: 700
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AlertDetailView;

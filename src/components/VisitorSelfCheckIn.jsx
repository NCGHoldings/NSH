import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, FileText, CheckCircle, XCircle, Search, ArrowRight, Loader, Calendar, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sendTelegramNotification } from '../lib/telegram';
import { useSearchParams, useNavigate } from 'react-router-dom';
import LanguageSwitcher from './LanguageSwitcher';

const VisitorSelfCheckIn = ({ onClose, onSuccess }) => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const typeFromUrl = searchParams.get('type');

    const [step, setStep] = useState(typeFromUrl ? 2 : 1);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);

    const [formData, setFormData] = useState({
        visitorType: typeFromUrl || 'Parents', // Use type from URL if available
        isScheduled: false,
        visitors: [{ name: '', nic: '', contact: '' }], // Support multiple visitors
        purpose: '',
        sbu: '',
        meetingWith: '', // Derived from schedule
        scheduledMeetingId: null
    });

    // Approval Workflow State
    const [submittedData, setSubmittedData] = useState(null);
    const [approvalStatus, setApprovalStatus] = useState('initial'); // initial, pending, approved, denied, scheduled
    const [visitorId, setVisitorId] = useState(null);
    const [meetingDetails, setMeetingDetails] = useState(null);

    // Real-time Subscription for Approval Status
    useEffect(() => {
        let subscription;
        let pollInterval;

        if (approvalStatus === 'pending' && visitorId) {
            // Prevent accidental close/refresh
            const handleBeforeUnload = (e) => {
                e.preventDefault();
                e.returnValue = '';
            };
            window.addEventListener('beforeunload', handleBeforeUnload);

            console.log(`Setting up Real-time listener for Meeting ID: ${visitorId}`);
            subscription = supabase
                .channel(`meeting-monitor-${visitorId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'scheduled_meetings'
                    },
                    (payload) => {
                        console.log("Kiosk received Real-time Update:", payload);

                        if (payload.new && payload.new.id === visitorId) {
                            const newStatus = payload.new.status;
                            if (newStatus === 'Scheduled' || newStatus === 'Confirmed' || newStatus === 'Approved') {
                                setMeetingDetails({
                                    date: payload.new.meeting_date,
                                    from: payload.new.start_time,
                                    to: payload.new.end_time
                                });
                                setApprovalStatus('scheduled');
                            } else if (newStatus === 'Denied' || newStatus === 'Rejected' || newStatus === 'Cancelled') {
                                setApprovalStatus('denied');
                                setTimeout(() => {
                                    navigate('/');
                                }, 4000);
                            }
                        }
                    }
                )
                .subscribe((status) => {
                    console.log(`Kiosk Real-time Subscription Status: ${status}`);
                });

            // Polling Fallback (Every 3 seconds)
            pollInterval = setInterval(async () => {
                const { data } = await supabase.from('scheduled_meetings').select('*').eq('id', visitorId).single();
                if (data) {
                    const newStatus = data.status;
                    if (['Scheduled', 'Confirmed', 'Approved'].includes(newStatus)) {
                        setMeetingDetails({ date: data.meeting_date, from: data.start_time, to: data.end_time });
                        setApprovalStatus('scheduled');
                    } else if (['Denied', 'Rejected', 'Cancelled'].includes(newStatus)) {
                        setApprovalStatus('denied');
                    }
                }
            }, 3000);

            return () => {
                window.removeEventListener('beforeunload', handleBeforeUnload);
                if (subscription) supabase.removeChannel(subscription);
                if (pollInterval) clearInterval(pollInterval);
            };
        }

        return () => {
            if (subscription) supabase.removeChannel(subscription);
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [approvalStatus, visitorId, navigate]);

    const [scheduleMatch, setScheduleMatch] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (typeFromUrl) {
            setFormData(prev => ({
                ...prev,
                visitorType: typeFromUrl,
                purpose: prev.purpose
            }));
            setStep(2);
        }
    }, [typeFromUrl]);

    const handleTypeSelect = (type) => {
        setFormData({ ...formData, visitorType: type, isScheduled: false, visitors: [{ name: '', nic: '', contact: '' }], purpose: '', sbu: '' });
        setStep(2);
    };

    const handleVerifySchedule = async () => {
        const primaryNic = formData.visitors[0].nic;
        if (!primaryNic) return;
        setVerifying(true);
        setError(null);
        setScheduleMatch(null);

        try {
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase
                .from('scheduled_meetings')
                .select('*')
                .eq('visitor_nic', primaryNic)
                .eq('meeting_date', today)
                .in('status', ['Scheduled', 'Confirmed'])
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is 'no rows returned'
                throw error;
            }

            if (data) {
                setScheduleMatch(data);
                setFormData(prev => {
                    const newVisitors = [...prev.visitors];
                    newVisitors[0] = { name: data.visitor_name, nic: data.visitor_nic, contact: data.visitor_contact };
                    return {
                        ...prev,
                        visitors: newVisitors,
                        purpose: data.purpose,
                        meetingWith: data.meeting_with,
                        scheduledMeetingId: data.id
                    };
                });
            } else {
                setError("No scheduled meeting found for today with this ID. Please proceed as a walk-in or contact security.");
                setFormData(prev => {
                    const newVisitors = [...prev.visitors];
                    newVisitors[0] = { ...newVisitors[0], name: '', contact: '' };
                    return {
                        ...prev,
                        visitors: newVisitors,
                        purpose: '',
                        meetingWith: '',
                        scheduledMeetingId: null
                    };
                });
            }
        } catch (err) {
            console.error(err);
            setError("Error verifying schedule. Please try again.");
        } finally {
            setVerifying(false);
        }
    };

    const addVisitor = () => {
        setFormData(prev => ({
            ...prev,
            visitors: [...prev.visitors, { name: '', nic: '', contact: '' }]
        }));
    };

    const removeVisitor = (index) => {
        if (formData.visitors.length <= 1) return;
        setFormData(prev => ({
            ...prev,
            visitors: prev.visitors.filter((_, i) => i !== index)
        }));
    };

    const updateVisitor = (index, field, value) => {
        setFormData(prev => {
            const newVisitors = [...prev.visitors];
            newVisitors[index] = { ...newVisitors[index], [field]: value };
            return { ...prev, visitors: newVisitors };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (scheduleMatch) {
                // Case 1: PRE-SCHEDULED CHECK-IN
                const insertPromises = formData.visitors.map(visitor => {
                    if (!visitor.name || !visitor.nic) return null;
                    return supabase
                        .from('visitors')
                        .insert({
                            name: visitor.name,
                            nic_passport: visitor.nic,
                            contact: visitor.contact,
                            type: formData.visitorType,
                            purpose: (formData.visitorType === 'Lyceum' && formData.sbu ? `${formData.purpose} - ${formData.sbu}` : formData.purpose),
                            meeting_with: formData.meetingWith || scheduleMatch.meeting_with,
                            status: 'Checked-in',
                            validation_method: 'Auto',
                            is_pre_registered: true
                        })
                        .select()
                        .single();
                }).filter(p => p !== null);

                const results = await Promise.all(insertPromises);
                const errors = results.filter(r => r.error);
                if (errors.length > 0) throw new Error("Failed to create visitor entry.");

                // Update meeting status
                await supabase
                    .from('scheduled_meetings')
                    .update({ status: 'Checked-in' })
                    .eq('id', scheduleMatch.id);

                setSubmittedData(formData);
                setApprovalStatus('approved');
                setTimeout(() => {
                    if (onSuccess) onSuccess();
                    else navigate('/');
                }, 2000);

            } else {
                // Case 2: WALK-IN MEETING REQUEST (PURE SCHEDULING)
                const approvalToken = crypto.randomUUID();

                // Only create ONE meeting request for the group (or multiple if system expects separate)
                // We'll create one for the primary visitor for now as per system behavior
                const primaryVisitor = formData.visitors[0];

                const { data: meeting, error: insertError } = await supabase
                    .from('scheduled_meetings')
                    .insert({
                        visitor_name: primaryVisitor.name,
                        visitor_nic: primaryVisitor.nic,
                        visitor_contact: primaryVisitor.contact,
                        visitor_category: 'On-arrival',
                        meeting_with: formData.meetingWith || 'To be assigned',
                        purpose: formData.purpose,
                        meeting_date: new Date().toISOString().split('T')[0],
                        start_time: '10:00', // Placeholders
                        end_time: '11:00',
                        status: 'Meeting Requested',
                        approval_token: approvalToken
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;

                setVisitorId(meeting.id);
                setSubmittedData(formData);
                setApprovalStatus('pending');

                // Trigger Telegram Notification
                const visitorNames = formData.visitors.map(v => v.name).join(', ');
                console.log("Triggering Telegram for:", visitorNames);
                try {
                    const telegramData = await sendTelegramNotification(
                        visitorNames,
                        formData.purpose,
                        formData.meetingWith,
                        meeting.id,
                        approvalToken,
                        primaryVisitor.contact
                    );

                    if (telegramData?.message_id) {
                        console.log("Telegram success:", telegramData);
                        await supabase.from('scheduled_meetings').update({
                            telegram_message_id: telegramData.message_id.toString(),
                            telegram_chat_id: telegramData.chat_id.toString()
                        }).eq('id', meeting.id);
                    } else {
                        console.error("Telegram notification returned null or failed.");
                        // Optional: alert("Note: Telegram notification could not be sent. Please check your connection or bot settings.");
                    }
                } catch (tgErr) {
                    console.error("Telegram error catch:", tgErr);
                    alert("Telegram Error: " + tgErr.message);
                }
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Helper for full screen background
    const FullScreenContainer = ({ children }) => (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: '#0a0c10',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(37, 99, 235, 0.15) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 40%), radial-gradient(circle at 50% 50%, rgba(37, 99, 235, 0.05) 0%, transparent 100%)',
            backdropFilter: 'blur(100px)'
        }}>
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.2)', zIndex: -1 }}></div>
            {children}
        </div>
    );

    // Waiting State (Pending)
    if (submittedData && approvalStatus === 'pending') {
        return (
            <FullScreenContainer>
                <div className="card animate-fade-in" style={{
                    padding: '3rem',
                    textAlign: 'center',
                    maxWidth: '500px',
                    width: '90%',
                    backgroundColor: '#1E293B',
                    borderRadius: '24px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}>
                    <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
                        <div className="animate-pulse" style={{ padding: '1.5rem', backgroundColor: 'rgba(234, 179, 8, 0.1)', borderRadius: '50%' }}>
                            <Loader size={48} color="#EAB308" className="animate-spin" />
                        </div>
                    </div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', marginBottom: '1rem' }}>{t('kiosk.pending_title')}</h2>
                    <p style={{ color: '#94a3b8', fontSize: '1.125rem', marginBottom: '2rem' }}>
                        {t('kiosk.pending_msg')}
                        <br />
                        <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>Do not close this window.</span>
                    </p>
                    <div style={{ display: 'inline-block', padding: '0.75rem 1.5rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '0.875rem', color: '#cbd5e1' }}>
                        Host: {submittedData.meetingWith || 'General Visit'}
                    </div>
                    {/* Fallback Refresh Button */}
                    <button
                        onClick={async () => {
                            const { data } = await supabase.from('scheduled_meetings').select('*').eq('id', visitorId).single();
                            if (data && (data.status === 'Scheduled' || data.status === 'Confirmed')) {
                                setMeetingDetails({ date: data.meeting_date, from: data.start_time, to: data.end_time });
                                setApprovalStatus('scheduled');
                            }
                        }}
                        style={{ marginTop: '2rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}
                    >
                        Click here if screen doesn't update automatically
                    </button>
                </div>
            </FullScreenContainer>
        );
    }

    // Access Denied State
    if (submittedData && approvalStatus === 'denied') {
        return (
            <FullScreenContainer>
                <div className="card animate-fade-in" style={{
                    padding: '3rem',
                    textAlign: 'center',
                    maxWidth: '500px',
                    width: '90%',
                    backgroundColor: '#1E293B',
                    borderRadius: '24px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}>
                    <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ padding: '1.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%' }}>
                            <XCircle size={64} color="#EF4444" />
                        </div>
                    </div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#EF4444', marginBottom: '1rem' }}>{t('kiosk.denied_title')}</h2>
                    <p style={{ color: '#94a3b8', fontSize: '1.125rem', marginBottom: '2rem' }}>
                        {t('kiosk.denied_msg')}
                        <br />Please contact security for assistance.
                    </p>
                </div>
            </FullScreenContainer>
        );
    }

    // Meeting Scheduled State
    if (submittedData && approvalStatus === 'scheduled') {
        return (
            <FullScreenContainer>
                <div className="card animate-fade-in" style={{
                    padding: '3rem',
                    textAlign: 'center',
                    maxWidth: '500px',
                    width: '90%',
                    backgroundColor: '#1E293B',
                    borderRadius: '24px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}>
                    <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
                        <div className="animate-bounce-in" style={{ padding: '1.5rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '50%' }}>
                            <Calendar size={64} color="#F59E0B" />
                        </div>
                    </div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#F59E0B', marginBottom: '1rem' }}>Meeting Scheduled</h2>

                    {meetingDetails && (
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#F59E0B', marginBottom: '0.5rem' }}>
                                <Clock size={16} />
                                <span style={{ fontWeight: 700 }}>{meetingDetails.from} - {meetingDetails.to}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                                <Calendar size={16} />
                                <span>{meetingDetails.date}</span>
                            </div>
                        </div>
                    )}

                    <p style={{ color: '#94a3b8', fontSize: '1.125rem', marginBottom: '2rem' }}>
                        Your meeting has been scheduled, <strong>{submittedData?.visitors?.[0]?.name || 'Visitor'}</strong>!
                        <br />
                        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Please close this and use the "Scheduled" option for check-in.</span>
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            width: '100%',
                            padding: '1.25rem',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            color: '#fff',
                            borderRadius: '16px',
                            fontWeight: 800,
                            border: '1px solid rgba(255,255,255,0.1)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        CLOSE & START CHECK-IN <CheckCircle size={20} />
                    </button>
                </div>
            </FullScreenContainer>
        );
    }

    // Success / Approved State
    if (submittedData && approvalStatus === 'approved') {
        return (
            <FullScreenContainer>
                <div className="card animate-fade-in" style={{
                    padding: '3rem',
                    textAlign: 'center',
                    maxWidth: '500px',
                    width: '90%',
                    backgroundColor: '#1E293B',
                    borderRadius: '24px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}>
                    <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
                        <div className="animate-bounce-in" style={{ padding: '1.5rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%' }}>
                            <CheckCircle size={64} color="#10B981" />
                        </div>
                    </div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#10B981', marginBottom: '1rem' }}>{t('kiosk.granted_title')}</h2>
                    <p style={{ color: '#94a3b8', fontSize: '1.125rem', marginBottom: '2rem' }}>
                        {t('kiosk.granted_msg_prefix', { defaultValue: 'Welcome,' })} <strong>{submittedData?.visitors?.[0]?.name || t('common.visitor')}</strong>!
                        <br />
                        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>{t('kiosk.granted_msg')}</span>
                    </p>
                </div >
            </FullScreenContainer >
        );
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: '#0a0c10',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflowY: 'auto',
            backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(37, 99, 235, 0.15) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 40%), radial-gradient(circle at 50% 50%, rgba(37, 99, 235, 0.05) 0%, transparent 100%)',
            backdropFilter: 'blur(100px)'
        }}>
            {/* Background Blur Overlay for Premium Feel */}
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.2)', zIndex: -1 }}></div>

            {/* Language Selection - Prominent for Visitors */}
            <div style={{ position: 'fixed', top: '2rem', right: '2rem', zIndex: 10000 }}>
                <LanguageSwitcher variant="kiosk" />
            </div>

            <div style={{
                width: '100%',
                maxWidth: '550px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative'
            }}>
                {/* Floating Top Icon Badge */}
                <div style={{
                    width: '110px',
                    height: '110px',
                    backgroundColor: '#1e293b',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '4px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                    marginBottom: '-55px',
                    zIndex: 10,
                    position: 'relative'
                }}>
                    <div style={{
                        width: '70px',
                        height: '70px',
                        border: '2px solid rgba(255,255,255,0.4)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <User size={36} color="#fff" />
                    </div>
                </div>

                {/* Main Glass Card */}
                <div className="card animate-fade-in" style={{
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    backdropFilter: 'blur(25px)',
                    WebkitBackdropFilter: 'blur(25px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '32px',
                    padding: '5rem 3rem 3rem 3rem',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2.5rem'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                            {step === 1 ? t('kiosk.title') : t('kiosk.identity')}
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            {step === 1 ? t('kiosk.subtitle') : `${t(`kiosk.${formData.visitorType.toLowerCase()}`)} Entry Portal`}
                        </p>
                    </div>

                    {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {['Parents', 'Lyceum', 'Other'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => handleTypeSelect(type)}
                                    style={{
                                        width: '100%',
                                        padding: '1.25rem',
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '16px',
                                        color: '#fff',
                                        fontSize: '1.125rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        transition: 'var(--transition)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}
                                    className="hover-brighten"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <User size={20} style={{ color: type === 'Lyceum' ? 'var(--primary)' : 'var(--text-main)' }} />
                                        {t(`kiosk.${type.toLowerCase()}`)}
                                    </div>
                                    <ArrowRight size={18} opacity={0.5} />
                                </button>
                            ))}
                        </div>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                            {/* Pre-scheduled Toggle Section */}
                            <div
                                onClick={() => setFormData(p => ({ ...p, isScheduled: !p.isScheduled }))}
                                style={{
                                    padding: '1.25rem',
                                    backgroundColor: formData.isScheduled ? 'rgba(37, 99, 235, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid',
                                    borderColor: formData.isScheduled ? 'rgba(37, 99, 235, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                                    borderRadius: '16px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    transition: 'var(--transition)'
                                }}
                            >
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '4px',
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: formData.isScheduled ? 'var(--primary)' : 'transparent',
                                    borderColor: formData.isScheduled ? 'var(--primary)' : 'rgba(255,255,255,0.3)'
                                }}>
                                    {formData.isScheduled && <CheckCircle size={14} color="#fff" />}
                                </div>
                                <span style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 600 }}>{t('kiosk.scheduled_toggle')}</span>
                            </div>

                            {/* Verification Section */}
                            {formData.isScheduled && (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1rem',
                                    padding: '1.5rem',
                                    backgroundColor: 'rgba(0,0,0,0.2)',
                                    borderRadius: '20px',
                                    border: '1px dashed rgba(255,255,255,0.1)'
                                }}>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input
                                            type="text"
                                            placeholder={t('kiosk.nic_placeholder')}
                                            value={formData.nicPassport}
                                            onChange={(e) => setFormData({ ...formData, nicPassport: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: '1rem 1rem 1rem 3rem',
                                                backgroundColor: '#fff',
                                                borderRadius: '12px',
                                                border: 'none',
                                                color: '#1e293b',
                                                fontWeight: 600,
                                                fontSize: '1rem',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleVerifySchedule}
                                        disabled={verifying}
                                        style={{
                                            padding: '1rem',
                                            backgroundColor: 'var(--primary)',
                                            color: '#fff',
                                            borderRadius: '12px',
                                            fontWeight: 800,
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {verifying ? <Loader className="animate-spin" size={18} /> : t('kiosk.verify_button')}
                                    </button>
                                    {error && <p style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 600, textAlign: 'center' }}>{error}</p>}
                                    {scheduleMatch && (
                                        <p style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 700, textAlign: 'center' }}>
                                            ✓ Match Found: {scheduleMatch.visitor_name}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Data Entry Fields - Multiple Visitors */}
                            {(!formData.isScheduled || scheduleMatch) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {formData.visitors.map((visitor, index) => (
                                            <div key={index} style={{
                                                padding: '1.25rem',
                                                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                                borderRadius: '20px',
                                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '1rem',
                                                position: 'relative'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
                                                        Visitor {index + 1}
                                                    </span>
                                                    {index > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeVisitor(index)}
                                                            style={{ padding: '0.25rem', backgroundColor: 'transparent', color: '#ef4444', opacity: 0.7 }}
                                                        >
                                                            <XCircle size={18} />
                                                        </button>
                                                    )}
                                                </div>

                                                <div style={{ position: 'relative' }}>
                                                    <FileText size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                                    <input
                                                        type="text"
                                                        required
                                                        readOnly={formData.isScheduled && index === 0}
                                                        placeholder={t('kiosk.nic_placeholder')}
                                                        value={visitor.nic}
                                                        onChange={(e) => updateVisitor(index, 'nic', e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.875rem 1rem 0.875rem 2.75rem',
                                                            backgroundColor: '#fff',
                                                            borderRadius: '12px',
                                                            border: 'none',
                                                            color: '#1e293b',
                                                            fontWeight: 600,
                                                            fontSize: '0.9375rem',
                                                            outline: 'none'
                                                        }}
                                                    />
                                                </div>

                                                <div style={{ position: 'relative' }}>
                                                    <User size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                                    <input
                                                        type="text"
                                                        required
                                                        readOnly={!!scheduleMatch && index === 0}
                                                        placeholder={t('kiosk.name_placeholder')}
                                                        value={visitor.name}
                                                        onChange={(e) => updateVisitor(index, 'name', e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.875rem 1rem 0.875rem 2.75rem',
                                                            backgroundColor: '#fff',
                                                            borderRadius: '12px',
                                                            border: 'none',
                                                            color: '#1e293b',
                                                            fontWeight: 600,
                                                            fontSize: '0.9375rem',
                                                            outline: 'none'
                                                        }}
                                                    />
                                                </div>

                                                {/* Contact Number Field */}
                                                <div style={{ position: 'relative' }}>
                                                    <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: 800 }}>TEL</span>
                                                    </div>
                                                    <input
                                                        type="tel"
                                                        required={!formData.isScheduled}
                                                        placeholder={t('kiosk.contact_placeholder')}
                                                        value={visitor.contact || ''}
                                                        onChange={(e) => updateVisitor(index, 'contact', e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.875rem 1rem 0.875rem 2.75rem',
                                                            backgroundColor: '#fff',
                                                            borderRadius: '12px',
                                                            border: 'none',
                                                            color: '#1e293b',
                                                            fontWeight: 600,
                                                            fontSize: '0.9375rem',
                                                            outline: 'none'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}

                                        {(!formData.isScheduled || scheduleMatch) && (
                                            <button
                                                type="button" // Changed from submit to button as per original
                                                onClick={addVisitor} // Added onClick as per original
                                                style={{
                                                    width: '100%',
                                                    padding: '1.25rem',
                                                    backgroundColor: 'var(--primary)',
                                                    color: '#fff',
                                                    borderRadius: '16px',
                                                    fontWeight: 800,
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.5rem',
                                                    boxShadow: '0 10px 20px -5px rgba(37, 99, 235, 0.4)'
                                                }}
                                            >
                                                {loading ? <Loader className="animate-spin" size={20} /> : (
                                                    <>
                                                        {t('kiosk.add_visitor_button')} <ArrowRight size={20} />
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>

                                    {formData.visitorType === 'Lyceum' && (
                                        <div style={{ position: 'relative' }}>
                                            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                            <input
                                                type="text"
                                                required
                                                placeholder="SBU / Branch"
                                                value={formData.sbu}
                                                onChange={(e) => setFormData({ ...formData, sbu: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    padding: '1rem 1rem 1rem 3rem',
                                                    backgroundColor: '#fff',
                                                    borderRadius: '12px',
                                                    border: 'none',
                                                    color: '#1e293b',
                                                    fontWeight: 600,
                                                    fontSize: '1rem',
                                                    outline: 'none'
                                                }}
                                            />
                                        </div>
                                    )}

                                    <div style={{ position: 'relative' }}>
                                        <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input
                                            type="text"
                                            required
                                            readOnly={!!scheduleMatch}
                                            placeholder={t('kiosk.host_placeholder')}
                                            value={formData.meetingWith || (scheduleMatch ? scheduleMatch.meeting_with : '')}
                                            onChange={(e) => setFormData({ ...formData, meetingWith: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: '1rem 1rem 1rem 3rem',
                                                backgroundColor: '#fff',
                                                borderRadius: '12px',
                                                border: 'none',
                                                color: '#1e293b',
                                                fontWeight: 600,
                                                fontSize: '1rem',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>

                                    <div style={{ position: 'relative' }}>
                                        <FileText size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input
                                            type="text"
                                            required
                                            readOnly={!!scheduleMatch}
                                            placeholder={t('kiosk.purpose_placeholder')}
                                            value={formData.purpose}
                                            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: '1rem 1rem 1rem 3rem',
                                                backgroundColor: '#fff',
                                                borderRadius: '12px',
                                                border: 'none',
                                                color: '#1e293b',
                                                fontWeight: 600,
                                                fontSize: '1rem',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        style={{
                                            width: '100%',
                                            padding: '1.25rem',
                                            background: formData.isScheduled ? 'var(--primary)' : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                                            color: '#fff',
                                            borderRadius: '14px',
                                            fontSize: '1.125rem',
                                            fontWeight: 800,
                                            border: 'none',
                                            cursor: 'pointer',
                                            marginTop: '1rem',
                                            boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            gap: '0.75rem'
                                        }}
                                    >
                                        {loading ? <Loader className="animate-spin" size={24} /> : (formData.isScheduled ? 'SUBMIT' : 'SCHEDULE A MEETING')}
                                    </button>
                                </div>
                            )}

                            {/* Utility Links matched to reference style */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '0 0.5rem',
                                fontSize: '0.8125rem',
                                fontWeight: 700,
                                color: 'rgba(255,255,255,0.4)'
                            }}>
                                <span onClick={() => step === 2 && !typeFromUrl && setStep(1)} style={{ cursor: step === 2 && !typeFromUrl ? 'pointer' : 'default' }}>
                                    {step === 2 && !typeFromUrl ? 'Change Profile' : ''}
                                </span>
                                <span
                                    onClick={() => onClose ? onClose() : navigate('/')}
                                    style={{ cursor: 'pointer', color: 'rgba(239, 68, 68, 0.6)' }}
                                >
                                    Cancel Entry
                                </span>
                            </div>
                        </form>
                    )}
                </div>

                <div style={{
                    marginTop: '3.5rem',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '0.75rem',
                    textAlign: 'center',
                    fontWeight: 600
                }}>
                    Copyright &copy; {new Date().getFullYear()} Nextgen Shield (Private) Limited. All rights reserved.
                </div>
            </div>
        </div>
    );
};

export default VisitorSelfCheckIn;

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AlertContext = createContext();

export const useAlerts = () => useContext(AlertContext);

export const AlertProvider = ({ children, user }) => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const generateSystemAlerts = useCallback(async () => {
        if (!user || !['Security Officer', 'Security HOD'].includes(user.role)) return;

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const currentTimeStr = now.toTimeString().slice(0, 5);

        try {
            // 1. Missing Logout Alert (Visitors) - Over 4 hours or after 6 PM
            const { data: visitors } = await supabase
                .from('visitors')
                .select('*')
                .is('exit_time', null);

            if (visitors) {
                for (const v of visitors) {
                    const entryTime = new Date(v.entry_time);
                    const hoursStayed = (now - entryTime) / (1000 * 60 * 60);
                    const isAfter6PM = now.getHours() >= 18;

                    if (hoursStayed > 4 || isAfter6PM) {
                        const { data: existing } = await supabase
                            .from('alerts')
                            .select('id')
                            .eq('source_id', v.id)
                            .eq('category', 'Missing Logout')
                            .gt('created_at', todayStr)
                            .maybeSingle();

                        if (!existing) {
                            await supabase.from('alerts').insert({
                                type: 'Visitor',
                                category: 'Missing Logout',
                                severity: hoursStayed > 6 ? 'critical' : 'warning',
                                source_id: v.id,
                                title: 'Missing Logout Alert',
                                message: 'Visitor has not logged out from the premises.',
                                details: {
                                    name: v.name,
                                    category: v.category,
                                    nic: v.nic,
                                    entry_time: v.entry_time,
                                    stay_duration: Math.round(hoursStayed)
                                }
                            });
                        }
                    }
                }
            }

            // 2. Overstay Alert (Meetings) - Meeting end_time passed without completion
            const { data: meetings } = await supabase
                .from('scheduled_meetings')
                .select('*')
                .eq('meeting_date', todayStr)
                .eq('status', 'Scheduled')
                .lt('end_time', currentTimeStr);

            if (meetings) {
                for (const m of meetings) {
                    const { data: existing } = await supabase
                        .from('alerts')
                        .select('id')
                        .eq('source_id', m.id)
                        .eq('category', 'Overstay')
                        .maybeSingle();

                    if (!existing) {
                        await supabase.from('alerts').insert({
                            type: 'Meeting',
                            category: 'Overstay',
                            severity: 'warning',
                            source_id: m.id,
                            title: 'Overstay Alert',
                            message: 'Visitor has exceeded the scheduled meeting duration.',
                            details: {
                                name: m.visitor_name,
                                meeting_with: m.meeting_with,
                                purpose: m.purpose,
                                end_time: m.end_time,
                                date: m.meeting_date
                            }
                        });
                    }
                }
            }

            // 3. Missing Logout Alert (Vehicles)
            const { data: vehicles } = await supabase
                .from('vehicle_entries')
                .select('*')
                .is('exit_time', null);

            if (vehicles) {
                for (const v of vehicles) {
                    const entryTime = new Date(v.entry_time);
                    const hoursStayed = (now - entryTime) / (1000 * 60 * 60);

                    if (hoursStayed > 4) {
                        const { data: existing } = await supabase
                            .from('alerts')
                            .select('id')
                            .eq('source_id', v.id)
                            .eq('category', 'Missing Logout')
                            .gt('created_at', todayStr)
                            .maybeSingle();

                        if (!existing) {
                            await supabase.from('alerts').insert({
                                type: 'Vehicle',
                                category: 'Missing Logout',
                                severity: 'warning',
                                source_id: v.id,
                                title: 'Missing Logout Alert',
                                message: 'Vehicle has not logged out from the premises.',
                                details: {
                                    vehicle_number: v.vehicle_number,
                                    entry_time: v.entry_time,
                                    stay_duration: Math.round(hoursStayed)
                                }
                            });
                        }
                    }
                }
            }
        } catch (err) {
            if (err.code === 'PGRST204' || err.message?.includes('alerts')) {
                console.warn('System Alerts: alerts table is missing. Run supabase_alerts_setup.sql to enable.');
            } else {
                console.error('System Alert Generation Error:', err);
            }
        }
    }, [user]);

    const fetchAlerts = useCallback(async () => {
        if (!user || !['Security Officer', 'Security HOD'].includes(user.role)) {
            setAlerts([]);
            setUnreadCount(0);
            return;
        }

        setLoading(true);
        try {
            await generateSystemAlerts();

            const { data, error } = await supabase
                .from('alerts')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            setAlerts(data || []);
            setUnreadCount((data || []).filter(a => !a.is_read).length);
        } catch (err) {
            if (err.code === 'PGRST204' || err.message?.includes('alerts')) {
                console.warn('System Alerts: alerts table is missing. Run supabase_alerts_setup.sql.');
                setAlerts([]);
                setUnreadCount(0);
            } else {
                console.error('Error fetching alerts:', err);
            }
        } finally {
            setLoading(false);
        }
    }, [user, generateSystemAlerts]);

    const markAsRead = async (alertId) => {
        try {
            const { error } = await supabase
                .from('alerts')
                .update({ is_read: true })
                .eq('id', alertId);

            if (error) throw error;
            fetchAlerts();
        } catch (err) {
            console.error('Error marking alert as read:', err);
        }
    };

    useEffect(() => {
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 60000 * 5); // Check every 5 minutes
        return () => clearInterval(interval);
    }, [fetchAlerts]);

    return (
        <AlertContext.Provider value={{ alerts, unreadCount, markAsRead, fetchAlerts, loading }}>
            {children}
        </AlertContext.Provider>
    );
};

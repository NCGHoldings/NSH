import { supabase } from './supabase';

/**
 * Records an action in the audit_logs table
 * @param {string} action - The action being performed (e.g., 'Login', 'Approve Visitor')
 * @param {string} tableName - The table being affected (optional)
 * @param {string} recordId - The ID of the affected record (optional)
 * @param {string} userId - The email/ID of the user performing the action
 * @param {object} details - Additional JSON details (optional)
 */
export const logAudit = async (action, tableName, recordId, userId, details = {}) => {
    try {
        const { error } = await supabase
            .from('audit_logs')
            .insert({
                action,
                table_name: tableName,
                record_id: recordId,
                user_id: userId,
                details,
                timestamp: new Date().toISOString()
            });

        if (error) {
            console.error('Audit log error:', error);
        }
    } catch (err) {
        console.error('Unexpected audit log error:', err);
    }
};

import { supabase } from '../config/supabase';
import logger from '../config/logger';

export type AuditAction =
  | 'payment.create'
  | 'payment.refund'
  | 'inventory.update'
  | 'inventory.add'
  | 'inventory.remove'
  | 'inventory.sale'
  | 'inventory.restore'
  | 'inventory.purchase_flow'
  | 'visit.create'
  | 'patient.create'
  | 'patient.update'
  | 'staff.create'
  | 'staff.delete';

interface AuditEntry {
  clinic_id: string;
  user_id: string;
  action: AuditAction;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, any>;
}

/**
 * Log a critical action to the audit_logs table.
 * This is called from services for critical operations.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        clinic_id: entry.clinic_id,
        user_id: entry.user_id,
        action: entry.action,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id || null,
        details: entry.details || {},
        created_at: new Date().toISOString(),
      });

    if (error) {
      logger.error({ error, entry }, 'Failed to write audit log');
    }
  } catch (err) {
    // Audit log failure should never break the main flow
    logger.error({ err, entry }, 'Audit logging exception');
  }
}

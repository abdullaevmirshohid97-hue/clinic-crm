import { supabase } from '../../config/supabase';
import { UserPayload } from '../../types/express';
import { logAudit } from '../../middleware/audit.middleware';
import { assertRole } from '../../middleware/rbac.middleware';

export class PharmacyRecoveryService {
  /**
   * Fetch recent audit logs for a specific medicine to find snapshots.
   */
  static async getHistory(clinicId: string, medicineId: string) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('entity_type', 'pharmacy_inventory')
      .eq('entity_id', medicineId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data;
  }

  /**
   * Restore a medicine to a previous snapshot state.
   */
  static async restoreSnapshot(user: UserPayload, logId: string) {
    assertRole(user.role, 'admin', 'super_admin'); // Only high-level admins

    // 1. Get the audit log entry
    const { data: logEntry, error: logError } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('id', logId)
      .eq('clinic_id', user.clinic_id)
      .single();

    if (logError || !logEntry || !logEntry.details?.before) {
      throw new Error('Snapshot not found or invalid');
    }

    const snapshot = logEntry.details.before;
    const medicineId = logEntry.entity_id;

    // 2. Apply rollback strictly replacing the row with snapshot data
    const { data: restored, error: updateError } = await supabase
      .from('pharmacy_inventory')
      .update({
        name: snapshot.name,
        category: snapshot.category,
        quantity: snapshot.quantity,
        unit: snapshot.unit,
        price: snapshot.price,
        expiry_date: snapshot.expiry_date,
        batch_number: snapshot.batch_number,
        is_deleted: snapshot.is_deleted || false
      })
      .eq('id', medicineId)
      .eq('clinic_id', user.clinic_id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    // 3. Document the restoration
    await logAudit({
      clinic_id: user.clinic_id,
      user_id: user.id,
      action: 'inventory.restore',
      entity_type: 'pharmacy_inventory',
      entity_id: medicineId,
      details: { reason: `Restored from log ${logId}`, previous_log_id: logId, before: logEntry.details.after, after: snapshot },
    });

    return restored;
  }
}

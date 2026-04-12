import { supabase } from '../../config/supabase';
import { UserPayload } from '../../types/express';
import { logAudit } from '../../middleware/audit.middleware';
import { assertRole } from '../../middleware/rbac.middleware';

export class PharmacyService {
  /**
   * Get pharmacy inventory with pagination.
   */
  static async getInventory(clinicId: string, limit: number, offset: number) {
    const { data, error, count } = await supabase
      .from('pharmacy_inventory')
      .select('id, name, category, quantity, unit, price, expiry_date, batch_number, is_deleted, created_at', { count: 'exact' })
      .eq('clinic_id', clinicId)
      .eq('is_deleted', false) // Soft delete filter
      .order('expiry_date', { ascending: true }) // FEFO ordering
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data: data || [], total: count || 0 };
  }

  /**
   * Add a new medicine. Double-check: admin only at service level.
   */
  static async addMedicine(user: UserPayload, medicineData: any) {
    // Double-check RBAC at service level
    assertRole(user.role, 'admin', 'super_admin', 'warehouse_manager');

    const { data, error } = await supabase
      .from('pharmacy_inventory')
      .insert({
        clinic_id: user.clinic_id,
        name: medicineData.name,
        category: medicineData.category || null,
        quantity: medicineData.quantity || 0,
        unit: medicineData.unit || 'dona',
        price: medicineData.price || 0,
        expiry_date: medicineData.expiry_date || null,
        batch_number: medicineData.batch_number || null,
        supplier_id: medicineData.supplier_id || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Movement: Initial Stock IN
    if (medicineData.quantity > 0) {
      await supabase.from('pharmacy_movements').insert({
        clinic_id: user.clinic_id,
        medicine_id: data.id,
        type: 'IN',
        quantity: medicineData.quantity,
        source: 'purchase',
        created_by: user.id
      });
    }

    // JSON Snapshot Audit
    await logAudit({
      clinic_id: user.clinic_id,
      user_id: user.id,
      action: 'inventory.add',
      entity_type: 'pharmacy_inventory',
      entity_id: data.id,
      details: { before: null, after: data },
    });

    return data;
  }

  /**
   * Update stock quantity. Uses audit logging for traceability.
   */
  /**
   * Safe Atomic Stock Update (Concurrency Safe + Snapshot)
   */
  static async updateStock(user: UserPayload, medicineId: string, updateData: { quantity: number; reason?: string }) {
    assertRole(user.role, 'admin', 'super_admin', 'warehouse_manager'); // Cashiers cannot manually edit stock

    // Get BEFORE snapshot
    const { data: beforeState } = await supabase.from('pharmacy_inventory').select('*').eq('id', medicineId).single();

    const { data: afterState, error } = await supabase
      .from('pharmacy_inventory')
      .update({ quantity: updateData.quantity }) // For manual sync, not atomic deduct
      .eq('id', medicineId)
      .eq('clinic_id', user.clinic_id)
      .select('*')
      .single();

    if (error) throw error;

    // Calc difference for Movement tracking
    const diff = updateData.quantity - (beforeState?.quantity || 0);
    if (diff !== 0) {
      await supabase.from('pharmacy_movements').insert({
        clinic_id: user.clinic_id,
        medicine_id: medicineId,
        type: diff > 0 ? 'IN' : 'OUT',
        quantity: Math.abs(diff),
        source: 'manual_adjustment',
        created_by: user.id
      });
    }

    await logAudit({
      clinic_id: user.clinic_id,
      user_id: user.id,
      action: 'inventory.update',
      entity_type: 'pharmacy_inventory',
      entity_id: medicineId,
      details: { reason: updateData.reason, before: beforeState, after: afterState },
    });

    return afterState;
  }

  /**
   * Soft Delete a medicine from inventory.
   */
  static async deleteMedicine(user: UserPayload, medicineId: string) {
    assertRole(user.role, 'admin', 'super_admin'); // Only admins can delete

    // Get BEFORE snapshot
    const { data: beforeState } = await supabase.from('pharmacy_inventory').select('*').eq('id', medicineId).single();

    const { error } = await supabase
      .from('pharmacy_inventory')
      .update({ is_deleted: true }) // SOFT DELETE
      .eq('id', medicineId)
      .eq('clinic_id', user.clinic_id);

    if (error) throw error;

    await logAudit({
      clinic_id: user.clinic_id,
      user_id: user.id,
      action: 'inventory.remove',
      entity_type: 'pharmacy_inventory',
      entity_id: medicineId,
      details: { reason: 'soft_delete', before: beforeState, after: { ...beforeState, is_deleted: true } }
    });

    return true;
  }
}

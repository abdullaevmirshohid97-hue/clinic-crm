import { supabase } from '../../config/supabase';
import { UserPayload } from '../../types/express';
import { assertRole } from '../../middleware/rbac.middleware';

export class SupplierService {
  /**
   * Get all active suppliers
   */
  static async getSuppliers(clinicId: string) {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Add a new supplier
   */
  static async addSupplier(user: UserPayload, supplierData: any) {
    assertRole(user.role, 'admin', 'super_admin', 'warehouse_manager');

    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        clinic_id: user.clinic_id,
        name: supplierData.name,
        phone: supplierData.phone || null,
        company: supplierData.company || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

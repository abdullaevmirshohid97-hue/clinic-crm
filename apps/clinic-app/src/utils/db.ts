import { supabase } from './supabase';
import { authStore } from '../app/store';

/**
 * DB abstraction layer for Clinic CRM SaaS.
 * All calls are routed through Supabase with Clinic isolation.
 */
export const db = {
  normalizeError: (err: unknown) => {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    if (err && typeof err === 'object') {
      const maybeMessage = (err as { message?: unknown }).message;
      const maybeDetails = (err as { details?: unknown }).details;
      const maybeHint = (err as { hint?: unknown }).hint;
      return [maybeMessage, maybeDetails, maybeHint]
        .filter((v): v is string => typeof v === 'string' && v.length > 0)
        .join(' | ') || JSON.stringify(err);
    }
    return 'Unknown database error';
  },
  getContext: () => {
    const clinicId = authStore.clinicId;
    if (!clinicId) {
      console.warn('DB Action attempted without active clinic session');
      return null;
    }
    return clinicId;
  },

  getAll: async (table: string, options?: { orderBy?: string; ascending?: boolean }) => {
    try {
      const clinicId = db.getContext();
      let query = supabase.from(table).select('*');
      
      if (clinicId) {
        query = query.eq('clinic_id', clinicId);
      }
      
      const orderField = options?.orderBy || 'created_at';
      const { data, error } = await query.order(orderField, { ascending: options?.ascending ?? false });
      
      if (error) throw error;
      return { success: true, data };
    } catch (err: unknown) {
      const errorText = db.normalizeError(err);
      console.error(`DB GetAll Error (${table}):`, errorText, err);
      return { success: false, error: errorText };
    }
  },

  getOne: async (table: string, id: string) => {
    try {
      const clinicId = db.getContext();
      let query = supabase.from(table).select('*').eq('id', id);
      
      if (clinicId) {
        query = query.eq('clinic_id', clinicId);
      }
      
      const { data, error } = await query.single();
      if (error) throw error;
      return { success: true, data };
    } catch (err: unknown) {
      const errorText = db.normalizeError(err);
      console.error(`DB GetOne Error (${table}, ${id}):`, errorText, err);
      return { success: false, error: errorText };
    }
  },

  getWhere: async (table: string, conditions: Record<string, any>, options?: { orderBy?: string; ascending?: boolean; limit?: number }) => {
    try {
      const clinicId = db.getContext();
      let query = supabase.from(table).select('*');
      
      if (clinicId) {
        query = query.eq('clinic_id', clinicId);
      }
      
      for (const [key, value] of Object.entries(conditions)) {
        query = query.eq(key, value);
      }
      
      if (options?.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending ?? false });
      }
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data };
    } catch (err: unknown) {
      const errorText = db.normalizeError(err);
      console.error(`DB GetWhere Error (${table}):`, errorText, err);
      return { success: false, error: errorText };
    }
  },

  insert: async (table: string, data: any) => {
    try {
      const clinicId = db.getContext();
      const payload = Array.isArray(data) ? data : [data];
      
      const itemsToInsert = payload.map(item => ({
        ...item,
        clinic_id: item.clinic_id || clinicId,
        created_at: new Date().toISOString()
      }));

      const { data: inserted, error } = await supabase
        .from(table)
        .insert(itemsToInsert)
        .select();

      if (error) throw error;
      return { success: true, data: Array.isArray(data) ? inserted : inserted?.[0] };
    } catch (err: unknown) {
      const errorText = db.normalizeError(err);
      console.error(`DB Insert Error (${table}):`, errorText, err);
      return { success: false, error: errorText };
    }
  },

  update: async (table: string, id: string, data: any) => {
    try {
      const clinicId = db.getContext();

      let query = supabase.from(table).update(data).eq('id', id);
      
      if (clinicId) {
        query = query.eq('clinic_id', clinicId);
      }

      const { data: updated, error } = await query.select().single();
      if (error) throw error;
      return { success: true, data: updated };
    } catch (err: unknown) {
      const errorText = db.normalizeError(err);
      console.error(`DB Update Error (${table}, ${id}):`, errorText, err);
      return { success: false, error: errorText };
    }
  },

  delete: async (table: string, id: string) => {
    try {
      const clinicId = db.getContext();

      let query = supabase.from(table).delete().eq('id', id);
      
      if (clinicId) {
        query = query.eq('clinic_id', clinicId);
      }

      const { error } = await query;
      if (error) throw error;
      return { success: true };
    } catch (err: unknown) {
      const errorText = db.normalizeError(err);
      console.error(`DB Delete Error (${table}, ${id}):`, errorText, err);
      return { success: false, error: errorText };
    }
  },

  // Get active shift
  async getActiveShift() {
    const clinicId = db.getContext();
    if (!clinicId) return null;
    
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('status', 'active')
      .order('opened_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error) return null;
    return data;
  },

  // Get settings as key-value object
  async getSettings() {
    const clinicId = db.getContext();
    if (!clinicId) return {};
    
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .eq('clinic_id', clinicId);
    
    if (error) return {};
    
    const settings: Record<string, string> = {};
    (data || []).forEach(row => {
      settings[row.key] = row.value;
    });
    return settings;
  },

  async setSetting(key: string, value: string) {
    const clinicId = db.getContext();
    if (!clinicId) return { success: false, error: 'No clinic context' };
    
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ clinic_id: clinicId, key, value }, { onConflict: 'clinic_id,key' });
      
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async getSetting(key: string) {
    const clinicId = db.getContext();
    if (!clinicId) return null;
    
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('clinic_id', clinicId)
      .eq('key', key)
      .single();
    
    return data?.value || null;
  },

  // Get doctors (users with role='doctor')
  async getDoctors() {
    const clinicId = db.getContext();
    if (!clinicId) return [];
    
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, prefix, specialty, is_active')
      .eq('clinic_id', clinicId)
      .eq('role', 'doctor')
      .eq('is_active', true)
      .order('full_name');
    
    if (error) return [];
    
    return (data || []).map(d => ({
      id: d.id,
      fullName: d.full_name,
      prefix: d.prefix,
      specialty: d.specialty,
      isActive: d.is_active ? 1 : 0
    }));
  },

  // Get patients
  async getPatients(options?: { search?: string; limit?: number }) {
    const clinicId = db.getContext();
    if (!clinicId) return [];
    
    let query = supabase
      .from('patients')
      .select('id, full_name, phone, birth_date, gender')
      .eq('clinic_id', clinicId)
      .order('full_name');
    
    if (options?.search) {
      query = query.ilike('full_name', `%${options.search}%`);
    }
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    const { data, error } = await query;
    if (error) return [];
    
    return (data || []).map(p => ({
      id: p.id,
      fullName: p.full_name,
      phone: p.phone,
      birthDate: p.birth_date,
      gender: p.gender
    }));
  },

  // Deprecated: raw SQL not supported
  async query(sql: string, _params?: any[]) {
    console.warn("Raw SQL not supported. Use db.getAll, db.getWhere, etc. SQL:", sql);
    return [];
  },

  async run(sql: string, _params?: any[]) {
    console.warn("Raw SQL not supported. Use db.insert, db.update, etc. SQL:", sql);
    return [];
  },

  // Helper methods for backward compatibility
  async insertReturn(table: string, data: any) {
    const res = await this.insert(table, data);
    if (!res.success) throw new Error(res.error || 'Insert failed');
    return res.data;
  },

  async getAllRows(table: string) {
    const res = await this.getAll(table);
    if (!res.success) throw new Error(res.error || 'GetAll failed');
    return Array.isArray(res.data) ? res.data : [];
  },
};

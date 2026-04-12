import { supabase } from './supabase';
import { authStore } from '../app/store';

/**
 * DB abstraction layer for Clary SaaS.
 * All calls are strictly routed through Supabase with Clinic isolation.
 */
export const db = {
  // Check if we have a valid session and clinic context
  getContext: () => {
    const user = authStore.user;
    if (!user || !user.clinicId) {
      console.warn('DB Action attempted without active clinic session');
      return null;
    }
    return user.clinicId;
  },

  // Mock DB logic strictly for DEV offline testing
  _getMockData(table) {
    try { return JSON.parse(localStorage.getItem(`mock_db_${table}`) || '[]'); } catch { return []; }
  },
  _setMockData(table, data) {
    localStorage.setItem(`mock_db_${table}`, JSON.stringify(data));
  },

  getAll: async (table) => {
    try {
      const clinicId = db.getContext();

      // Dev Mode Offline Fallback
      if (clinicId === 'mock-clinic-id' && import.meta.env.DEV) {
        const rows = db._getMockData(table).sort((a,b) => b.id - a.id);
        return { success: true, data: rows };
      }

      let query = supabase.from(table).select('*');
      
      if (clinicId) {
        query = query.eq('clinic_id', clinicId);
      }
      
      const { data, error } = await query.order('id', { ascending: false });
      
      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error(`DB GetAll Error (${table}):`, err);
      return { success: false, error: err.message };
    }
  },

  insert: async (table, data) => {
    try {
      const clinicId = db.getContext();
      const payload = Array.isArray(data) ? data : [data];
      
      const itemsToInsert = payload.map(item => ({
        ...item,
        clinic_id: item.clinic_id || clinicId,
        created_at: new Date().toISOString()
      }));

      // Dev Mode Offline Fallback
      if (clinicId === 'mock-clinic-id' && import.meta.env.DEV) {
        const currentData = db._getMockData(table);
        const nextId = currentData.length ? Math.max(...currentData.map(c => c.id || 0)) + 1 : 1;
        const mapped = itemsToInsert.map((item, idx) => ({ ...item, id: nextId + idx }));
        db._setMockData(table, [...currentData, ...mapped]);
        return { success: true, data: Array.isArray(data) ? mapped : mapped[0] };
      }

      const { data: inserted, error } = await supabase
        .from(table)
        .insert(itemsToInsert)
        .select();

      if (error) throw error;
      return { success: true, data: Array.isArray(data) ? inserted : inserted[0] };
    } catch (err) {
      console.error(`DB Insert Error (${table}):`, err);
      return { success: false, error: err.message };
    }
  },

  update: async (table, id, data) => {
    try {
      const clinicId = db.getContext();

      // Dev Mode Offline Fallback
      if (clinicId === 'mock-clinic-id' && import.meta.env.DEV) {
        const currentData = db._getMockData(table);
        const updatedData = currentData.map(item => String(item.id) === String(id) ? { ...item, ...data } : item);
        db._setMockData(table, updatedData);
        return { success: true };
      }

      const { error } = await supabase
        .from(table)
        .update(data)
        .eq('id', id)
        .eq('clinic_id', clinicId); // Double check isolation

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error(`DB Update Error (${table}, ${id}):`, err);
      return { success: false, error: err.message };
    }
  },

  delete: async (table, id) => {
    try {
      const clinicId = db.getContext();

      // Dev Mode Offline Fallback
      if (clinicId === 'mock-clinic-id' && import.meta.env.DEV) {
        const currentData = db._getMockData(table);
        const filteredData = currentData.filter(item => String(item.id) !== String(id));
        db._setMockData(table, filteredData);
        return { success: true };
      }

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('clinic_id', clinicId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error(`DB Delete Error (${table}, ${id}):`, err);
      return { success: false, error: err.message };
    }
  },

  // Minimal implementation for SQL queries (unsupported in SaaS)
  async query(sql) {
    console.warn("Supabase does not support raw SQL from client. Ignored SQL:", sql);
    return [];
  },

  async run(sql) {
    return this.query(sql);
  },

  async setSetting(key, value) {
    const clinicId = db.getContext();
    if (clinicId === 'mock-clinic-id' && import.meta.env.DEV) {
      const dbSettings = db._getMockData('settings');
      const idx = dbSettings.findIndex(s => s.key === key);
      if (idx > -1) dbSettings[idx].value = value;
      else dbSettings.push({ id: Date.now() + Math.random(), clinic_id: clinicId, key, value });
      db._setMockData('settings', dbSettings);
      return { success: true };
    }
    
    try {
      const { error } = await supabase.from('settings').upsert({ clinic_id: clinicId, key, value }, { onConflict: 'clinic_id,key' });
      if (error) throw error;
      return { success: true };
    } catch(e) {
      // Fallback update explicitly if upsert fails
      try {
         const { data } = await supabase.from('settings').select('id').eq('clinic_id', clinicId).eq('key', key).single();
         if (data) await supabase.from('settings').update({ value }).eq('id', data.id);
         else await supabase.from('settings').insert({ clinic_id: clinicId, key, value });
         return { success: true };
      } catch(e2) {
         return { success: false, error: e2.message };
      }
    }
  },

  async insertReturn(table, data) {
    const res = await this.insert(table, data);
    if (!res.success) throw new Error(res.error || 'Insert failed');
    return res.data;
  },

  async getAllRows(table) {
    const res = await this.getAll(table);
    if (!res.success) throw new Error(res.error || 'GetAll failed');
    return Array.isArray(res.data) ? res.data : [];
  },
};

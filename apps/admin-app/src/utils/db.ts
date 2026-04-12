import { supabase } from './supabase';

export const db = {
  // Mock DB logic strictly for DEV offline testing
  _getMockData(table: string) {
    try { return JSON.parse(localStorage.getItem(`mock_db_${table}`) || '[]'); } catch { return []; }
  },
  _setMockData(table: string, data: any) {
    localStorage.setItem(`mock_db_${table}`, JSON.stringify(data));
  },

  getAll: async (table: string) => {
    try {
      if (import.meta.env.DEV && !localStorage.getItem('admin_use_real_db')) {
        const rows = db._getMockData(table); // sort string IDs is tricky, but let's just return
        
        // Seed mock clinics if empty
        if (table === 'clinics' && rows.length === 0) {
          const seeds = [
            { id: '1', name: 'Shifo Nur', slug: 'shifonur', status: 'active', modules: { pharmacy: true, inpatient: true, finance: true, lab: false }, created_at: new Date().toISOString() }, 
            { id: '2', name: 'Med City', slug: 'medcity', status: 'trial', modules: { pharmacy: false, inpatient: false, finance: false, lab: false }, created_at: new Date().toISOString() },
            { id: '3', name: 'Family Clinic', slug: 'family', status: 'blocked', modules: { pharmacy: true, inpatient: false, finance: false, lab: true }, created_at: new Date().toISOString() }
          ];
          db._setMockData(table, seeds);
          return { success: true, data: seeds };
        }
        
        return { success: true, data: rows };
      }

      const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  },

  update: async (table: string, id: string, data: any) => {
    try {
      if (import.meta.env.DEV && !localStorage.getItem('admin_use_real_db')) {
        const currentData = db._getMockData(table);
        const updatedData = currentData.map((item:any) => String(item.id) === String(id) ? { ...item, ...data } : item);
        db._setMockData(table, updatedData);
        return { success: true };
      }

      const { error } = await supabase.from(table).update(data).eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
};

import { supabase } from './supabase';

export const db = {
  run: async (sql, params) => {
    console.error("Supabase does not support raw SQL from client. Please rewrite this query:", sql);
    return { success: false, error: "Raw SQL not supported" };
  },

  getAll: async (table) => {
    try {
      const { data, error } = await supabase.from(table).select('*').order('id', { ascending: false });
      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  insert: async (table, data) => {
    try {
      // Supabase JS does not return the inserted data automatically in v2 unless we call .select()
      const { data: inserted, error } = await supabase.from(table).insert([data]).select().single();
      if (error) throw error;
      return { success: true, data: inserted };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (table, id, data) => {
    try {
      const { error } = await supabase.from(table).update(data).eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (table, id) => {
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async query(sql, params = []) {
    console.error("Supabase does not support raw SQL from client. Please rewrite this query:", sql);
    console.error("Params:", params);
    // Return empty array to not crash the app, but log error
    return [];
  },

  async insertReturn(table, data) {
    const res = await this.insert(table, data);
    if (!res.success) throw new Error(res.error);
    return res.data;
  },

  async getAllRows(table) {
    const res = await this.getAll(table);
    if (!res.success) throw new Error(res.error);
    return Array.isArray(res.data) ? res.data : [];
  },
};

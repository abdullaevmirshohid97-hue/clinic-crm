import { supabase } from './supabase';
import { authStore } from '../app/store';

/**
 * Generic row returned from Supabase — values are dynamic JSON so typed as `any`.
 * Callers that know the shape can use the typed generics: db.getAllRows<MyType>(table).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbRow = Record<string, any>;

type DbResult<T> = { success: true; data: T } | { success: false; error: string };
type DbSimpleResult = { success: true } | { success: false; error: string };

/**
 * DB abstraction layer for Clary SaaS.
 * All calls are strictly routed through Supabase with Clinic isolation.
 */
export const db = {
  getContext: () => {
    const clinicId = authStore.clinicId;
    if (!clinicId) {
      console.warn('DB Action attempted without active clinic session');
      return null;
    }
    return clinicId;
  },

  getAll: async <T extends DbRow = DbRow>(table: string): Promise<DbResult<T[]>> => {
    try {
      const clinicId = db.getContext();

      let query = supabase.from(table).select('*');

      if (clinicId) {
        query = query.eq('clinic_id', clinicId);
      }

      const { data, error } = await query.order('id', { ascending: false });

      if (error) throw error;
      return { success: true, data: (data ?? []) as T[] };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`DB GetAll Error (${table}):`, err);
      return { success: false, error: msg };
    }
  },

  insert: async <T extends DbRow = DbRow>(
    table: string,
    data: DbRow | DbRow[]
  ): Promise<DbResult<T | T[]>> => {
    try {
      const clinicId = db.getContext();
      const payload = Array.isArray(data) ? data : [data];

      const itemsToInsert = payload.map((item) => ({
        ...item,
        clinic_id: item['clinic_id'] ?? clinicId,
        created_at: new Date().toISOString(),
      }));

      const { data: inserted, error } = await supabase.from(table).insert(itemsToInsert).select();

      if (error) throw error;
      const result = (inserted ?? []) as T[];
      return { success: true, data: Array.isArray(data) ? result : result[0] };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`DB Insert Error (${table}):`, err);
      return { success: false, error: msg };
    }
  },

  update: async (table: string, id: number | string, data: DbRow): Promise<DbSimpleResult> => {
    try {
      const clinicId = db.getContext();

      const { error } = await supabase
        .from(table)
        .update(data)
        .eq('id', id)
        .eq('clinic_id', clinicId);

      if (error) throw error;
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`DB Update Error (${table}, ${id}):`, err);
      return { success: false, error: msg };
    }
  },

  delete: async (table: string, id: number | string): Promise<DbSimpleResult> => {
    try {
      const clinicId = db.getContext();

      const { error } = await supabase.from(table).delete().eq('id', id).eq('clinic_id', clinicId);

      if (error) throw error;
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`DB Delete Error (${table}, ${id}):`, err);
      return { success: false, error: msg };
    }
  },

  async query<T extends DbRow = DbRow>(sql: string, _params?: unknown[]): Promise<T[]> {
    console.warn('Supabase does not support raw SQL from client. Ignored SQL:', sql);
    return [] as T[];
  },

  async run<T extends DbRow = DbRow>(sql: string, _params?: unknown[]): Promise<T[]> {
    return this.query<T>(sql);
  },

  async setSetting(key: string, value: string | number | boolean | null): Promise<DbSimpleResult> {
    const clinicId = db.getContext();
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ clinic_id: clinicId, key, value }, { onConflict: 'clinic_id,key' });
      if (error) throw error;
      return { success: true };
    } catch (e: unknown) {
      try {
        const { data } = await supabase
          .from('settings')
          .select('id')
          .eq('clinic_id', clinicId)
          .eq('key', key)
          .single();
        if (data)
          await supabase
            .from('settings')
            .update({ value })
            .eq('id', (data as DbRow)['id']);
        else await supabase.from('settings').insert({ clinic_id: clinicId, key, value });
        return { success: true };
      } catch (e2: unknown) {
        const msg = e2 instanceof Error ? e2.message : String(e2);
        return { success: false, error: msg };
      }
    }
  },

  async insertReturn<T extends DbRow = DbRow>(table: string, data: DbRow): Promise<T> {
    const res = await this.insert<T>(table, data);
    if (!res.success) throw new Error(res.error || 'Insert failed');
    return res.data as T;
  },

  async getAllRows<T extends DbRow = DbRow>(table: string): Promise<T[]> {
    const res = await this.getAll<T>(table);
    if (!res.success) throw new Error(res.error || 'GetAll failed');
    return Array.isArray(res.data) ? res.data : [];
  },
};

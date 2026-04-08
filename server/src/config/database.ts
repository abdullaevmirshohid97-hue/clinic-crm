import { createClient } from '@supabase/supabase-js';
import { env } from './env';
import { logger } from './logger';

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const supabaseAdmin = env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : supabase;

/**
 * Returns a query builder scoped to the given clinic_id.
 * All queries MUST include clinic_id to enforce RLS.
 */
export function clinicQuery(clinicId: string) {
  return {
    select: <T extends string>(table: T, columns = '*') =>
      supabase.from(table).select(columns).eq('clinic_id', clinicId),

    insert: <T extends string>(table: T, data: Record<string, unknown> | Record<string, unknown>[]) => {
      const records = Array.isArray(data) ? data : [data];
      const withClinicId = records.map((r) => ({ ...r, clinic_id: clinicId }));
      return supabase.from(table).insert(withClinicId);
    },

    update: <T extends string>(table: T, data: Record<string, unknown>) =>
      supabase.from(table).update(data).eq('clinic_id', clinicId),

    delete: <T extends string>(table: T) =>
      supabase.from(table).delete().eq('clinic_id', clinicId),

    rpc: (fn: string, params: Record<string, unknown> = {}) =>
      supabase.rpc(fn, { ...params, p_clinic_id: clinicId }),
  };
}

logger.info({ url: env.SUPABASE_URL }, 'Supabase client initialized');

import { supabase } from '../config/database';
import { NotFoundError } from '../utils/errors';
import { Clinic } from '../types';

export async function getClinic(clinicId: string): Promise<Clinic> {
  const { data, error } = await supabase
    .from('clinics')
    .select('*')
    .eq('id', clinicId)
    .single();

  if (error || !data) {
    throw new NotFoundError('Clinic');
  }

  return data as Clinic;
}

export async function updateClinic(
  clinicId: string,
  updates: Partial<Pick<Clinic, 'name' | 'phone' | 'address'>>,
): Promise<Clinic> {
  const { data, error } = await supabase
    .from('clinics')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', clinicId)
    .select()
    .single();

  if (error || !data) {
    throw new NotFoundError('Clinic');
  }

  return data as Clinic;
}

import { supabase } from '../config/supabase';
import logger from '../config/logger';

export class UserService {
  static async getAllStaff(clinicId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async addStaff(clinicId: string, staffData: { email: string; full_name: string; role: string }) {
    // 1. Create user in Supabase Auth
    // In a real SaaS, you'd use admin API or invitation flow
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: staffData.email,
      password: 'InitialPassword123!', // Should be changed or sent via email
      email_confirm: true,
      user_metadata: { full_name: staffData.full_name }
    });

    if (authError) throw authError;

    // 2. Create profile in public.users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        clinic_id: clinicId,
        full_name: staffData.full_name,
        role: staffData.role,
        is_active: true
      })
      .select()
      .single();

    if (profileError) throw profileError;
    return profile;
  }

  static async updateStaff(id: string, clinicId: string, updateData: any) {
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .eq('clinic_id', clinicId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteStaff(id: string, clinicId: string) {
    // Delete from profiles first, then auth (via service role)
    const { error: profileError } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .eq('clinic_id', clinicId);

    if (profileError) throw profileError;

    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    if (authError) throw authError;

    return true;
  }

  static async updateHeartbeat(userId: string) {
    const { error } = await supabase
      .from('users')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', userId);
    
    if (error) logger.error(error, 'Heartbeat Update Error');
  }
}

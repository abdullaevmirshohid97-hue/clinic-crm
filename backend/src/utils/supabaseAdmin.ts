import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin strictly using Service Role bypassing RLS solely for User Management
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Assigns Custom Claims via the raw App Metadata structure ensuring
 * future JWTs feature 'clinic_id' and 'role'. This completely bypasses
 * the need for backend lookups per-request on basic API calls.
 */
export async function assignUserToClinic(userId: string, clinicId: string, role: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        app_metadata: {
          clinic_id: clinicId,
          role: role
        }
      }
    );

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error(`Failed to assign user ${userId} to clinic ${clinicId}:`, error);
    throw error;
  }
}

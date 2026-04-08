import { supabase, supabaseAdmin } from '../config/database';
import { env } from '../config/env';
import { UnauthorizedError } from '../utils/errors';
import { logger } from '../config/logger';

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    clinic_id: string;
    role: string;
  };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error || !data.session || !data.user) {
    logger.warn({ email: input.email }, 'Login failed');
    throw new UnauthorizedError('Invalid email or password');
  }

  const clinicId = (data.user.user_metadata?.clinic_id as string) ?? '';
  const role = (data.user.user_metadata?.role as string) ?? 'receptionist';

  logger.info({ userId: data.user.id, clinicId }, 'User logged in');

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: {
      id: data.user.id,
      email: data.user.email ?? '',
      clinic_id: clinicId,
      role,
    },
  };
}

export async function refreshToken(token: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: token });

  if (error || !data.session || !data.user) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: {
      id: data.user.id,
      email: data.user.email ?? '',
      clinic_id: (data.user.user_metadata?.clinic_id as string) ?? '',
      role: (data.user.user_metadata?.role as string) ?? 'receptionist',
    },
  };
}

export async function logout(token: string): Promise<void> {
  if (env.SUPABASE_SERVICE_ROLE_KEY) {
    await supabaseAdmin.auth.admin.signOut(token);
  }
  // If service role key is not configured, token expiry handles session invalidation
}

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { ProfileWithRole, AppPermission } from '../types/clinic';

const ALL_FEATURES = [
  'dashboard', 'reception', 'queue', 'inpatient', 'laboratory',
  'pharmacy', 'cashier', 'journal', 'analytics', 'marketing',
  'archive', 'staff', 'subscription', 'settings',
];

const ROLE_FALLBACK_PERMISSIONS: Record<string, string[]> = {
  super_admin: ALL_FEATURES,
  admin:       ALL_FEATURES,
  doctor:      ['dashboard', 'reception', 'queue', 'inpatient', 'laboratory', 'pharmacy', 'archive'],
  cashier:     ['dashboard', 'reception', 'queue', 'cashier', 'journal', 'analytics', 'archive'],
};

/**
 * Clary SaaS Auth Store.
 * Powered by Supabase Auth + public.profiles (multi-tenant context).
 */

interface AuthState {
  user: User | null;
  session: Session | null;
  clinicId: string | null;
  role: string | null;
  permissions: string[];
  isLoading: boolean;
  isAuthenticated: boolean;
}

let _state: AuthState = {
  user: null,
  session: null,
  clinicId: null,
  role: null,
  permissions: [],
  isLoading: !isSupabaseConfigured ? false : true,
  isAuthenticated: false,
};

const _listeners = new Set<(state: AuthState) => void>();

function notify() {
  _listeners.forEach((fn) => fn({ ..._state }));
}

export const authStore = {
  get user() {
    return _state.user;
  },
  get clinicId() {
    return _state.clinicId;
  },
  get role() {
    return _state.role;
  },

  getState() {
    return { ..._state };
  },

  subscribe(fn: (state: AuthState) => void) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },

  async initialize() {
    if (!isSupabaseConfigured) return;

    _state.isLoading = true;
    notify();

    if (import.meta.env.DEV && typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const impId = searchParams.get('impersonate_clinic_id');
      if (impId) {
        console.warn('[DEV ONLY] Impersonation mode active for clinic:', impId);
        _state = {
          user: { id: 'impersonator', email: 'superadmin@localhost' } as User,
          session: { access_token: 'mock-token' } as Session,
          clinicId: impId,
          role: 'super_admin',
          permissions: ALL_FEATURES,
          isLoading: false,
          isAuthenticated: true,
        };
        window.history.replaceState({}, document.title, window.location.pathname);
        notify();
        return;
      }
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (profile) {
        const typedProfile = profile as ProfileWithRole;
        const roleName = (typedProfile.role as string) || typedProfile.roles?.name || 'guest';
        const { data: perms } = await supabase
          .from('app_permissions')
          .select('feature_name')
          .eq('role_name', roleName)
          .eq('canAccess', 1);

        const dbPerms = (perms as AppPermission[] | null)?.map((p) => p.feature_name) ?? [];
        const resolvedPerms =
          dbPerms.length > 0 ? dbPerms : (ROLE_FALLBACK_PERMISSIONS[roleName] ?? []);

        _state = {
          user: session.user,
          session: session,
          clinicId: typedProfile.clinic_id,
          role: roleName,
          permissions: resolvedPerms,
          isLoading: false,
          isAuthenticated: true,
        };
      } else {
        _state.isLoading = false;
        _state.isAuthenticated = false;
      }
    } else {
      _state = {
        user: null,
        session: null,
        clinicId: null,
        role: null,
        permissions: [],
        isLoading: false,
        isAuthenticated: false,
      };
    }

    notify();
  },

  async login(email: string, password: string) {
    if (!isSupabaseConfigured) throw new Error('Supabase sozlanmagan');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await this.initialize();
    return data;
  },

  async logout() {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    _state = {
      user: null,
      session: null,
      clinicId: null,
      role: null,
      permissions: [],
      isLoading: false,
      isAuthenticated: false,
    };
    notify();
  },

  hasRole(...roles: string[]) {
    return roles.includes(_state.role || '');
  },

  hasPermission(perm: string) {
    if (_state.role === 'super_admin') return true;
    return (_state.permissions || []).includes(perm);
  },
};

if (isSupabaseConfigured) {
  authStore.initialize();

  supabase.auth.onAuthStateChange(() => {
    authStore.initialize();
  });
}

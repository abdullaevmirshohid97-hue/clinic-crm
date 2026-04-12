import { supabase } from '../utils/supabase';

/**
 * Simple auth store (no external dependency).
 * Stores user, token, clinic_id, and role.
 */

let _state = {
  user: null,
  session: null,
  clinic_id: null,
  role: null,
  permissions: [],
  isLoading: true,
  isAuthenticated: false,
};

const _listeners = new Set();

function notify() {
  _listeners.forEach(fn => fn({ ..._state }));
}

export const authStore = {
  getState() {
    return { ..._state };
  },

  subscribe(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },

  async initialize() {
    _state.isLoading = true;
    notify();

    // TEMPORARY: Force bypass auth right now as requested by user
    this.setMockAuthenticated();
    return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Fetch profile
        const { data: profile } = await supabase
          .from('users')
          .select('clinic_id, role, permissions')
          .eq('id', session.user.id)
          .single();

        _state = {
          user: session.user,
          session,
          clinic_id: profile?.clinic_id || null,
          role: profile?.role || null,
          permissions: profile?.permissions || [],
          isLoading: false,
          isAuthenticated: true,
        };
      } else {
        _state = { user: null, session: null, clinic_id: null, role: null, permissions: [], isLoading: false, isAuthenticated: false };
      }
    } catch {
      _state = { user: null, session: null, clinic_id: null, role: null, permissions: [], isLoading: false, isAuthenticated: false };
    }

    notify();
  },

  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await authStore.initialize();
    return data;
  },

  async logout() {
    try { await supabase.auth.signOut(); } catch (e) {}
    _state = { user: null, session: null, clinic_id: null, role: null, permissions: [], isLoading: false, isAuthenticated: false };
    localStorage.removeItem('clinic_token');
    localStorage.removeItem('clinic_user_id');
    notify();
  },

  setMockAuthenticated() {
    _state = {
      user: { id: 'mock', email: 'admin@local' },
      session: { access_token: 'mock' },
      clinic_id: 'mock_clinic',
      role: 'super_admin',
      permissions: [],
      isLoading: false,
      isAuthenticated: true,
    };
    notify();
  },

  hasRole(...roles) {
    return roles.includes(_state.role);
  },

  hasPermission(perm) {
    return (_state.permissions || []).includes(perm);
  },
};

// Auto-initialize on import
authStore.initialize();

// Listen for auth state changes
supabase.auth.onAuthStateChange(() => {
  authStore.initialize();
});

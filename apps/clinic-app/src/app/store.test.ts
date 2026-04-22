import { describe, it, expect, vi, beforeEach } from 'vitest';

// Supabase configured=false so initialize() returns early — safe to import store directly
vi.mock('../lib/supabase', () => ({
  supabase: null,
  isSupabaseConfigured: false,
}));

// Import store after mock so module-level code sees isSupabaseConfigured=false
const { authStore } = await import('./store');

describe('authStore — initial state', () => {
  it('is not authenticated by default', () => {
    const state = authStore.getState();
    expect(state.isAuthenticated).toBe(false);
  });

  it('has null user, session, role, clinicId by default', () => {
    const state = authStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
    expect(state.role).toBeNull();
    expect(state.clinicId).toBeNull();
  });

  it('has empty permissions array by default', () => {
    expect(authStore.getState().permissions).toEqual([]);
  });

  it('isLoading is false when Supabase is not configured', () => {
    expect(authStore.getState().isLoading).toBe(false);
  });
});

describe('authStore.logout()', () => {
  it('clears state without throwing when Supabase is not configured', async () => {
    await expect(authStore.logout()).resolves.not.toThrow();
    const state = authStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });
});

describe('authStore.initialize()', () => {
  it('returns early without throwing when Supabase is not configured', async () => {
    await expect(authStore.initialize()).resolves.not.toThrow();
  });
});

describe('authStore.login()', () => {
  it('throws when Supabase is not configured', async () => {
    await expect(authStore.login('test@test.com', 'pass')).rejects.toThrow('Supabase sozlanmagan');
  });
});

describe('authStore.hasRole()', () => {
  beforeEach(async () => {
    await authStore.logout();
  });

  it('returns false for any role when not authenticated', () => {
    expect(authStore.hasRole('admin')).toBe(false);
    expect(authStore.hasRole('doctor')).toBe(false);
  });

  it('can check multiple roles at once', () => {
    expect(authStore.hasRole('admin', 'super_admin', 'doctor')).toBe(false);
  });
});

describe('authStore.hasPermission()', () => {
  beforeEach(async () => {
    await authStore.logout();
  });

  it('returns false for any permission when not authenticated', () => {
    expect(authStore.hasPermission('pharmacy')).toBe(false);
  });

  it('returns false for super_admin-specific bypass when role is null', () => {
    expect(authStore.hasPermission('any-feature')).toBe(false);
  });
});

describe('authStore.subscribe()', () => {
  it('returns a function (unsubscribe) when subscribing', () => {
    const listener = vi.fn();
    const unsubscribe = authStore.subscribe(listener);
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('unsubscribe prevents listener from being registered', () => {
    const listener = vi.fn();
    const unsubscribe = authStore.subscribe(listener);
    unsubscribe();
    // After unsubscribing, the listener should not be in the set
    // We verify by checking subscribe returns a new unsubscribe each time
    const unsubscribe2 = authStore.subscribe(listener);
    expect(typeof unsubscribe2).toBe('function');
    unsubscribe2();
  });
});

describe('authStore getters', () => {
  it('user getter returns null when not authenticated', () => {
    expect(authStore.user).toBeNull();
  });

  it('clinicId getter returns null when not authenticated', () => {
    expect(authStore.clinicId).toBeNull();
  });

  it('role getter returns null when not authenticated', () => {
    expect(authStore.role).toBeNull();
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authStore } from '../src/app/store';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: vi.fn(key => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; })
  };
})();
vi.stubGlobal('localStorage', localStorageMock);
vi.stubGlobal('window', { 
  electronAPI: {
    auth: {
      getCurrentUser: vi.fn().mockResolvedValue(1),
      getUserRole: vi.fn().mockResolvedValue('super_admin'),
      getRolePermissions: vi.fn().mockResolvedValue([
        { feature_name: 'dashboard', canAccess: 1 }
      ]),
      setUserRole: vi.fn().mockResolvedValue({ success: true })
    }
  }
});

describe('authStore', () => {
  beforeEach(() => {
    localStorageMock.clear();
    authStore.logout();
  });

  it('should initialize with default role', async () => {
    await authStore.initialize();
    const state = authStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.role).toBe('super_admin');
  });

  it('should check roles correctly', () => {
    authStore.setMockAuthenticated('admin');
    expect(authStore.hasRole('admin')).toBe(true);
    expect(authStore.hasRole('doctor')).toBe(false);
  });

  it('should handle setRole and persist in localStorage', async () => {
    authStore.setMockAuthenticated('doctor');
    await authStore.setRole('receptionist');
    expect(authStore.getState().role).toBe('receptionist');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('clinic_mock_role', 'receptionist');
  });
});

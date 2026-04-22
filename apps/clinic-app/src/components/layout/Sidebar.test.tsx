import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { LanguageProvider } from '../../i18n/LanguageContext';

// Use vi.hoisted so these vars are available when vi.mock factory runs
const { hasPermission, hasRole } = vi.hoisted(() => ({
  hasPermission: vi.fn().mockReturnValue(true),
  hasRole: vi.fn().mockReturnValue(false),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ count: 0, error: null }),
      }),
    }),
  },
  isSupabaseConfigured: false,
}));

vi.mock('../../app/store', () => ({
  authStore: {
    hasPermission,
    hasRole,
    getState: vi.fn().mockReturnValue({ isAuthenticated: true }),
    subscribe: vi.fn().mockReturnValue(() => {}),
    user: null,
    clinicId: null,
    role: null,
  },
}));

import Sidebar from './Sidebar';

function renderSidebar(props?: Partial<Parameters<typeof Sidebar>[0]>) {
  return render(
    <LanguageProvider>
      <Sidebar
        activePage="dashboard"
        onNavigate={vi.fn()}
        theme="dark"
        onThemeChange={vi.fn()}
        {...props}
      />
    </LanguageProvider>
  );
}

describe('Sidebar — rendering', () => {
  beforeEach(() => {
    hasPermission.mockReturnValue(true);
    hasRole.mockReturnValue(false);
  });

  it('renders the CLARY logo text', () => {
    const { getByText } = renderSidebar();
    expect(getByText('CLARY')).toBeTruthy();
  });

  it('renders navigation items when permissions are granted', () => {
    const { container } = renderSidebar();
    const navItems = container.querySelectorAll('.nav-item');
    expect(navItems.length).toBeGreaterThan(0);
  });

  it('renders no nav items when user has no permissions', () => {
    hasPermission.mockReturnValue(false);
    hasRole.mockReturnValue(false);
    const { container } = renderSidebar();
    const navItems = container.querySelectorAll('.nav-item');
    expect(navItems.length).toBe(0);
  });

  it('shows nav items for super_admin even with no permissions', () => {
    hasPermission.mockReturnValue(false);
    hasRole.mockReturnValue(true);
    const { container } = renderSidebar();
    const navItems = container.querySelectorAll('.nav-item');
    expect(navItems.length).toBeGreaterThan(0);
  });
});

describe('Sidebar — navigation', () => {
  beforeEach(() => {
    hasPermission.mockReturnValue(true);
    hasRole.mockReturnValue(false);
  });

  it('marks the active page nav item with "active" class', () => {
    const { container } = renderSidebar({ activePage: 'dashboard' });
    const activeItem = container.querySelector('.nav-item.active');
    expect(activeItem).toBeTruthy();
  });
});

describe('Sidebar — collapse toggle', () => {
  beforeEach(() => {
    hasPermission.mockReturnValue(true);
    hasRole.mockReturnValue(false);
  });

  it('toggles collapsed state when collapse button is clicked', () => {
    const { container } = renderSidebar();
    const collapseBtn = container.querySelector('.collapse-btn')!;
    expect(container.querySelector('.sidebar.collapsed')).toBeNull();
    fireEvent.click(collapseBtn);
    expect(container.querySelector('.sidebar.collapsed')).toBeTruthy();
  });

  it('shows ▶ when collapsed and ◀ when expanded', () => {
    const { container } = renderSidebar();
    const collapseBtn = container.querySelector('.collapse-btn')!;
    expect(collapseBtn.textContent).toBe('◀');
    fireEvent.click(collapseBtn);
    expect(collapseBtn.textContent).toBe('▶');
  });
});

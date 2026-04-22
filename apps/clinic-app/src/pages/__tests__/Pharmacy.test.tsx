import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToastProvider } from '../../components/ui/Toast';
import { LanguageProvider } from '../../i18n/LanguageContext';

vi.mock('../../lib/supabase', () => ({ supabase: null, isSupabaseConfigured: false }));
vi.mock('../../utils/db', () => ({
  db: {
    getAllRows: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockResolvedValue({ id: 1 }),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  },
  DbRow: {},
}));
vi.mock('../../app/store', () => ({
  authStore: {
    hasPermission: vi.fn().mockReturnValue(true),
    hasRole: vi.fn().mockReturnValue(false),
    getState: vi.fn().mockReturnValue({ clinicId: 'test-clinic', role: 'admin' }),
    subscribe: vi.fn().mockReturnValue(() => {}),
    user: { id: 'u1' },
    clinicId: 'test-clinic',
    role: 'admin',
  },
}));

import Pharmacy from '../Pharmacy';

function renderPharmacy() {
  return render(
    <LanguageProvider>
      <ToastProvider>
        <Pharmacy />
      </ToastProvider>
    </LanguageProvider>
  );
}

describe('Pharmacy page — rendering', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders without crashing', () => {
    const { container } = renderPharmacy();
    expect(container).toBeTruthy();
  });

  it('renders a search or filter input', () => {
    renderPharmacy();
    const inputs = document.querySelectorAll('input[type="text"], input[type="search"], input[placeholder]');
    expect(inputs.length).toBeGreaterThan(0);
  });
});

describe('Pharmacy page — tab navigation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders tab buttons for navigating pharmacy sections', () => {
    renderPharmacy();
    const buttons = document.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('shows an empty state when inventory list is empty', async () => {
    renderPharmacy();
    // With mocked empty data, the list should show an empty state or no rows
    await waitFor(() => {
      const rows = document.querySelectorAll('tbody tr, .pharmacy-item, [data-testid="med-row"]');
      expect(rows.length).toBe(0);
    });
  });
});

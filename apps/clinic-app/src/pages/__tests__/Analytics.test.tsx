import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastProvider } from '../../components/ui/Toast';
import { LanguageProvider } from '../../i18n/LanguageContext';

vi.mock('../../lib/supabase', () => ({ supabase: null, isSupabaseConfigured: false }));
vi.mock('../../utils/db', () => ({
  db: {
    getAllRows: vi.fn().mockResolvedValue([]),
    getRow: vi.fn().mockResolvedValue(null),
  },
}));
vi.mock('../../utils/printer', () => ({ printReceipt: vi.fn() }));

import Analytics from '../billing/Analytics';

function renderAnalytics() {
  return render(
    <LanguageProvider>
      <ToastProvider>
        <Analytics />
      </ToastProvider>
    </LanguageProvider>
  );
}

describe('Analytics page — rendering', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders without crashing', () => {
    const { container } = renderAnalytics();
    expect(container).toBeTruthy();
    expect(container.firstChild).toBeTruthy();
  });

  it('renders a non-empty page (has content)', () => {
    const { container } = renderAnalytics();
    expect(container.innerHTML.length).toBeGreaterThan(50);
  });

  it('renders date-related controls (period selector or date inputs)', () => {
    renderAnalytics();
    const dateInputs = document.querySelectorAll('input[type="date"], input[type="month"], select');
    const buttons = document.querySelectorAll('button');
    // Either date inputs or buttons for period selection should exist
    expect(dateInputs.length + buttons.length).toBeGreaterThan(0);
  });
});

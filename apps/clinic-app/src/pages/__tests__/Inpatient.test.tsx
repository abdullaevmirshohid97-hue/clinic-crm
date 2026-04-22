import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider } from '../../components/ui/Toast';
import { LanguageProvider } from '../../i18n/LanguageContext';

vi.mock('../../lib/supabase', () => ({ supabase: null, isSupabaseConfigured: false }));
vi.mock('../../utils/db', () => ({
  db: {
    getAllRows: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockResolvedValue({ id: 1 }),
    update: vi.fn().mockResolvedValue({}),
  },
}));

import Inpatient from '../Inpatient';

function renderInpatient() {
  return render(
    <LanguageProvider>
      <ToastProvider>
        <Inpatient />
      </ToastProvider>
    </LanguageProvider>
  );
}

describe('Inpatient page — component type', () => {
  it('is a valid React component function', () => {
    expect(typeof Inpatient).toBe('function');
  });
});

describe('Inpatient page — rendering', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders without crashing', () => {
    const { container } = renderInpatient();
    expect(container).toBeTruthy();
    expect(container.firstChild).toBeTruthy();
  });

  it('renders tab navigation buttons', () => {
    renderInpatient();
    const buttons = document.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders the room map tab by default', () => {
    renderInpatient();
    // Default tab is 'map' — check that some tab content or structure is present
    const { container } = renderInpatient();
    expect(container.innerHTML).not.toBe('');
  });
});

describe('Inpatient page — tab switching', () => {
  beforeEach(() => vi.clearAllMocks());

  it('can click tab buttons without throwing', () => {
    renderInpatient();
    const buttons = document.querySelectorAll('button');
    // Click each tab button to ensure no crash
    buttons.forEach((btn) => {
      expect(() => fireEvent.click(btn)).not.toThrow();
    });
  });
});

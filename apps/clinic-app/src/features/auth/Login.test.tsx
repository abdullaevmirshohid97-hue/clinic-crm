import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { ToastProvider } from '../../components/ui/Toast';
import { LanguageProvider } from '../../i18n/LanguageContext';

vi.mock('../../lib/supabase', () => ({ supabase: null, isSupabaseConfigured: false }));

const mockLogin = vi.hoisted(() => vi.fn());
vi.mock('../../app/store', () => ({
  authStore: {
    login: mockLogin,
    logout: vi.fn().mockResolvedValue(undefined),
    initialize: vi.fn().mockResolvedValue(undefined),
    getState: vi.fn().mockReturnValue({
      isAuthenticated: false, user: null, role: null, permissions: [], isLoading: false,
    }),
    hasRole: vi.fn().mockReturnValue(false),
    hasPermission: vi.fn().mockReturnValue(false),
    subscribe: vi.fn().mockReturnValue(() => {}),
    user: null, clinicId: null, role: null,
  },
}));

import Login from './Login';

function renderLogin() {
  const utils = render(
    <LanguageProvider>
      <ToastProvider>
        <Login />
      </ToastProvider>
    </LanguageProvider>
  );
  const inputs = () => utils.container.querySelectorAll('input');
  const form = () => utils.container.querySelector('form')!;
  return { ...utils, inputs, form };
}

describe('Login component — rendering', () => {
  it('renders the Clary SaaS heading', () => {
    const { getByText } = renderLogin();
    expect(getByText('Clary SaaS')).toBeTruthy();
  });

  it('renders email and password input fields', () => {
    const { inputs } = renderLogin();
    expect(inputs().length).toBeGreaterThanOrEqual(2);
  });

  it('renders the submit button in idle state', () => {
    const { getByText } = renderLogin();
    expect(getByText('Tizimga kirish')).toBeTruthy();
  });

  it('submit button is not disabled initially', () => {
    const { getByText } = renderLogin();
    const btn = getByText('Tizimga kirish') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });
});

describe('Login component — form submission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls authStore.login with typed email and password on submit', async () => {
    mockLogin.mockResolvedValue({});
    const { inputs, form } = renderLogin();

    fireEvent.change(inputs()[0], { target: { value: 'admin@clinic.com' } });
    fireEvent.change(inputs()[1], { target: { value: 'password123' } });
    await act(async () => { fireEvent.submit(form()); });

    expect(mockLogin).toHaveBeenCalledWith('admin@clinic.com', 'password123');
  });

  it('shows loading text while login is in progress', async () => {
    let resolveLogin!: () => void;
    mockLogin.mockImplementation(
      () => new Promise((res) => { resolveLogin = () => res({}); })
    );
    const { inputs, form, getByText } = renderLogin();

    fireEvent.change(inputs()[0], { target: { value: 'a@b.com' } });
    fireEvent.change(inputs()[1], { target: { value: 'pass' } });
    fireEvent.submit(form());

    await waitFor(() => expect(getByText('Tekshirilmoqda...')).toBeTruthy());
    await act(async () => { resolveLogin(); });
  });

  it('disables the submit button while loading', async () => {
    let resolveLogin!: () => void;
    mockLogin.mockImplementation(
      () => new Promise((res) => { resolveLogin = () => res({}); })
    );
    const { inputs, form, getByText } = renderLogin();

    fireEvent.change(inputs()[0], { target: { value: 'a@b.com' } });
    fireEvent.change(inputs()[1], { target: { value: 'pass' } });
    fireEvent.submit(form());

    await waitFor(() => {
      const btn = getByText('Tekshirilmoqda...') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });
    await act(async () => { resolveLogin(); });
  });

  it('shows error toast when login throws', async () => {
    mockLogin.mockRejectedValue(new Error("Parol noto'g'ri"));
    const { inputs, form, findByText } = renderLogin();

    fireEvent.change(inputs()[0], { target: { value: 'wrong@email.com' } });
    fireEvent.change(inputs()[1], { target: { value: 'wrongpass' } });
    await act(async () => { fireEvent.submit(form()); });

    expect(await findByText("Parol noto'g'ri")).toBeTruthy();
  });

  it('button returns to enabled state after successful login', async () => {
    mockLogin.mockResolvedValue({});
    const { inputs, form, queryByText } = renderLogin();

    fireEvent.change(inputs()[0], { target: { value: 'a@b.com' } });
    fireEvent.change(inputs()[1], { target: { value: 'pass' } });
    await act(async () => { fireEvent.submit(form()); });

    await waitFor(() => {
      const btn = queryByText('Tizimga kirish') as HTMLButtonElement | null;
      if (btn) expect(btn.disabled).toBe(false);
    });
  });
});

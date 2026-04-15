import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Analytics from '../billing/Analytics';
import { ToastProvider } from '../../components/ui/Toast';

describe('Analytics page', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ToastProvider>
        <Analytics />
      </ToastProvider>
    );
    expect(container).toBeTruthy();
  });
});

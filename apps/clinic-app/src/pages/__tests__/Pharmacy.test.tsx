import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Pharmacy from '../Pharmacy';
import { ToastProvider } from '../../components/ui/Toast';

describe('Pharmacy page', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ToastProvider>
        <Pharmacy />
      </ToastProvider>
    );
    expect(container).toBeTruthy();
  });
});

import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Analytics from '../billing/Analytics';

describe('Analytics page', () => {
  it('renders without crashing', () => {
    const { container } = render(<Analytics />);
    expect(container).toBeTruthy();
  });
});

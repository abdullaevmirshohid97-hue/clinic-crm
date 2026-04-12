import { describe, it, expect } from 'vitest';
import Inpatient from '../Inpatient';

describe('Inpatient page', () => {
  it('should be a valid React component', () => {
    expect(typeof Inpatient).toBe('function');
  });
});

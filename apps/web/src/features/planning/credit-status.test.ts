import { describe, expect, it } from 'vitest';
import { creditStatus } from './credit-status';

describe('creditStatus', () => {
  it('is below the minimum, within the limits, or above the maximum', () => {
    expect(creditStatus(10, 12, 30)).toBe('below');
    expect(creditStatus(12, 12, 30)).toBe('within');
    expect(creditStatus(30, 12, 30)).toBe('within');
    expect(creditStatus(31, 12, 30)).toBe('above');
  });

  it('never reports below when the curriculum sets no minimum', () => {
    expect(creditStatus(0, 0, 30)).toBe('within');
  });
});

import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDateTime } from './formatting';

describe('formatCurrency', () => {
  it('should format number as Brazilian currency', () => {
    expect(formatCurrency(1234.56)).toBe('R$ 1.234,56');
    expect(formatCurrency(0)).toBe('R$ 0,00');
    expect(formatCurrency(10)).toBe('R$ 10,00');
  });

  it('should handle negative values', () => {
    expect(formatCurrency(-50)).toBe('-R$ 50,00');
  });

  it('should handle large numbers', () => {
    expect(formatCurrency(1000000)).toBe('R$ 1.000.000,00');
  });
});

describe('formatDateTime', () => {
  it('should format ISO date string', () => {
    const date = '2024-01-15T10:30:00Z';
    const formatted = formatDateTime(date);
    expect(formatted).toContain('15/01/2024');
  });

  it('should handle Date objects', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const formatted = formatDateTime(date.toISOString());
    expect(formatted).toContain('15/01/2024');
  });
});

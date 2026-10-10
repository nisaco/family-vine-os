import { describe, it, expect } from 'vitest';
import { parseCurrencyToCents, formatCurrency, validatePositiveCents } from '@/lib/utils/currency';

describe('Currency and Minor-Unit Arithmetic', () => {
  it('parses valid dollar strings into exact minor unit cents', () => {
    expect(parseCurrencyToCents('25.00')).toBe(2500);
    expect(parseCurrencyToCents('25.50')).toBe(2550);
    expect(parseCurrencyToCents('$100.99')).toBe(10099);
    expect(parseCurrencyToCents('1,250.75')).toBe(125075);
    expect(parseCurrencyToCents('0.05')).toBe(5);
    expect(parseCurrencyToCents('10')).toBe(1000);
  });

  it('parses numbers safely into exact integer cents', () => {
    expect(parseCurrencyToCents(25.5)).toBe(2550);
    expect(parseCurrencyToCents(100)).toBe(10000);
  });

  it('rejects malformed or invalid inputs', () => {
    expect(() => parseCurrencyToCents('abc')).toThrow();
    expect(() => parseCurrencyToCents('12.34.56')).toThrow();
    expect(() => parseCurrencyToCents('')).toThrow();
    expect(() => parseCurrencyToCents(NaN)).toThrow();
  });

  it('formats cents cleanly with custom or default currency symbols', () => {
    expect(formatCurrency(2500, '$', 'USD')).toBe('$25.00');
    expect(formatCurrency(125075, '$', 'USD')).toBe('$1,250.75');
    expect(formatCurrency(5000, 'GH₵', 'GHS')).toBe('GH₵50.00');
    expect(formatCurrency(0, '£', 'GBP')).toBe('£0.00');
    expect(formatCurrency(-1500, '$', 'USD')).toBe('-$15.00');
  });

  it('validates positive amounts', () => {
    expect(validatePositiveCents(2500).valid).toBe(true);
    expect(validatePositiveCents(0).valid).toBe(false);
    expect(validatePositiveCents(-500).valid).toBe(false);
    expect(validatePositiveCents(12.5).valid).toBe(false);
  });
});

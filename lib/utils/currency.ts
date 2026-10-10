/**
 * Exact minor-unit currency utilities.
 * All monetary amounts are stored and calculated as integers (e.g., cents or pesewas)
 * to eliminate floating-point arithmetic rounding errors.
 */

export function parseCurrencyToCents(value: string | number): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || isNaN(value)) {
      throw new Error('Invalid number provided for currency');
    }
    return Math.round(value * 100);
  }

  if (typeof value !== 'string') {
    throw new Error('Currency input must be a string or number');
  }

  // Remove currency symbols, commas, and whitespace
  const sanitized = value.trim().replace(/[^0-9.-]/g, '');

  if (!sanitized || sanitized === '-' || sanitized === '.') {
    throw new Error('Invalid currency format');
  }

  const parts = sanitized.split('.');
  if (parts.length > 2) {
    throw new Error('Invalid currency format: multiple decimal points');
  }

  const whole = parseInt(parts[0] || '0', 10);
  let fraction = 0;

  if (parts.length === 2) {
    const fractionStr = (parts[1] + '00').slice(0, 2);
    fraction = parseInt(fractionStr, 10);
  }

  const isNegative = sanitized.startsWith('-');
  const totalCents = Math.abs(whole) * 100 + fraction;

  return isNegative ? -totalCents : totalCents;
}

export function formatCurrency(
  cents: number,
  currencySymbol = '$',
  currencyCode = 'USD'
): string {
  if (!Number.isFinite(cents) || isNaN(cents)) {
    return `${currencySymbol}0.00`;
  }

  const isNegative = cents < 0;
  const absCents = Math.abs(cents);
  const dollars = Math.floor(absCents / 100);
  const remainingCents = absCents % 100;

  const formattedDollars = dollars.toLocaleString('en-US');
  const formattedCents = remainingCents.toString().padStart(2, '0');

  const sign = isNegative ? '-' : '';
  return `${sign}${currencySymbol}${formattedDollars}.${formattedCents}`;
}

export function validatePositiveCents(cents: number, fieldName = 'Amount'): { valid: boolean; error?: string } {
  if (!Number.isInteger(cents)) {
    return { valid: false, error: `${fieldName} must be a whole number of cents` };
  }
  if (cents <= 0) {
    return { valid: false, error: `${fieldName} must be greater than zero` };
  }
  if (cents > 10000000000) { // Safety cap ($100,000,000)
    return { valid: false, error: `${fieldName} exceeds maximum allowable amount` };
  }
  return { valid: true };
}

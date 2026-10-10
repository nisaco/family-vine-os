import { describe, it, expect } from 'vitest';
import { sanitizeCsvCell, generateSafeCsv } from '@/lib/utils/csv';

describe('CSV Safety and Formula Injection Prevention', () => {
  it('escapes dangerous spreadsheet formula triggers (=, +, -, @, \\t, \\r)', () => {
    expect(sanitizeCsvCell('=1+1')).toBe(`"'=1+1"`);
    expect(sanitizeCsvCell('+123')).toBe(`"'+123"`);
    expect(sanitizeCsvCell('-SUM(A1:A10)')).toBe(`"'-SUM(A1:A10)"`);
    expect(sanitizeCsvCell('@cmd|"/C calc"!A0')).toBe(`"'@cmd|""/C calc""!A0"`);
  });

  it('escapes existing double quotes properly', () => {
    expect(sanitizeCsvCell('Choir "Robes" Purchase')).toBe(`"Choir ""Robes"" Purchase"`);
  });

  it('handles null, undefined, numbers, and plain strings', () => {
    expect(sanitizeCsvCell(null)).toBe('""');
    expect(sanitizeCsvCell(undefined)).toBe('""');
    expect(sanitizeCsvCell(2500)).toBe('"2500"');
    expect(sanitizeCsvCell('Family Vine Choir')).toBe('"Family Vine Choir"');
  });

  it('generates a full CSV with UTF-8 BOM', () => {
    const headers = ['Date', 'Description', 'Amount'];
    const rows = [
      ['2026-10-01', 'Monthly Dues', '25.00'],
      ['2026-10-02', '=cmd|calc', '10.00'],
    ];

    const csv = generateSafeCsv(headers, rows);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"Date","Description","Amount"');
    expect(csv).toContain('"2026-10-01","Monthly Dues","25.00"');
    expect(csv).toContain(`"'=cmd|calc"`);
  });
});


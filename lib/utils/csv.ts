/**
 * Formula-injection-safe CSV generator.
 * Protects against CSV Injection (CWE-1236) by safely escaping
 * cells starting with formula characters (=, +, -, @, \t, \r).
 */

export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }

  let str = String(value);

  // If the cell starts with a formula trigger character, prepend a single quote
  const formulaTriggers = ['=', '+', '-', '@', '\t', '\r'];
  if (formulaTriggers.some((char) => str.startsWith(char))) {
    str = `'${str}`;
  }

  // Escape existing double quotes by doubling them
  const escaped = str.replace(/"/g, '""');

  return `"${escaped}"`;
}

export function generateSafeCsv(headers: string[], rows: (unknown[])[]): string {
  const headerRow = headers.map(sanitizeCsvCell).join(',');
  const dataRows = rows.map((row) => row.map(sanitizeCsvCell).join(','));

  // Prepend UTF-8 BOM so Excel opens UTF-8 encoded characters properly
  return '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
}

/**
 * Timezone and date formatting utilities.
 */

export function formatDateTime(
  isoDateStr: string | null | undefined,
  timeZone = 'UTC',
  options: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
    timeStyle: 'short',
  }
): string {
  if (!isoDateStr) return 'N/A';
  try {
    const date = new Date(isoDateStr);
    if (isNaN(date.getTime())) return isoDateStr;
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone }).format(date);
  } catch {
    // If timezone is invalid, fallback to UTC
    try {
      const date = new Date(isoDateStr);
      return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(date);
    } catch {
      return isoDateStr;
    }
  }
}

export function formatDateOnly(
  isoDateStr: string | null | undefined,
  timeZone = 'UTC'
): string {
  if (!isoDateStr) return 'N/A';
  try {
    // Check if it's already a simple YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDateStr)) {
      const [y, m, d] = isoDateStr.split('-').map(Number);
      const date = new Date(Date.UTC(y, m - 1, d));
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeZone: 'UTC',
      }).format(date);
    }
    const date = new Date(isoDateStr);
    if (isNaN(date.getTime())) return isoDateStr;
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeZone,
    }).format(date);
  } catch {
    return isoDateStr;
  }
}

export const COMMON_TIMEZONES = [
  'UTC',
  'Africa/Accra',
  'Africa/Lagos',
  'Africa/Johannesburg',
  'Africa/Nairobi',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'Asia/Dubai',
  'Asia/Singapore',
  'Australia/Sydney',
];


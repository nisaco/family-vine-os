import { getDb } from '@/lib/db';
import type {
  ChoirSettings,
  User,
  SafeUser,
  ChoirEvent,
  EventRsvp,
  AttendanceRecord,
  FinancialTransaction,
  FinancialCategory,
  Announcement,
  Meeting,
  ActionItem,
  Song,
  SongResource,
  AuditLog,
  UserRole,
} from '@/lib/types';
import { sanitizeUser } from '@/lib/auth';

export function getChoirSettings(): ChoirSettings {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.key, row.value);
  }

  return {
    choir_name: map.get('choir_name') || 'Family Vine Choir',
    motto: map.get('motto') || 'United in Harmony, Rooted in Grace',
    timezone: map.get('timezone') || 'UTC',
    currency_code: map.get('currency_code') || 'USD',
    currency_symbol: map.get('currency_symbol') || '$',
    contact_email: map.get('contact_email') || 'contact@familyvinechoir.org',
    contact_phone: map.get('contact_phone') || '+1 555-0199',
    standard_monthly_dues_cents: parseInt(map.get('standard_monthly_dues_cents') || '2500', 10),
    allow_member_birthday_view: map.get('allow_member_birthday_view') === 'true',
  };
}

export function getAllMembers(requesterRole: UserRole, currentUserId: string): SafeUser[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM users ORDER BY full_name ASC
  `).all() as User[];

  return rows.map((u) => sanitizeUser(u, requesterRole, u.id === currentUserId));
}

export function getMemberById(id: string, requesterRole: UserRole, currentUserId: string): SafeUser | null {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
  if (!user) return null;
  return sanitizeUser(user, requesterRole, user.id === currentUserId);
}

export function getEvents(includePast = true, wingFilter?: string | null): (ChoirEvent & { attending_count: number; not_attending_count: number })[] {
  const db = getDb();
  let query = `
    SELECT
      e.*,
      COALESCE((SELECT COUNT(*) FROM event_rsvps WHERE event_id = e.id AND status = 'ATTENDING'), 0) as attending_count,
      COALESCE((SELECT COUNT(*) FROM event_rsvps WHERE event_id = e.id AND status = 'NOT_ATTENDING'), 0) as not_attending_count
    FROM events e
    WHERE 1=1
  `;
  const params: unknown[] = [];
  if (wingFilter && wingFilter !== 'ALL') {
    query += ` AND (e.target_wing IS NULL OR e.target_wing = 'ALL' OR e.target_wing = ?)`;
    params.push(wingFilter);
  }
  query += ` ORDER BY e.start_time ASC`;

  return db.prepare(query).all(...params) as (ChoirEvent & { attending_count: number; not_attending_count: number })[];
}

export function getEventById(id: string): ChoirEvent | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as ChoirEvent | undefined;
  return row || null;
}

export function getEventRsvps(eventId: string): EventRsvp[] {
  const db = getDb();
  return db.prepare(`
    SELECT r.*, u.full_name as user_name, u.wing, u.wing_role, u.voice_part
    FROM event_rsvps r
    JOIN users u ON r.user_id = u.id
    WHERE r.event_id = ?
    ORDER BY u.full_name ASC
  `).all(eventId) as EventRsvp[];
}

export function getUserRsvpForEvent(eventId: string, userId: string): EventRsvp | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM event_rsvps WHERE event_id = ? AND user_id = ?
  `).get(eventId, userId) as EventRsvp | undefined;
  return row || null;
}

export function getEventAttendance(eventId: string): AttendanceRecord[] {
  const db = getDb();
  return db.prepare(`
    SELECT a.*, u.full_name as user_name, u.wing, u.wing_role, u.voice_part
    FROM attendance_records a
    JOIN users u ON a.user_id = u.id
    WHERE a.event_id = ?
    ORDER BY u.full_name ASC
  `).all(eventId) as AttendanceRecord[];
}

export function getUserAttendanceStats(userId: string): {
  total: number;
  present: number;
  late: number;
  excused: number;
  absent: number;
  ratePercent: number;
} {
  const db = getDb();
  const rows = db.prepare(`
    SELECT status, count(*) as count
    FROM attendance_records
    WHERE user_id = ?
    GROUP BY status
  `).all(userId) as Array<{ status: string; count: number }>;

  let present = 0;
  let late = 0;
  let excused = 0;
  let absent = 0;

  for (const r of rows) {
    if (r.status === 'PRESENT') present = r.count;
    if (r.status === 'LATE') late = r.count;
    if (r.status === 'EXCUSED') excused = r.count;
    if (r.status === 'ABSENT') absent = r.count;
  }

  const total = present + late + excused + absent;
  // Present + Late count towards attendance rate
  const ratePercent = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

  return { total, present, late, excused, absent, ratePercent };
}

export function getChoirAttendanceOverview(): {
  averageRatePercent: number;
  totalEventsHeld: number;
  recentRecords: AttendanceRecord[];
} {
  const db = getDb();
  const totalEventsRow = db.prepare(`
    SELECT count(DISTINCT event_id) as count FROM attendance_records
  `).get() as { count: number };

  const rateRow = db.prepare(`
    SELECT
      count(*) as total,
      SUM(CASE WHEN status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END) as attended
    FROM attendance_records
  `).get() as { total: number; attended: number };

  const averageRatePercent = rateRow.total > 0
    ? Math.round((rateRow.attended / rateRow.total) * 100)
    : 100;

  const recentRecords = db.prepare(`
    SELECT a.*, u.full_name as user_name, u.voice_part
    FROM attendance_records a
    JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT 10
  `).all() as AttendanceRecord[];

  return {
    averageRatePercent,
    totalEventsHeld: totalEventsRow.count,
    recentRecords,
  };
}

export function getFinancialCategories(): FinancialCategory[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM financial_categories WHERE is_active = 1 ORDER BY type ASC, name ASC
  `).all() as FinancialCategory[];
}

export function getFinancialTransactions(filters?: {
  memberId?: string;
  type?: 'INCOME' | 'EXPENSE';
  startDate?: string;
  endDate?: string;
  status?: string;
  limit?: number;
}): FinancialTransaction[] {
  const db = getDb();
  let query = `
    SELECT
      t.*,
      c.name as category_name,
      u.full_name as member_name,
      cb.full_name as created_by_name,
      rb.full_name as reviewed_by_name
    FROM financial_transactions t
    JOIN financial_categories c ON t.category_id = c.id
    LEFT JOIN users u ON t.member_id = u.id
    LEFT JOIN users cb ON t.created_by = cb.id
    LEFT JOIN users rb ON t.reviewed_by = rb.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (filters?.memberId) {
    query += ' AND t.member_id = ?';
    params.push(filters.memberId);
  }
  if (filters?.type) {
    query += ' AND t.transaction_type = ?';
    params.push(filters.type);
  }
  if (filters?.startDate) {
    query += ' AND t.date >= ?';
    params.push(filters.startDate);
  }
  if (filters?.endDate) {
    query += ' AND t.date <= ?';
    params.push(filters.endDate);
  }
  if (filters?.status) {
    query += ' AND t.status = ?';
    params.push(filters.status);
  }

  query += ' ORDER BY t.date DESC, t.created_at DESC';

  if (filters?.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  }

  return db.prepare(query).all(...params) as FinancialTransaction[];
}

export function getFinancialSummary(): {
  totalIncomeCents: number;
  totalExpenseCents: number;
  netBalanceCents: number;
  categoryBreakdown: Array<{ name: string; type: string; total_cents: number }>;
} {
  const db = getDb();
  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN transaction_type = 'INCOME' AND status = 'POSTED' THEN amount_cents ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN transaction_type = 'EXPENSE' AND status = 'POSTED' THEN amount_cents ELSE 0 END), 0) as total_expense
    FROM financial_transactions
  `).get() as { total_income: number; total_expense: number };

  const categoryBreakdown = db.prepare(`
    SELECT c.name, c.type, COALESCE(SUM(t.amount_cents), 0) as total_cents
    FROM financial_transactions t
    JOIN financial_categories c ON t.category_id = c.id
    WHERE t.status = 'POSTED'
    GROUP BY c.id, c.name, c.type
    ORDER BY total_cents DESC
  `).all() as Array<{ name: string; type: string; total_cents: number }>;

  return {
    totalIncomeCents: totals.total_income,
    totalExpenseCents: totals.total_expense,
    netBalanceCents: totals.total_income - totals.total_expense,
    categoryBreakdown,
  };
}

export function getUserPaymentSummary(userId: string): {
  totalPaidCents: number;
  payments: FinancialTransaction[];
} {
  const db = getDb();
  const transactions = getFinancialTransactions({ memberId: userId, status: 'POSTED' });
  const totalPaidCents = transactions
    .filter((t) => t.transaction_type === 'INCOME')
    .reduce((acc, curr) => acc + curr.amount_cents, 0);

  return {
    totalPaidCents,
    payments: transactions,
  };
}

export function getAnnouncements(
  requesterRole: UserRole,
  userVoicePart?: string | null,
  userWing?: string | null
): Announcement[] {
  const db = getDb();
  const isOfficer =
    requesterRole === 'ADMIN' ||
    requesterRole === 'PRESIDENT' ||
    requesterRole === 'GENERAL_SECRETARY' ||
    requesterRole === 'FINANCIAL_SECRETARY' ||
    requesterRole === 'TREASURER';

  const rows = db.prepare(`
    SELECT a.*, u.full_name as author_name
    FROM announcements a
    JOIN users u ON a.author_id = u.id
    WHERE a.is_archived = 0
    ORDER BY a.is_pinned DESC, a.publish_at DESC
  `).all() as Announcement[];

  // Filter announcements according to target audience
  return rows.filter((ann) => {
    if (ann.target_audience === 'ALL') return true;
    if (ann.target_audience === 'OFFICERS') return isOfficer;
    if (userVoicePart && ann.target_audience.toUpperCase() === userVoicePart.toUpperCase()) return true;
    if (userWing) {
      if (ann.target_audience === 'FAMILY_OF_PRAISE' && userWing === 'Family of Praise') return true;
      if (ann.target_audience === 'ASAPHITES' && userWing === 'Asaphites') return true;
      if (ann.target_audience === 'VIMMIES' && userWing === 'Vimmies') return true;
    }
    if (isOfficer) return true; // Officers see all target sections
    return false;
  });
}

export function getMeetings(isOfficer: boolean): (Meeting & { action_items: ActionItem[] })[] {
  const db = getDb();
  let query = `
    SELECT m.*, u.full_name as created_by_name
    FROM meetings m
    JOIN users u ON m.created_by = u.id
  `;
  if (!isOfficer) {
    query += ' WHERE m.is_confidential = 0';
  }
  query += ' ORDER BY m.date DESC';

  const meetings = db.prepare(query).all() as Meeting[];

  const actionItemsStmt = db.prepare(`
    SELECT a.*, u.full_name as assigned_to_name
    FROM action_items a
    JOIN users u ON a.assigned_to = u.id
    WHERE a.meeting_id = ?
    ORDER BY a.created_at ASC
  `);

  return meetings.map((m) => ({
    ...m,
    action_items: actionItemsStmt.all(m.id) as ActionItem[],
  }));
}

export function getActionItems(filters?: { assignedTo?: string; status?: string }): ActionItem[] {
  const db = getDb();
  let query = `
    SELECT a.*, u.full_name as assigned_to_name, m.title as meeting_title
    FROM action_items a
    JOIN users u ON a.assigned_to = u.id
    LEFT JOIN meetings m ON a.meeting_id = m.id
    WHERE 1=1
  `;
  const params: unknown[] = [];
  if (filters?.assignedTo) {
    query += ' AND a.assigned_to = ?';
    params.push(filters.assignedTo);
  }
  if (filters?.status) {
    query += ' AND a.status = ?';
    params.push(filters.status);
  }
  query += ' ORDER BY a.due_date ASC, a.created_at DESC';

  return db.prepare(query).all(...params) as ActionItem[];
}

export function getSongs(search?: string, category?: string, voicing?: string): Song[] {
  const db = getDb();
  let query = `SELECT * FROM songs WHERE is_archived = 0`;
  const params: unknown[] = [];

  if (category) {
    query += ` AND category = ?`;
    params.push(category);
  }
  if (voicing) {
    query += ` AND voicing = ?`;
    params.push(voicing);
  }
  if (search) {
    query += ` AND (title LIKE ? OR composer_or_arranger LIKE ? OR notes LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ` ORDER BY title ASC`;

  const songs = db.prepare(query).all(...params) as Song[];
  const resStmt = db.prepare(`SELECT * FROM song_resources WHERE song_id = ?`);

  return songs.map((s) => ({
    ...s,
    resources: resStmt.all(s.id) as SongResource[],
  }));
}

export function getAuditLogs(limit = 50, offset = 0): AuditLog[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM audit_logs
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset) as AuditLog[];
}

export function getTodayBirthdays(): SafeUser[] {
  const db = getDb();
  const today = new Date();
  const localMm = String(today.getMonth() + 1).padStart(2, '0');
  const localDd = String(today.getDate()).padStart(2, '0');
  const localMmdd = `${localMm}-${localDd}`;

  const utcMm = String(today.getUTCMonth() + 1).padStart(2, '0');
  const utcDd = String(today.getUTCDate()).padStart(2, '0');
  const utcMmdd = `${utcMm}-${utcDd}`;

  const rows = db.prepare(`
    SELECT DISTINCT * FROM users
    WHERE status = 'ACTIVE'
      AND birth_date IS NOT NULL
      AND (
        substr(birth_date, 6, 5) = ?
        OR substr(birth_date, 1, 5) = ?
        OR substr(birth_date, 6, 5) = ?
        OR substr(birth_date, 1, 5) = ?
      )
    ORDER BY full_name ASC
  `).all(localMmdd, localMmdd, utcMmdd, utcMmdd) as User[];

  return rows.map((u) => sanitizeUser(u, 'ADMIN', false));
}

export function getUpcomingBirthdays(daysAhead = 14): Array<{ user: SafeUser; birthMonthDay: string; daysUntil: number }> {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM users
    WHERE status = 'ACTIVE' AND birth_date IS NOT NULL
    ORDER BY full_name ASC
  `).all() as User[];

  const now = new Date();
  const currentYear = now.getFullYear();
  const todayStart = new Date(currentYear, now.getMonth(), now.getDate()).getTime();
  const results: Array<{ user: SafeUser; birthMonthDay: string; daysUntil: number }> = [];

  for (const u of rows) {
    if (!u.birth_date) continue;
    const parts = u.birth_date.split('-');
    if (parts.length < 2) continue;
    const m = parts.length === 3 ? parseInt(parts[1], 10) : parseInt(parts[0], 10);
    const d = parts.length === 3 ? parseInt(parts[2], 10) : parseInt(parts[1], 10);
    if (isNaN(m) || isNaN(d)) continue;

    let bdayThisYear = new Date(currentYear, m - 1, d);
    let diffDays = Math.round((bdayThisYear.getTime() - todayStart) / (1000 * 3600 * 24));

    if (diffDays < 0) {
      bdayThisYear = new Date(currentYear + 1, m - 1, d);
      diffDays = Math.round((bdayThisYear.getTime() - todayStart) / (1000 * 3600 * 24));
    }

    if (diffDays >= 0 && diffDays <= daysAhead) {
      results.push({
        user: sanitizeUser(u, 'ADMIN', false),
        birthMonthDay: `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        daysUntil: diffDays,
      });
    }
  }

  results.sort((a, b) => a.daysUntil - b.daysUntil);
  return results;
}


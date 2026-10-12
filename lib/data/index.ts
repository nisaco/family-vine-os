import { findMany, findOne } from '@/lib/db';
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

export async function getChoirSettings(): Promise<ChoirSettings> {
  const rows = await findMany<{ key: string; value: string }>('settings');
  const map = new Map(rows.map(({ key, value }) => [key, value]));

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

export async function getAllMembers(requesterRole: UserRole, currentUserId: string): Promise<SafeUser[]> {
  const rows = await findMany<User>('users', {}, { full_name: 1 });
  return rows.map((user) => sanitizeUser(user, requesterRole, user.id === currentUserId));
}

export async function getMemberById(
  id: string,
  requesterRole: UserRole,
  currentUserId: string
): Promise<SafeUser | null> {
  const user = await findOne<User>('users', { id });
  return user ? sanitizeUser(user, requesterRole, user.id === currentUserId) : null;
}

export async function getEvents(
  includePast = true,
  wingFilter?: string | null
): Promise<(ChoirEvent & { attending_count: number; not_attending_count: number })[]> {
  const filter = wingFilter && wingFilter !== 'ALL'
    ? { $or: [{ target_wing: null }, { target_wing: 'ALL' }, { target_wing: wingFilter }] }
    : {};
  const [events, rsvps] = await Promise.all([
    findMany<ChoirEvent>('events', filter, { start_time: 1 }),
    findMany<EventRsvp>('event_rsvps'),
  ]);
  const now = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const selectedEvents = includePast ? events : events.filter((event) => event.start_time >= now);

  return selectedEvents.map((event) => ({
    ...event,
    attending_count: rsvps.filter((rsvp) => rsvp.event_id === event.id && rsvp.status === 'ATTENDING').length,
    not_attending_count: rsvps.filter((rsvp) => rsvp.event_id === event.id && rsvp.status === 'NOT_ATTENDING').length,
  }));
}

export async function getEventById(id: string): Promise<ChoirEvent | null> {
  return findOne<ChoirEvent>('events', { id });
}

export async function getEventRsvps(eventId: string): Promise<EventRsvp[]> {
  const [rsvps, users] = await Promise.all([
    findMany<EventRsvp>('event_rsvps', { event_id: eventId }),
    findMany<User>('users'),
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));

  return rsvps
    .flatMap((rsvp) => {
      const user = usersById.get(rsvp.user_id);
      return user
        ? [{ ...rsvp, user_name: user.full_name, wing: user.wing || undefined, wing_role: user.wing_role || undefined, voice_part: user.voice_part || undefined }]
        : [];
    })
    .sort((a, b) => (a.user_name || '').localeCompare(b.user_name || ''));
}

export async function getUserRsvpForEvent(eventId: string, userId: string): Promise<EventRsvp | null> {
  return findOne<EventRsvp>('event_rsvps', { event_id: eventId, user_id: userId });
}

export async function getEventAttendance(eventId: string): Promise<AttendanceRecord[]> {
  const [records, users] = await Promise.all([
    findMany<AttendanceRecord>('attendance_records', { event_id: eventId }),
    findMany<User>('users'),
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));

  return records
    .flatMap((record) => {
      const user = usersById.get(record.user_id);
      return user
        ? [{ ...record, user_name: user.full_name, wing: user.wing || undefined, wing_role: user.wing_role || undefined, voice_part: user.voice_part || undefined }]
        : [];
    })
    .sort((a, b) => (a.user_name || '').localeCompare(b.user_name || ''));
}

export async function getUserAttendanceHistory(
  userId: string
): Promise<Array<AttendanceRecord & { event_title: string; event_start_time: string; event_type: string }>> {
  const [records, events] = await Promise.all([
    findMany<AttendanceRecord>('attendance_records', { user_id: userId }),
    findMany<ChoirEvent>('events'),
  ]);
  const eventsById = new Map(events.map((event) => [event.id, event]));
  return records
    .flatMap((record) => {
      const event = eventsById.get(record.event_id);
      return event
        ? [{
            ...record,
            event_title: event.title,
            event_start_time: event.start_time,
            event_type: event.event_type,
          }]
        : [];
    })
    .sort((a, b) => b.event_start_time.localeCompare(a.event_start_time));
}

export async function getUserAttendanceStats(userId: string): Promise<{
  total: number;
  present: number;
  late: number;
  excused: number;
  absent: number;
  ratePercent: number;
}> {
  const records = await findMany<AttendanceRecord>('attendance_records', { user_id: userId });
  const present = records.filter((record) => record.status === 'PRESENT').length;
  const late = records.filter((record) => record.status === 'LATE').length;
  const excused = records.filter((record) => record.status === 'EXCUSED').length;
  const absent = records.filter((record) => record.status === 'ABSENT').length;
  const total = records.length;

  return {
    total,
    present,
    late,
    excused,
    absent,
    ratePercent: total > 0 ? Math.round(((present + late) / total) * 100) : 100,
  };
}

export async function getChoirAttendanceOverview(): Promise<{
  averageRatePercent: number;
  totalEventsHeld: number;
  recentRecords: AttendanceRecord[];
}> {
  const [records, users] = await Promise.all([
    findMany<AttendanceRecord>('attendance_records', {}, { created_at: -1 }),
    findMany<User>('users'),
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const attended = records.filter((record) => record.status === 'PRESENT' || record.status === 'LATE').length;

  return {
    averageRatePercent: records.length > 0 ? Math.round((attended / records.length) * 100) : 100,
    totalEventsHeld: new Set(records.map((record) => record.event_id)).size,
    recentRecords: records.slice(0, 10).flatMap((record) => {
      const user = usersById.get(record.user_id);
      return user ? [{ ...record, user_name: user.full_name, voice_part: user.voice_part || undefined }] : [];
    }),
  };
}

export async function getFinancialCategories(): Promise<FinancialCategory[]> {
  return findMany<FinancialCategory>('financial_categories', { is_active: 1 }, { type: 1, name: 1 });
}

export async function getFinancialTransactions(filters?: {
  memberId?: string;
  type?: 'INCOME' | 'EXPENSE';
  startDate?: string;
  endDate?: string;
  status?: string;
  limit?: number;
}): Promise<FinancialTransaction[]> {
  const query: Record<string, unknown> = {};
  if (filters?.memberId) query.member_id = filters.memberId;
  if (filters?.type) query.transaction_type = filters.type;
  if (filters?.status) query.status = filters.status;
  if (filters?.startDate || filters?.endDate) {
    query.date = {
      ...(filters.startDate ? { $gte: filters.startDate } : {}),
      ...(filters.endDate ? { $lte: filters.endDate } : {}),
    };
  }

  const [transactions, categories, users] = await Promise.all([
    findMany<FinancialTransaction>('financial_transactions', query, { date: -1, created_at: -1 }, filters?.limit),
    findMany<FinancialCategory>('financial_categories'),
    findMany<User>('users'),
  ]);
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const usersById = new Map(users.map((user) => [user.id, user]));

  return transactions.map((transaction) => ({
    ...transaction,
    category_name: categoriesById.get(transaction.category_id)?.name,
    member_name: transaction.member_id ? usersById.get(transaction.member_id)?.full_name : undefined,
    created_by_name: usersById.get(transaction.created_by)?.full_name,
    reviewed_by_name: transaction.reviewed_by ? usersById.get(transaction.reviewed_by)?.full_name : undefined,
  }));
}

export async function getFinancialSummary(): Promise<{
  totalIncomeCents: number;
  totalExpenseCents: number;
  netBalanceCents: number;
  categoryBreakdown: Array<{ name: string; type: string; total_cents: number }>;
}> {
  const [transactions, categories] = await Promise.all([
    findMany<FinancialTransaction>('financial_transactions', { status: 'POSTED' }),
    findMany<FinancialCategory>('financial_categories'),
  ]);
  const totalIncomeCents = transactions
    .filter((transaction) => transaction.transaction_type === 'INCOME')
    .reduce((total, transaction) => total + transaction.amount_cents, 0);
  const totalExpenseCents = transactions
    .filter((transaction) => transaction.transaction_type === 'EXPENSE')
    .reduce((total, transaction) => total + transaction.amount_cents, 0);
  const totalsByCategory = new Map<string, number>();
  for (const transaction of transactions) {
    totalsByCategory.set(
      transaction.category_id,
      (totalsByCategory.get(transaction.category_id) || 0) + transaction.amount_cents
    );
  }

  const categoryBreakdown = categories
    .flatMap((category) => {
      const total_cents = totalsByCategory.get(category.id);
      return total_cents === undefined ? [] : [{ name: category.name, type: category.type, total_cents }];
    })
    .sort((a, b) => b.total_cents - a.total_cents);

  return {
    totalIncomeCents,
    totalExpenseCents,
    netBalanceCents: totalIncomeCents - totalExpenseCents,
    categoryBreakdown,
  };
}

export async function getUserPaymentSummary(userId: string): Promise<{
  totalPaidCents: number;
  payments: FinancialTransaction[];
}> {
  const transactions = await getFinancialTransactions({ memberId: userId, status: 'POSTED' });
  return {
    totalPaidCents: transactions
      .filter((transaction) => transaction.transaction_type === 'INCOME')
      .reduce((total, transaction) => total + transaction.amount_cents, 0),
    payments: transactions,
  };
}

export async function getAnnouncements(
  requesterRole: UserRole,
  userVoicePart?: string | null,
  userWing?: string | null
): Promise<Announcement[]> {
  const isOfficer = [
    'ADMIN',
    'PRESIDENT',
    'GENERAL_SECRETARY',
    'FINANCIAL_SECRETARY',
    'TREASURER',
  ].includes(requesterRole);
  const [announcements, users] = await Promise.all([
    findMany<Announcement>('announcements', { is_archived: 0 }, { is_pinned: -1, publish_at: -1 }),
    findMany<User>('users'),
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));

  return announcements.flatMap((announcement) => {
    const audience = announcement.target_audience;
    const isForUser =
      audience === 'ALL' ||
      (audience === 'OFFICERS' && isOfficer) ||
      (!!userVoicePart && audience.toUpperCase() === userVoicePart.toUpperCase()) ||
      (!!userWing && audience === 'FAMILY_OF_PRAISE' && userWing === 'Family of Praise') ||
      (!!userWing && audience === 'ASAPHITES' && userWing === 'Asaphites') ||
      (!!userWing && audience === 'VIMMIES' && userWing === 'Vimmies') ||
      isOfficer;
    const author = usersById.get(announcement.author_id);
    return isForUser && author ? [{ ...announcement, author_name: author.full_name }] : [];
  });
}

export async function getMeetings(isOfficer: boolean): Promise<(Meeting & { action_items: ActionItem[] })[]> {
  const [meetings, users, actionItems] = await Promise.all([
    findMany<Meeting>('meetings', isOfficer ? {} : { is_confidential: 0 }, { date: -1 }),
    findMany<User>('users'),
    findMany<ActionItem>('action_items', {}, { created_at: 1 }),
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));

  return meetings.flatMap((meeting) => {
    const creator = usersById.get(meeting.created_by);
    if (!creator) return [];
    const items = actionItems.flatMap((item) => {
      const assignee = usersById.get(item.assigned_to);
      return item.meeting_id === meeting.id && assignee
        ? [{ ...item, assigned_to_name: assignee.full_name }]
        : [];
    });
    return [{ ...meeting, created_by_name: creator.full_name, action_items: items }];
  });
}

export async function getActionItems(filters?: {
  assignedTo?: string;
  status?: string;
}): Promise<ActionItem[]> {
  const query: Record<string, string> = {};
  if (filters?.assignedTo) query.assigned_to = filters.assignedTo;
  if (filters?.status) query.status = filters.status;
  const [items, users, meetings] = await Promise.all([
    findMany<ActionItem>('action_items', query),
    findMany<User>('users'),
    findMany<Meeting>('meetings'),
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const meetingsById = new Map(meetings.map((meeting) => [meeting.id, meeting]));

  return items
    .flatMap((item) => {
      const assignee = usersById.get(item.assigned_to);
      return assignee
        ? [{
            ...item,
            assigned_to_name: assignee.full_name,
            meeting_title: item.meeting_id ? meetingsById.get(item.meeting_id)?.title : undefined,
          }]
        : [];
    })
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '') || b.created_at.localeCompare(a.created_at));
}

export async function getSongs(search?: string, category?: string, voicing?: string): Promise<Song[]> {
  const query: Record<string, unknown> = { is_archived: 0 };
  if (category) query.category = category;
  if (voicing) query.voicing = voicing;
  if (search) {
    const term = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(term, 'i');
    query.$or = [{ title: match }, { composer_or_arranger: match }, { notes: match }];
  }
  const [songs, resources] = await Promise.all([
    findMany<Song>('songs', query, { title: 1 }),
    findMany<SongResource>('song_resources'),
  ]);
  return songs.map((song) => ({
    ...song,
    resources: resources.filter((resource) => resource.song_id === song.id),
  }));
}

export async function getAuditLogs(limit = 50, offset = 0): Promise<AuditLog[]> {
  return findMany<AuditLog>('audit_logs', {}, { created_at: -1 }, limit, offset);
}

function matchesBirthday(birthDate: string | null, monthDay: string): boolean {
  if (!birthDate) return false;
  const parts = birthDate.split('-');
  const birthMonthDay = parts.length === 3
    ? `${parts[1]}-${parts[2]}`
    : `${String(parseInt(parts[0], 10)).padStart(2, '0')}-${String(parseInt(parts[1], 10)).padStart(2, '0')}`;
  return birthMonthDay === monthDay;
}

export async function getTodayBirthdays(): Promise<SafeUser[]> {
  const today = new Date();
  const monthDays = new Set([
    `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
    `${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`,
  ]);
  const users = await findMany<User>('users', { status: 'ACTIVE', birth_date: { $ne: null } }, { full_name: 1 });
  return users
    .filter((user) => Array.from(monthDays).some((monthDay) => matchesBirthday(user.birth_date, monthDay)))
    .map((user) => sanitizeUser(user, 'ADMIN', false));
}

export async function getUpcomingBirthdays(
  daysAhead = 14
): Promise<Array<{ user: SafeUser; birthMonthDay: string; daysUntil: number }>> {
  const users = await findMany<User>('users', { status: 'ACTIVE', birth_date: { $ne: null } }, { full_name: 1 });
  const now = new Date();
  const currentYear = now.getFullYear();
  const todayStart = new Date(currentYear, now.getMonth(), now.getDate()).getTime();
  const results: Array<{ user: SafeUser; birthMonthDay: string; daysUntil: number }> = [];

  for (const user of users) {
    if (!user.birth_date) continue;
    const parts = user.birth_date.split('-');
    if (parts.length < 2) continue;
    const month = parts.length === 3 ? parseInt(parts[1], 10) : parseInt(parts[0], 10);
    const day = parts.length === 3 ? parseInt(parts[2], 10) : parseInt(parts[1], 10);
    if (Number.isNaN(month) || Number.isNaN(day)) continue;
    let birthday = new Date(currentYear, month - 1, day);
    let daysUntil = Math.round((birthday.getTime() - todayStart) / 86400000);
    if (daysUntil < 0) {
      birthday = new Date(currentYear + 1, month - 1, day);
      daysUntil = Math.round((birthday.getTime() - todayStart) / 86400000);
    }
    if (daysUntil >= 0 && daysUntil <= daysAhead) {
      results.push({
        user: sanitizeUser(user, 'ADMIN', false),
        birthMonthDay: `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        daysUntil,
      });
    }
  }

  return results.sort((a, b) => a.daysUntil - b.daysUntil);
}

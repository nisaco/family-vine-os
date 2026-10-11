export type UserRole =
  | 'ADMIN'
  | 'PRESIDENT'
  | 'GENERAL_SECRETARY'
  | 'FINANCIAL_SECRETARY'
  | 'TREASURER'
  | 'WELFARE_OFFICER'
  | 'MEMBER';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type MinistryWing =
  | 'Family of Praise' // The Choir
  | 'Asaphites' // The Instrumentalists
  | 'Vimmies' // The Dancers
  | 'General Leadership';

export type VoicePart =
  | 'Soprano'
  | 'Alto'
  | 'Tenor'
  | 'Bass'
  | 'Choir Director'
  | 'Musician'
  | 'General';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  preferred_name: string | null;
  phone: string | null;
  wing: MinistryWing | null;
  wing_role: string | null;
  voice_part: VoicePart | null;
  role: UserRole;
  status: UserStatus;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  officer_notes: string | null;
  birth_date: string | null;
  join_date: string;
  created_at: string;
  updated_at: string;
}

export type SafeUser = Omit<User, 'password_hash' | 'officer_notes' | 'address' | 'emergency_contact_name' | 'emergency_contact_phone'> & {
  // sensitive fields included only if requester is authorized
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  officer_notes?: string | null;
};

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

export type EventType =
  | 'REHEARSAL'
  | 'CHOIR_REHEARSAL'
  | 'BAND_PRACTICE'
  | 'DANCE_PRACTICE'
  | 'SERVICE'
  | 'CONCERT'
  | 'OFFICER_MEETING'
  | 'GENERAL_MEETING'
  | 'SPECIAL';

export type EventStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export interface ChoirEvent {
  id: string;
  title: string;
  event_type: EventType;
  target_wing: string | null;
  start_time: string;
  end_time: string | null;
  call_time?: string | null;
  attire_notes?: string | null;
  location: string;
  description: string | null;
  organizer_id: string | null;
  rsvp_deadline: string | null;
  status: EventStatus;
  created_at: string;
  updated_at: string;
}

export type RsvpStatus = 'ATTENDING' | 'NOT_ATTENDING' | 'MAYBE';

export interface EventRsvp {
  id: string;
  event_id: string;
  user_id: string;
  status: RsvpStatus;
  apology_reason: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
  wing?: string;
  wing_role?: string;
  voice_part?: string;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE';

export interface AttendanceRecord {
  id: string;
  event_id: string;
  user_id: string;
  status: AttendanceStatus;
  notes: string | null;
  recorded_by: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
  wing?: string;
  wing_role?: string;
  voice_part?: string;
}

export type TransactionType = 'INCOME' | 'EXPENSE';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'CHECK' | 'CARD' | 'OTHER';
export type TransactionStatus = 'POSTED' | 'VOIDED' | 'CORRECTED';

export interface FinancialCategory {
  id: string;
  name: string;
  type: TransactionType;
  description: string | null;
  is_active: number;
  created_at: string;
}

export interface FinancialTransaction {
  id: string;
  transaction_type: TransactionType;
  receipt_number: string | null;
  category_id: string;
  category_name?: string;
  amount_cents: number; // Stored as integer minor unit (e.g. cents)
  date: string;
  member_id: string | null;
  member_name?: string;
  dues_period: string | null;
  payee_or_source: string;
  description: string;
  payment_method: PaymentMethod;
  status: TransactionStatus;
  reference_note: string | null;
  created_by: string;
  created_by_name?: string;
  reviewed_by: string | null;
  reviewed_by_name?: string;
  reviewed_at: string | null;
  reversal_of_id: string | null;
  reversal_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type AnnouncementAudience =
  | 'ALL'
  | 'OFFICERS'
  | 'FAMILY_OF_PRAISE'
  | 'ASAPHITES'
  | 'VIMMIES'
  | 'SOPRANO'
  | 'ALTO'
  | 'TENOR'
  | 'BASS';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  target_audience: AnnouncementAudience;
  is_pinned: number;
  is_archived: number;
  publish_at: string;
  expires_at: string | null;
  author_id: string;
  author_name?: string;
  created_at: string;
  updated_at: string;
}

export type MeetingType = 'OFFICER_MEETING' | 'GENERAL_MEETING' | 'SECTIONAL' | 'WING_MEETING';

export interface Meeting {
  id: string;
  title: string;
  meeting_type: MeetingType;
  date: string;
  location: string | null;
  minutes: string;
  is_confidential: number;
  created_by: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export type ActionItemStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface ActionItem {
  id: string;
  meeting_id: string | null;
  meeting_title?: string;
  title: string;
  description: string | null;
  assigned_to: string;
  assigned_to_name?: string;
  due_date: string | null;
  status: ActionItemStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type Voicing = 'SATB' | 'SSA' | 'TTBB' | 'UNISON' | 'SOLO_CHOIR' | 'OTHER';
export type SongCategory = 'HYMN' | 'ANTHEM' | 'PRAISE' | 'WORSHIP' | 'CHRISTMAS' | 'EASTER' | 'SPIRITUAL' | 'CONTEMPORARY' | 'OTHER';
export type ResourceType =
  | 'SHEET_MUSIC_LINK'
  | 'AUDIO_REHEARSAL_LINK'
  | 'CHORD_CHART_LINK'
  | 'DANCE_CHOREO_LINK'
  | 'VIDEO_PERFORMANCE_LINK'
  | 'DOC_LINK';

export interface SongResource {
  id: string;
  song_id: string;
  resource_type: ResourceType;
  title: string;
  url: string;
  voice_part: 'ALL' | 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS' | null;
  target_wing: 'ALL' | 'Family of Praise' | 'Asaphites' | 'Vimmies' | null;
  created_at: string;
}

export interface Song {
  id: string;
  title: string;
  composer_or_arranger: string | null;
  voicing: Voicing | null;
  category: SongCategory | null;
  key_signature: string | null;
  tempo: string | null;
  lyrics_or_scripture: string | null;
  notes: string | null;
  is_archived: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  resources?: SongResource[];
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface ChoirSettings {
  choir_name: string;
  motto: string;
  timezone: string;
  currency_code: string;
  currency_symbol: string;
  contact_email: string;
  contact_phone: string;
  standard_monthly_dues_cents: number;
  allow_member_birthday_view: boolean;
}

# Family Vine Choir Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, resilient, beautifully designed full-stack web application called "Family Vine Choir" for choir administration and members with role-based access, financial integrity, attendance tracking, event RSVP, music library, and audit trails.

**Architecture:** Next.js 14 App Router full-stack architecture with a robust SQLite database layer using `better-sqlite3`, WAL mode, foreign keys, schema migrations, integer minor-unit arithmetic for finance, server-side session cookies with secure hashing, role-based authorization guards on all server endpoints, and a responsive Tailwind CSS UI.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide React, Better-SQLite3, Bcryptjs, Vitest.

## Global Constraints
- Runs locally with zero paid third-party dependencies or external database servers.
- Role-based permissions strictly enforced on server-side handlers/actions, not just client UI.
- All dashboard statistics and figures must be computed from persisted SQLite records.
- Financial numbers stored as integer minor-units (cents) to avoid floating-point errors.
- Posted financial records cannot be silently modified or deleted (correction/reversal log only).
- Formula-injection safety on all CSV exports (escaping `=`, `+`, `-`, `@`, etc.).
- Configurable choir settings (Timezone, Currency, Choir Name, Dues Amount, Contacts).
- Mobile-first responsive UX with warm, restrained choir identity (burgundy/gold/warm-slate palette).

---

### Task 1: Environment, Configuration, and Database Foundation
- Create `.env.example` with non-secret defaults.
- Create SQLite database manager (`lib/db/index.ts`) with WAL mode, foreign keys, and migration runner (`lib/db/migrate.ts`).
- Define schema: settings, users, sessions, audit_logs, events, rsvps, attendance, financial_categories, financial_transactions, dues_assessments, announcements, meetings, meeting_action_items, songs, song_resources.
- Add test database runner for isolated unit and integration tests.

### Task 2: Authentication, Security & First-Admin Initialization
- Implement password hashing (bcryptjs) and secure cookie sessions (`lib/auth/index.ts`).
- Implement first-admin check and setup flow (`/setup` and `scripts/init-admin.mjs`), ensuring it is disabled once an administrator exists.
- Implement sign-in and sign-out server actions and pages (`/login`).
- Implement account status enforcement: deactivated accounts cannot sign in.
- Implement server-side role validation helpers (`hasPermission`, `requireRole`, `requireUser`).

### Task 3: Choir Settings & Audit Logging Engine
- Store configurable settings in database: choir name, motto, currency (code, symbol), timezone, contact email/phone, dues configuration.
- Server actions to update settings with strict ADMIN / PRESIDENT authorization.
- System-wide audit logging helper (`logAudit({ actorId, action, entityType, entityId, details })`).
- Audit log explorer page for authorized officers.

### Task 4: Member Directory & Profile Management
- Member schema with voice parts (Soprano, Alto, Tenor, Bass, Musician, Director), roles, join date, emergency contact, notes.
- Private field masking: sensitive fields (emergency contact, private notes, address) restricted from ordinary members.
- Member management: invite/create member, edit profile, deactivate/reactivate member (soft deactivation).
- Personal profile page (`/profile`) allowing users to edit their own permissible details.

### Task 5: Events, Calendar & RSVP System
- Events table supporting Rehearsals, Sunday Services, Concerts, Officer Meetings.
- Timezone formatting matching choir settings.
- Interactive month calendar and responsive agenda/list views.
- Member RSVP flow: Attending, Not Attending, Maybe, plus absence apology note.
- Officers RSVP roster and summary counts.
- Cancelled/past/upcoming event state visual treatment.

### Task 6: Attendance Taking & Tracking
- Event attendance roster with one-tap status: Present, Late, Excused, Absent.
- Duplicate prevention enforced at SQLite schema level (unique constraint on `event_id` + `user_id`).
- Officer correction flow with mandatory reason captured in audit trail.
- Choir attendance rate statistics and personal member attendance view (`/my-attendance`).

### Task 7: Financial Integrity & Ledger Module
- Exact integer minor-unit currency calculations (cents) and formatters (`lib/utils/currency.ts`).
- Income recording (dues, donations, fundraising) with member attribution and auto-generated receipt numbers (`REC-YYYY-XXXX`).
- Expense recording (payee, description, category, supporting notes).
- Immutability enforcement: posted transactions cannot be deleted or silently edited. Reversal/correction transaction required.
- Approval workflow / review notes with separation of duties.
- Dues tracking by period and outstanding balances.
- CSV export with formula injection prevention (`'=`, `'+`, etc.).
- Financial reports (Income vs Expense, category totals, net balance).
- Members restricted to viewing their own personal payments and receipts only (`/my-finances`).

### Task 8: Announcements Module
- Announcements with audience targeting (All Members, Officers Only, Voice Section).
- Expiry date, pinned state, archive state.
- Markdown/rich text sanitization and readable typography.
- Role-filtered announcement feed on dashboard and dedicated page.

### Task 9: Meetings, Minutes & Action Items
- Meeting minutes recording (General meetings, Officer meetings).
- Confidential officer minutes vs member-visible minutes.
- Action items tracking with assignee, due date, status (Pending, In Progress, Completed).
- Filterable past meeting archive.

### Task 10: Song & Choir Resource Library
- Music library database: Title, composer, key, voicing (SATB, etc.), season/category.
- Resource links: Sheet music URL, rehearsal audio link, YouTube reference.
- Search and filtering by voice part, liturgical season, key.

### Task 11: Role-Aware Dashboards & Navigation
- President Dashboard: High-level health, attendance trends, financial overview, upcoming events.
- General Secretary Dashboard: Next event, roster actions, minutes pending, attendance reminders.
- Financial Secretary & Treasurer Dashboard: Revenue/expense snapshot, recent dues, pending approvals.
- Member Dashboard: Next rehearsal countdown, personal RSVP status, my attendance rate, personal dues status, recent announcements.
- Clean responsive layout with sidebar for desktop and mobile drawer/bottom bar.

### Task 12: Comprehensive Automated Test Suite & Verification
- Unit & integration tests for:
  - Auth, session validation, password security.
  - Role-based permissions (President, Secretary, Treasurer, Financial Secretary, Member, Admin).
  - Member privacy boundaries (cannot view other members' private records or ledgers).
  - Duplicate attendance prevention.
  - RSVP submission and update.
  - Financial exact arithmetic, reversal immutability, receipt generation.
  - Formula injection safe CSV export.
  - Audit log recording.
- Full type-checking (`tsc --noEmit`), linting, and production build (`npm run build`).

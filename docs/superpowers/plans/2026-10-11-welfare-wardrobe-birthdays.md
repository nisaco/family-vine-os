# Welfare Officer, Program Attire, and Birthday Celebration Implementation Plan

## Overview
Implement the Welfare Officer role, program uniform/attire directives, call-time scheduling, and member birthday celebration and registry across Family Vine.

## Technical Scope
1. **Welfare Officer Role (`WELFARE_OFFICER`)**: Authorized for welfare notices, event attire directives, and member care records.
2. **Event Attire & Call Time**: Dedicated `attire_notes` and `call_time` on events, highlighted on the Dashboard and Events modules.
3. **Birthday Capture & Dignified Celebration**: Prominent birth date capture in Directory, personalized birthday celebration banner on the Dashboard when it is the user's birthday, and an upcoming birthday registry for member care.
4. **Zero Emojis & Executive-Grade UI**: Restrained institutional aesthetic, monospace dates/times, and responsive layouts across desktop and mobile.

## Tasks

### Task 1: Core Domain & Schema Migration
- File: `lib/types.ts`
  - Add `'WELFARE_OFFICER'` to `UserRole`.
  - Add `call_time?: string | null` and `attire_notes?: string | null` to `ChoirEvent`.
- File: `lib/db/schema.sql` & `lib/db/migrate.ts`
  - Migrate `users` table to include `WELFARE_OFFICER` in role check constraint.
  - Add `call_time` and `attire_notes` columns to `events` table via dynamic PRAGMA migration.
- File: `lib/auth/index.ts`
  - Add `WELFARE_OFFICER` permissions for `MANAGE_ANNOUNCEMENTS`, `MANAGE_EVENTS` (attire/welfare updates), and `VIEW_ALL_MEMBERS_FULL_DETAILS`.

### Task 2: Data Access & Server Actions
- File: `lib/data/index.ts`
  - Return `call_time` and `attire_notes` in `getEvents` and `getEventById`.
  - Add `getTodayBirthdays()` and `getUpcomingBirthdays()` queries.
- File: `lib/actions/events.ts`
  - Accept and persist `callTime` and `attireNotes` in `createEventAction` and `updateEventAction`.
- File: `lib/actions/members.ts`
  - Accept and validate `birthDate` in `createMemberAction` and `updateMemberAction`.

### Task 3: Event Attire & Call Time UI
- File: `components/events/EventsClient.tsx`
  - Add Call Time and Attire / Uniform Directive fields in Create and Edit event dialogs.
  - Display Call Time and Attire notes prominently on Event cards.

### Task 4: Birthday Recognition & Next Event Spotlight on Dashboard
- File: `app/(dashboard)/dashboard/page.tsx`
  - If today is logged-in user's birthday, render institutional Birthday Celebration Banner.
  - Render Birthday Registry card showing today's and upcoming member birthdays.
  - Update Next Event card to display Call Time and Program Attire.

### Task 5: Directory Client Birthday Capture
- File: `components/members/DirectoryClient.tsx`
  - Prominently feature Birth Date in Create & Edit Member modals.
  - Display birthday badges and assign `WELFARE_OFFICER` role in role dropdown.

### Task 6: Seed Script & Verification
- File: `scripts/seed.mjs`
  - Seed Welfare Officer account (`welfare@familyvinechoir.org`).
  - Seed events with `call_time` and `attire_notes`.
  - Seed member birthday matching current date for verification.
- Verification commands:
  - `node scripts/seed.mjs`
  - `npx tsc --noEmit`
  - `npm test`
  - `npm run build`


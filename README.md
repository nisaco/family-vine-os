# Family Vine Choir — Administration & Member Portal

> **United in Harmony, Rooted in Grace**

A full-stack web application designed for the administrative and day-to-day operations of **Family Vine Choir**. Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, and SQLite with WAL mode, foreign key enforcement, and exact integer minor-unit financial accounting.

---

## Key Features & Role-Based Access

The system enforces least-privilege role boundaries on the server across all actions and data queries:

1. **Access Administrator (`ADMIN`)**
   - Root installation configuration (Choir name, motto, currency code/symbol, timezone, standard dues).
   - Member access management (inviting users, assigning roles, deactivating or restoring accounts).
   - Inspection of the immutable system-wide audit history.
   - Deactivated users are blocked from logging in; active sessions are invalidated immediately upon deactivation.

2. **President (`PRESIDENT`)**
   - Comprehensive high-level executive dashboard (attendance health, revenue/expense balances, upcoming gatherings).
   - Management of choir announcements and scheduling of events.
   - Restricted from sensitive individual member private notes or raw unauthorized financial mutations.

3. **General Secretary (`GENERAL_SECRETARY`)**
   - Member directory administration (contact details, voice section registrations).
   - Real-time mobile-friendly rehearsal and service attendance taking (Present, Absent, Excused, Late).
   - Meeting minutes recorder (supporting confidential officer minutes vs. choir-wide releases).
   - Action item tracker with assigned responsibilities, deadlines, and status updates.

4. **Financial Secretary (`FINANCIAL_SECRETARY`)**
   - Member dues collection and donation recording with auto-generated receipt numbers (`REC-YYYY-XXXX`).
   - Payment method recording (Cash, Bank Transfer, Mobile Money, Check, Card).
   - Ledger inspection and dues tracking by member and period.

5. **Treasurer (`TREASURER`)**
   - Expense disbursement logging with payee, purpose, category, and voucher references.
   - Financial ledger reconciliation, income vs. expense balance reporting.
   - Independent verification / review of financial entries (enforcing separation of duties: officers cannot approve entries they created themselves).
   - Non-destructive voiding/reversal flow with mandatory audit reasoning (posted records cannot be silently deleted).
   - Safe CSV report export protected against spreadsheet formula injection (CWE-1236).

6. **Choir Members (`MEMBER`)**
   - Dedicated mobile-friendly member portal.
   - Immediate countdown and details for next rehearsal or service.
   - One-click RSVP submission (Attending, Cannot Attend, Tentative) with absence apology messaging.
   - View personal attendance history, rate percentage, and excuse records.
   - View personal dues payments and printable/viewable official receipts.
   - Repertoire music library with sheet music PDF links, vocal practice stems, and performance references.
   - Masked member directory (private residential address, emergency contacts, and officer notes are strictly restricted from other choristers).

---

## Technical Stack & Architecture

- **Framework**: Next.js 14.2 (App Router with Server Actions & Server Components)
- **Database**: Relational SQLite via `better-sqlite3`
  - Write-Ahead Logging (`PRAGMA journal_mode = WAL`)
  - Strict Foreign Keys (`PRAGMA foreign_keys = ON`)
  - Normal Synchronous (`PRAGMA synchronous = NORMAL`)
- **Authentication**: Pure Server-Side Sessions with HTTP-only cookies and Bcrypt password hashing (`bcryptjs`)
- **Financial Arithmetic**: Exact integer minor units (cents / pesewas) to eliminate floating-point arithmetic errors.
- **Styling**: Tailwind CSS with warm choral palette (burgundy, gold accents, warm stone surfaces)
- **Icons**: Lucide React
- **Test Framework**: Vitest with in-memory SQLite isolation

---

## Getting Started & Local Setup

### 1. Prerequisites
- Node.js 18.x, 20.x, or 22.x
- npm 9+

### 2. Installation
Clone the repository and install dependencies:
```bash
cd "Family Vine App"
npm install
```

### 3. Environment Variables
Create `.env.local` by copying `.env.example`:
```bash
cp .env.example .env.local
```

Default configuration in `.env.example`:
```env
# Database file location (defaults to ./data/family_vine.db)
DATABASE_PATH=./data/family_vine.db

# Authentication secret for signing tokens
AUTH_SECRET=replace_with_a_secure_random_string_at_least_32_characters_long

PORT=3000
NODE_ENV=development
```

### Production database persistence on Render

Administrator accounts and choir data are stored in the SQLite database, not on an individual device. The first-administrator setup is only for an empty database. After setup, every device using the same deployed URL should sign in with the same administrator account; each device has its own session cookie.

Render must use a persistent disk for the database. The included `render.yaml` configures:

- `DATABASE_PATH=/var/data/family_vine.db`
- A persistent disk mounted at `/var/data`

For an existing Render web service, confirm those settings in the service dashboard. A manually created service does not automatically inherit later changes to `render.yaml`; sync the Blueprint or attach the disk and set the environment variable in the dashboard. Do not delete or replace the disk when deploying. If setup appears again on the same deployed URL, verify that the service is using the existing disk and database before initializing another account. A database on Render's temporary filesystem can be lost on redeploy, which also removes its users and choir data.

### 4. Database Migrations
Migrations run automatically upon first database connection, creating all tables, indexes, default categories, and choir settings.

### 5. Initializing the First Administrator
Security Rule: To prevent unauthorized privilege escalation, there are NO hard-coded or default admin passwords in production.

#### Option A: Via Web Browser Setup Flow
1. Start the development server (`npm run dev`).
2. Visit `http://localhost:3000/setup`.
3. Provide your name, email, and password (min 8 characters).
4. Once completed, the `/setup` gateway is automatically locked forever against replay.

#### Option B: Via Secure CLI Command
Run the setup script in your terminal:
```bash
npm run init-admin
```
Or with flags:
```bash
node scripts/init-admin.mjs --name "Admin Name" --email "admin@familyvinechoir.org" --password "SecurePassword123!"
```
*Note: If any administrator or users already exist, this command refuses to run and exits with an error.*

### 6. Optional Demo Data Seeding (Local Evaluation Only)
To populate a rich, realistic choir dataset for local evaluation:
```bash
npm run seed
```

> **Warning:** This command is strictly for local testing. It creates sample accounts with the temporary password `Password123!`:
> - Administrator: `admin@familyvinechoir.org`
> - President: `president@familyvinechoir.org`
> - General Secretary: `secretary@familyvinechoir.org`
> - Financial Secretary: `finsec@familyvinechoir.org`
> - Treasurer: `treasurer@familyvinechoir.org`
> - Tenor Member: `kofi.ansah@familyvinechoir.org`
> - Soprano Member: `akua.serwaa@familyvinechoir.org`
> - Musician Member: `yaw.bio@familyvinechoir.org`

### 7. Running the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running Automated Tests

Run the test suite using Vitest:
```bash
npm run test
```

To run in watch mode:
```bash
npm run test:watch
```

### What Is Tested
- **Authentication & Sessions**: Password hashing, verification, session creation, session expiration, and immediate rejection of deactivated accounts.
- **Role Permissions**: Matrix check of all permitted vs. forbidden actions for Admin, President, General Secretary, Financial Secretary, Treasurer, and Member.
- **Member Privacy Boundaries**: Masking of private residential addresses, emergency contacts, and officer notes when ordinary members view profiles or directories.
- **Duplicate Attendance Prevention**: Database unique constraints preventing duplicate attendance records for the same member and gathering.
- **RSVP Submissions**: Upserting responses (Attending, Cannot Attend, Tentative) and absence apologies.
- **Financial Integrity**: Exact minor-unit integer parsing, positive amount validation, sequential receipt numbers (`REC-YYYY-XXXX`), and immutable voiding/reversal flows.
- **Spreadsheet Security**: CSV export sanitization preventing formula injection (CWE-1236) by escaping cells starting with `=`, `+`, `-`, `@`, `\t`, `\r`.

---

## Known Scope & Operational Boundaries

1. **Local File Storage vs. Cloud Storage**: Song resources currently support verified external URLs (IMSLP, Google Drive, ChoraLine, YouTube). Direct binary file upload to S3/Cloud Storage is left for deployment-specific configurations.
2. **Financial Scope**: The application is an internal ledger and bookkeeping system; it does not connect directly to banking APIs or process credit card payments natively.
3. **Email Notifications**: Outgoing SMTP integration for invitations and reminder alerts can be connected to standard providers using the audit log event triggers.


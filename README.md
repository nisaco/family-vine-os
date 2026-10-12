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
- **Database**: MongoDB via the official Node.js driver; SQLite is retained only for one-time data migration
- **Authentication**: Pure Server-Side Sessions with HTTP-only cookies and Bcrypt password hashing (`bcryptjs`)
- **Financial Arithmetic**: Exact integer minor units (cents / pesewas) to eliminate floating-point arithmetic errors.
- **Styling**: Tailwind CSS with warm choral palette (burgundy, gold accents, warm stone surfaces)
- **Icons**: Lucide React
- **Test Framework**: Vitest

---

## Getting Started & Local Setup

### 1. Prerequisites
- Node.js 20.19 or later
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
# MongoDB connection string. Keep the real value secret; do not commit it.
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/family_vine?retryWrites=true&w=majority
MONGODB_DB=family_vine

# Authentication secret for signing tokens
AUTH_SECRET=replace_with_a_secure_random_string_at_least_32_characters_long

PORT=3000
NODE_ENV=development
```

### Production database persistence on Render

Administrator accounts and choir data are stored in MongoDB, not on an individual device. The first-administrator setup is only for an empty database. After setup, every device using the same deployed URL should sign in with the same administrator account; each device has its own session cookie.

Set `MONGODB_URI` as a secret in the Render service environment, and set `MONGODB_DB` to the target database name. The included `render.yaml` requests the URI as a non-synced secret and configures `/setup` as the database health check. Do not paste the connection string into source code or commit it.

Keep any existing Render disk that contains the source SQLite database until its data is exported and verified in MongoDB. Do not delete or replace a disk containing the source database before migration. After confirming all data in MongoDB, the old disk can be removed from the Render service and configuration.

For an existing Render web service, add `MONGODB_URI` in the dashboard as a secret environment variable and confirm the selected database name. A manually created service does not automatically inherit later changes to `render.yaml`; sync the Blueprint or update the service environment manually. If setup appears again on the same deployed URL, verify MongoDB is pointing at the correct existing database before initializing another account.

### 4. Migrating an Existing SQLite Database
Before switching an existing installation, retain a backup of the current SQLite file. Configure `MONGODB_URI` and optionally `MONGODB_DB` in the shell where you run the command, then run:

```bash
SQLITE_PATH=/path/to/family_vine.db npm run migrate:mongodb
```

On Windows PowerShell:

```powershell
$env:SQLITE_PATH = "D:\path\to\family_vine.db"
npm run migrate:mongodb
```

The migration is resumable and does not overwrite MongoDB records. It stops if an existing MongoDB record with the same ID differs from the SQLite record. Verify the per-collection counts printed by the script before removing the old disk. The web application creates MongoDB indexes and seeds default choir settings/categories on its first successful connection. Stop the app before copying its SQLite file so recent WAL writes are included. If migrating the Render disk, run the command from a Render shell with `SQLITE_PATH=/var/data/family_vine.db`; keep the disk until all collection counts are verified. Add the MongoDB Atlas IP access entries for the Render service's outbound IP addresses, and use a dedicated database user with only the permissions this app needs.

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

> **Warning:** This command requires `MONGODB_URI` and writes demo records to the configured MongoDB database. Use a separate, disposable development database only. It creates sample accounts with the temporary password `Password123!`:
> - Administrator: `admin@familyvinechoir.org`
> - President: `president@familyvinechoir.org`
> - General Secretary: `secretary@familyvinechoir.org`
> - Financial Secretary: `finsec@familyvinechoir.org`
> - Treasurer: `treasurer@familyvinechoir.org`
> - Tenor Member: `kofi.ansah@familyvinechoir.org`
> - Soprano Member: `akua.serwaa@familyvinechoir.org`
> - Musician Member: `yaw.bio@familyvinechoir.org`

### 7. Preparing for Production (Stripping Demo Data)
When church executives approve the deployment for official ministry operations, all demonstration and testing records can be cleanly and permanently purged:
```bash
npm run db:wipe
```
*Note: This command requires `MONGODB_URI` and interactively prompts for confirmation (`WIPE DEMO DATA`) to prevent accidental execution. You can also pass `--force` in non-interactive environments.*

Once the database is clean, the application automatically welcomes leadership to the pristine web onboarding wizard at `/setup`, or an administrator can be provisioned via CLI:
```bash
npm run init-admin
```

### 8. Running the Application
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

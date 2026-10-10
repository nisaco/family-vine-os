#!/usr/bin/env node
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import readline from 'readline';

const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data', 'family_vine.db');

if (dbPath !== ':memory:') {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Check if any admin or users exist
const userCount = db.prepare('SELECT count(*) as count FROM users').get();
if (userCount.count > 0) {
  console.error('\n[SECURITY ERROR] System is already initialized. First administrator already exists.');
  console.error('This command can only be used on an uninitialized system to prevent unauthorized privilege escalation.\n');
  process.exit(1);
}

// Parse command line arguments or prompt
const args = process.argv.slice(2);
let email = '';
let password = '';
let fullName = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--email' && args[i + 1]) email = args[i + 1];
  if (args[i] === '--password' && args[i + 1]) password = args[i + 1];
  if (args[i] === '--name' && args[i + 1]) fullName = args[i + 1];
}

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

async function main() {
  console.log('=== Family Vine Choir - First Administrator Setup ===');
  console.log('Setting up the root administrator for your choir installation.\n');

  if (!fullName) {
    fullName = await prompt('Enter Administrator Full Name (e.g. John Doe): ');
  }
  if (!email) {
    email = await prompt('Enter Administrator Email Address: ');
  }
  if (!password) {
    password = await prompt('Enter Administrator Password (min 8 characters): ');
  }

  if (!email || !email.includes('@')) {
    console.error('Error: A valid email address is required.');
    process.exit(1);
  }

  if (!fullName) {
    console.error('Error: Full name is required.');
    process.exit(1);
  }

  if (!password || password.length < 8) {
    console.error('Error: Password must be at least 8 characters long.');
    process.exit(1);
  }

  const id = `usr_admin_${Date.now()}`;
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(password, 10);

  db.prepare(`
    INSERT INTO users (
      id, email, password_hash, full_name, preferred_name, phone, voice_part,
      role, status, join_date, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    email.toLowerCase(),
    passwordHash,
    fullName,
    fullName.split(' ')[0],
    null,
    'Director',
    'ADMIN',
    'ACTIVE',
    now.slice(0, 10),
    now,
    now
  );

  // Log audit entry
  const audId = `aud_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  db.prepare(`
    INSERT INTO audit_logs (id, actor_id, actor_name, action, entity_type, entity_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    audId,
    id,
    fullName,
    'INITIALIZE_FIRST_ADMIN',
    'USER',
    id,
    JSON.stringify({ email: email.toLowerCase(), role: 'ADMIN' }),
    now
  );

  console.log('\n[SUCCESS] First administrator created successfully!');
  console.log(`- Email: ${email}`);
  console.log(`- Role: ADMIN`);
  console.log('\nYou can now start the application and sign in with these credentials.');
}

main().catch((err) => {
  console.error('Failed to initialize administrator:', err);
  process.exit(1);
});

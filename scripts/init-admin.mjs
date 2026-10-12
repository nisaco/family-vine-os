#!/usr/bin/env node
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import readline from 'node:readline';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is required. Set it in your shell or environment; do not put it in source code.');
  process.exit(1);
}

const args = process.argv.slice(2);
let email = '';
let password = '';
let fullName = '';
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === '--email' && args[index + 1]) email = args[index + 1];
  if (args[index] === '--password' && args[index + 1]) password = args[index + 1];
  if (args[index] === '--name' && args[index + 1]) fullName = args[index + 1];
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => {
    rl.close();
    resolve(answer.trim());
  }));
}

async function main() {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || 'family_vine');
    const users = db.collection('users');

    await users.createIndex({ id: 1 }, { unique: true });
    await users.createIndex(
      { email: 1 },
      { unique: true, collation: { locale: 'en', strength: 2 } }
    );
    await users.createIndex(
      { is_initial_admin: 1 },
      { unique: true, partialFilterExpression: { is_initial_admin: true } }
    );
    await db.collection('audit_logs').createIndex({ id: 1 }, { unique: true });

    if (await users.countDocuments() > 0) {
      throw new Error('System is already initialized. The administrator command only works before any users exist.');
    }

    if (!fullName) fullName = await prompt('Enter Administrator Full Name: ');
    if (!email) email = await prompt('Enter Administrator Email Address: ');
    if (!password) password = await prompt('Enter Administrator Password (min 8 characters): ');

    email = email.trim().toLowerCase();
    if (!email.includes('@')) throw new Error('A valid email address is required.');
    if (!fullName.trim()) throw new Error('Full name is required.');
    if (password.length < 8) throw new Error('Password must be at least 8 characters long.');

    const id = `usr_admin_${Date.now()}`;
    const now = new Date().toISOString();
    const passwordHash = await bcrypt.hash(password, 10);
    await users.insertOne({
      id,
      email,
      password_hash: passwordHash,
      full_name: fullName.trim(),
      preferred_name: fullName.trim().split(' ')[0],
      phone: null,
      voice_part: 'Director',
      role: 'ADMIN',
      status: 'ACTIVE',
      join_date: now.slice(0, 10),
      created_at: now,
      updated_at: now,
      is_initial_admin: true,
    });
    await db.collection('audit_logs').insertOne({
      id: `aud_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      actor_id: id,
      actor_name: fullName.trim(),
      action: 'INITIALIZE_FIRST_ADMIN',
      entity_type: 'USER',
      entity_id: id,
      details: JSON.stringify({ email, role: 'ADMIN' }),
      ip_address: null,
      created_at: now,
    });

    console.log(`Administrator created successfully for ${email}.`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('Failed to initialize administrator:', error.message);
  process.exitCode = 1;
});

#!/usr/bin/env node
/**
 * Family Vine Executive Production Preparation Script
 * Strips out all demo/evaluation records from the database
 * to prepare the application for real church production.
 */

import { MongoClient } from 'mongodb';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const uri =
  process.env.MONGODB_URI ||
  process.env.MONGODB_URL ||
  process.env.MONGO_URI ||
  process.env.DATABASE_URL;

if (!uri) {
  console.error('[ERROR] MONGODB_URI environment variable is required to wipe demo data.');
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes('--force') || args.includes('-f');

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    })
  );
}

const COLLECTIONS_TO_CLEAR = [
  'users',
  'sessions',
  'audit_logs',
  'events',
  'event_rsvps',
  'attendance_sessions',
  'attendance_records',
  'attendance_corrections',
  'finance_transactions',
  'announcements',
  'meeting_minutes',
  'meeting_attendees',
  'action_items',
  'songs',
  'song_resources',
  'app_settings',
];

async function wipeProductionData() {
  console.log('================================================================');
  console.log('       FAMILY VINE CHOIR OS - PRODUCTION DATA PURGE             ');
  console.log('================================================================');
  console.log('This operation will permanently remove all evaluation and demo');
  console.log('records from the database to prepare for live church rollout.\n');

  if (!force) {
    const confirmation = await prompt(
      'Type "WIPE DEMO DATA" to confirm complete removal of evaluation data: '
    );
    if (confirmation !== 'WIPE DEMO DATA') {
      console.log('\n[ABORTED] Purge cancelled. No changes were made.');
      process.exit(0);
    }
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  try {
    await client.connect();
    const dbName = process.env.MONGODB_DB || 'family_vine';
    const db = client.db(dbName);

    console.log(`\nConnecting to database "${dbName}"...`);

    let totalDeleted = 0;
    for (const collectionName of COLLECTIONS_TO_CLEAR) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        if (count > 0) {
          const result = await collection.deleteMany({});
          console.log(` - Cleared ${collectionName}: ${result.deletedCount} records removed.`);
          totalDeleted += result.deletedCount;
        } else {
          console.log(` - ${collectionName}: already empty.`);
        }
      } catch (err) {
        console.warn(` - Warning on ${collectionName}: ${err.message}`);
      }
    }

    // Clean local development SQLite if present
    const sqlitePath = path.resolve(process.cwd(), 'data', 'family_vine.db');
    if (fs.existsSync(sqlitePath)) {
      try {
        fs.unlinkSync(sqlitePath);
        console.log(' - Removed local development SQLite cache.');
      } catch {
        // Ignore file lock if any
      }
    }

    console.log('\n================================================================');
    console.log(`[SUCCESS] Purge complete. ${totalDeleted} total demo records stripped.`);
    console.log('================================================================');
    console.log('Your production environment is completely clean and ready.\n');
    console.log('Next step:');
    console.log('1. Visit your app URL in the browser (e.g. /setup) to run the onboarding wizard, OR');
    console.log('2. Run: npm run init-admin -- --name "Your Name" --email "your@email.com" --password "YourPassword"\n');
  } finally {
    await client.close();
  }
}

wipeProductionData().catch((err) => {
  console.error('\n[FATAL] Failed to wipe database:', err.message);
  process.exit(1);
});


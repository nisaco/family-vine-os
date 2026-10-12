#!/usr/bin/env node
import Database from 'better-sqlite3';
import { MongoClient } from 'mongodb';
import path from 'node:path';
import fs from 'node:fs';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is required. Set it in your shell or environment; do not put it in source code.');
  process.exit(1);
}

const sqlitePath = process.env.SQLITE_PATH || path.resolve(process.cwd(), 'data', 'family_vine.db');
if (!fs.existsSync(sqlitePath)) {
  console.error(`SQLite source database was not found at "${sqlitePath}". Set SQLITE_PATH to the existing database file.`);
  process.exit(1);
}

const databaseName = process.env.MONGODB_DB || 'family_vine';
const tableNames = [
  'settings',
  'users',
  'sessions',
  'events',
  'event_rsvps',
  'attendance_records',
  'financial_categories',
  'financial_transactions',
  'announcements',
  'meetings',
  'action_items',
  'songs',
  'song_resources',
  'audit_logs',
];
const defaultSettings = new Map([
  ['choir_name', 'Family Vine Choir'],
  ['motto', 'United in Harmony, Rooted in Grace'],
  ['timezone', 'UTC'],
  ['currency_code', 'USD'],
  ['currency_symbol', '$'],
  ['contact_email', 'contact@familyvinechoir.org'],
  ['contact_phone', '+1 555-0199'],
  ['standard_monthly_dues_cents', '2500'],
  ['allow_member_birthday_view', 'true'],
]);
const defaultCategories = new Map([
  ['cat_inc_dues', ['Monthly Member Dues', 'INCOME', 'Regular recurring monthly dues paid by members across all wings']],
  ['cat_inc_donations', ['General Donations', 'INCOME', 'Freewill donations from members and patrons']],
  ['cat_inc_fundraising', ['Fundraising & Concert Tickets', 'INCOME', 'Special fundraising initiatives and performance ticket proceeds']],
  ['cat_inc_special', ['Thanksgiving & Harvest Offerings', 'INCOME', 'Special thanksgiving collections and harvest offerings']],
  ['cat_inc_music', ['Music & Regalia Contribution', 'INCOME', 'Member contributions toward scores, instruments, and costumes']],
  ['cat_exp_scores', ['Music Scores & Sheet Charts', 'EXPENSE', 'Purchased sheet music, chord charts, and licensing costs']],
  ['cat_exp_audio', ['Instruments & Sound Maintenance', 'EXPENSE', 'Audio accessories, cables, instrument repairs, and microphones']],
  ['cat_exp_uniforms', ['Robes, Uniforms & Dance Attire', 'EXPENSE', 'Choir robes, stoles, and Vimmies dance costumes']],
  ['cat_exp_refresh', ['Rehearsal Refreshments', 'EXPENSE', 'Water and refreshments for rehearsals and long ministrations']],
  ['cat_exp_honoraria', ['Director & Guest Honoraria', 'EXPENSE', 'Honoraria for music directors, guest musicians, and instructors']],
  ['cat_exp_venue', ['Venue Rental & Transport', 'EXPENSE', 'Rehearsal space rentals and ministry bus transportation']],
  ['cat_exp_admin', ['Administrative & Software', 'EXPENSE', 'Office stationery, bank charges, and web software costs']],
  ['cat_exp_welfare', ['Member Welfare & Benevolence', 'EXPENSE', 'Bereavement, wedding, and member welfare support']],
]);

function normalize(document) {
  const { _id, ...fields } = document;
  return JSON.stringify(fields, Object.keys(fields).sort());
}

function isApplicationDefault(collectionName, document) {
  if (collectionName === 'settings') {
    return defaultSettings.get(document.key) === document.value;
  }
  if (collectionName === 'financial_categories') {
    const [name, type, description] = defaultCategories.get(document.id) || [];
    return name === document.name &&
      type === document.type &&
      description === document.description &&
      document.is_active === 1;
  }
  return false;
}

const sqlite = new Database(sqlitePath, { readonly: true, fileMustExist: true });
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });

async function main() {
  await client.connect();
  const mongo = client.db(databaseName);
  await Promise.all([
    mongo.collection('users').createIndex({ id: 1 }, { unique: true }),
    mongo.collection('users').createIndex(
      { email: 1 },
      { unique: true, collation: { locale: 'en', strength: 2 } }
    ),
    mongo.collection('users').createIndex(
      { is_initial_admin: 1 },
      { unique: true, partialFilterExpression: { is_initial_admin: true } }
    ),
    mongo.collection('sessions').createIndex({ id: 1 }, { unique: true }),
    mongo.collection('sessions').createIndex({ token: 1 }, { unique: true }),
    mongo.collection('events').createIndex({ id: 1 }, { unique: true }),
    mongo.collection('event_rsvps').createIndex({ id: 1 }, { unique: true }),
    mongo.collection('event_rsvps').createIndex({ event_id: 1, user_id: 1 }, { unique: true }),
    mongo.collection('attendance_records').createIndex({ id: 1 }, { unique: true }),
    mongo.collection('attendance_records').createIndex({ event_id: 1, user_id: 1 }, { unique: true }),
    mongo.collection('financial_categories').createIndex({ id: 1 }, { unique: true }),
    mongo.collection('financial_categories').createIndex({ name: 1 }, { unique: true }),
    mongo.collection('financial_transactions').createIndex({ id: 1 }, { unique: true }),
    mongo.collection('financial_transactions').createIndex(
      { receipt_number: 1 },
      { unique: true, partialFilterExpression: { receipt_number: { $type: 'string' } } }
    ),
    mongo.collection('announcements').createIndex({ id: 1 }, { unique: true }),
    mongo.collection('meetings').createIndex({ id: 1 }, { unique: true }),
    mongo.collection('action_items').createIndex({ id: 1 }, { unique: true }),
    mongo.collection('songs').createIndex({ id: 1 }, { unique: true }),
    mongo.collection('song_resources').createIndex({ id: 1 }, { unique: true }),
    mongo.collection('audit_logs').createIndex({ id: 1 }, { unique: true }),
    mongo.collection('settings').createIndex({ key: 1 }, { unique: true }),
  ]);
  let migratedDocuments = 0;

  for (const tableName of tableNames) {
    const sourceDocuments = sqlite.prepare(`SELECT * FROM "${tableName}"`).all();
    const collection = mongo.collection(tableName);
    const key = tableName === 'settings' ? 'key' : 'id';

    for (const sourceDocument of sourceDocuments) {
      const selector = { [key]: sourceDocument[key] };
      const existing = await collection.findOne(selector);

      if (existing) {
        if (normalize(existing) !== normalize(sourceDocument)) {
          if (isApplicationDefault(tableName, existing)) {
            await collection.updateOne(selector, { $set: sourceDocument });
            migratedDocuments += 1;
            continue;
          }
          throw new Error(
            `MongoDB already contains different data for ${tableName}.${key}=${sourceDocument[key]}. ` +
            'Migration stopped without overwriting the MongoDB record.'
          );
        }
        continue;
      }

      await collection.updateOne(selector, { $setOnInsert: sourceDocument }, { upsert: true });
      migratedDocuments += 1;
    }

    const sourceCount = sourceDocuments.length;
    const destinationCount = await collection.countDocuments();
    if (destinationCount < sourceCount) {
      throw new Error(
        `Verification failed for ${tableName}: SQLite has ${sourceCount} records, MongoDB has ${destinationCount}.`
      );
    }
    console.log(`${tableName}: verified ${sourceCount} SQLite records; ${destinationCount} MongoDB records.`);
  }

  console.log(`Migration complete. Inserted ${migratedDocuments} records into ${databaseName}.`);
}

main()
  .catch((error) => {
    console.error('SQLite to MongoDB migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    sqlite.close();
    await client.close();
  });

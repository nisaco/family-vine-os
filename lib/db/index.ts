import {
  MongoClient,
  type Collection,
  type Document,
  type Filter,
  type Sort,
  type UpdateFilter,
} from 'mongodb';

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
  mongoIndexesPromise?: Promise<void>;
};

function getMongoSettings() {
  const rawUri =
    process.env.MONGODB_URI ||
    process.env.MONGODB_URL ||
    process.env.MONGO_URI ||
    process.env.MONGO_URL ||
    process.env.DATABASE_URL;

  if (!rawUri || !rawUri.trim()) {
    throw new Error('MONGODB_URI must be configured to connect to the application database.');
  }

  let uri = rawUri.trim();
  if (
    (uri.startsWith('"') && uri.endsWith('"')) ||
    (uri.startsWith("'") && uri.endsWith("'"))
  ) {
    uri = uri.slice(1, -1).trim();
  }

  return {
    uri,
    databaseName: process.env.MONGODB_DB || process.env.MONGO_DB || 'family_vine',
  };
}

async function getClient(): Promise<MongoClient> {
  if (!globalForMongo.mongoClientPromise) {
    const { uri } = getMongoSettings();
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
    globalForMongo.mongoClientPromise = client.connect().catch((error: unknown) => {
      globalForMongo.mongoClientPromise = undefined;
      throw error;
    });
  }
  return globalForMongo.mongoClientPromise;
}

export async function getDatabase() {
  const [{ databaseName }, client] = [getMongoSettings(), await getClient()];
  await ensureIndexes(client.db(databaseName));
  return client.db(databaseName);
}

async function ensureIndexes(db: ReturnType<MongoClient['db']>): Promise<void> {
  if (!globalForMongo.mongoIndexesPromise) {
    globalForMongo.mongoIndexesPromise = (async () => {
      const users = db.collection('users');
      const usersExists = await db.listCollections({ name: 'users' }, { nameOnly: true }).hasNext();
      const emailIndexes = usersExists ? await users.listIndexes().toArray() : [];
      const oldEmailIndex = emailIndexes.find((index) =>
        index.unique === true &&
        Object.keys(index.key).length === 1 &&
        index.key.email === 1 &&
        !index.partialFilterExpression
      );
      if (oldEmailIndex) {
        await users.dropIndex(oldEmailIndex.name);
      }

      await Promise.all([
        users.createIndex({ id: 1 }, { unique: true }),
        users.createIndex(
          { email: 1 },
          {
            unique: true,
            collation: { locale: 'en', strength: 2 },
            partialFilterExpression: { email: { $type: 'string' } },
          }
        ),
        users.createIndex(
          { is_initial_admin: 1 },
          { unique: true, partialFilterExpression: { is_initial_admin: true } }
        ),
        db.collection('sessions').createIndex({ id: 1 }, { unique: true }),
        db.collection('sessions').createIndex({ token: 1 }, { unique: true }),
        db.collection('sessions').createIndex({ user_id: 1 }),
        db.collection('events').createIndex({ id: 1 }, { unique: true }),
        db.collection('events').createIndex({ start_time: 1 }),
        db.collection('event_rsvps').createIndex({ id: 1 }, { unique: true }),
        db.collection('event_rsvps').createIndex({ event_id: 1, user_id: 1 }, { unique: true }),
        db.collection('attendance_records').createIndex({ id: 1 }, { unique: true }),
        db.collection('attendance_records').createIndex({ event_id: 1, user_id: 1 }, { unique: true }),
        db.collection('financial_categories').createIndex({ id: 1 }, { unique: true }),
        db.collection('financial_categories').createIndex({ name: 1 }, { unique: true }),
        db.collection('financial_transactions').createIndex({ id: 1 }, { unique: true }),
        db.collection('financial_transactions').createIndex(
          { receipt_number: 1 },
          { unique: true, partialFilterExpression: { receipt_number: { $type: 'string' } } }
        ),
        db.collection('announcements').createIndex({ id: 1 }, { unique: true }),
        db.collection('meetings').createIndex({ id: 1 }, { unique: true }),
        db.collection('action_items').createIndex({ id: 1 }, { unique: true }),
        db.collection('songs').createIndex({ id: 1 }, { unique: true }),
        db.collection('song_resources').createIndex({ id: 1 }, { unique: true }),
        db.collection('audit_logs').createIndex({ id: 1 }, { unique: true }),
        db.collection('settings').createIndex({ key: 1 }, { unique: true }),
        db.collection('counters').createIndex({ id: 1 }, { unique: true }),
      ]);

      const now = new Date().toISOString();
      const settings = [
        ['choir_name', 'Family Vine Choir'],
        ['motto', 'United in Harmony, Rooted in Grace'],
        ['timezone', 'UTC'],
        ['currency_code', 'USD'],
        ['currency_symbol', '$'],
        ['contact_email', 'contact@familyvinechoir.org'],
        ['contact_phone', '+1 555-0199'],
        ['standard_monthly_dues_cents', '2500'],
        ['allow_member_birthday_view', 'true'],
      ] as const;
      await db.collection('settings').bulkWrite(
        settings.map(([key, value]) => ({
          updateOne: {
            filter: { key },
            update: { $setOnInsert: { key, value, updated_at: now } },
            upsert: true,
          },
        }))
      );

      const categories = [
        ['cat_inc_dues', 'Monthly Member Dues', 'INCOME', 'Regular recurring monthly dues paid by members across all wings'],
        ['cat_inc_donations', 'General Donations', 'INCOME', 'Freewill donations from members and patrons'],
        ['cat_inc_fundraising', 'Fundraising & Concert Tickets', 'INCOME', 'Special fundraising initiatives and performance ticket proceeds'],
        ['cat_inc_special', 'Thanksgiving & Harvest Offerings', 'INCOME', 'Special thanksgiving collections and harvest offerings'],
        ['cat_inc_music', 'Music & Regalia Contribution', 'INCOME', 'Member contributions toward scores, instruments, and costumes'],
        ['cat_exp_scores', 'Music Scores & Sheet Charts', 'EXPENSE', 'Purchased sheet music, chord charts, and licensing costs'],
        ['cat_exp_audio', 'Instruments & Sound Maintenance', 'EXPENSE', 'Audio accessories, cables, instrument repairs, and microphones'],
        ['cat_exp_uniforms', 'Robes, Uniforms & Dance Attire', 'EXPENSE', 'Choir robes, stoles, and Vimmies dance costumes'],
        ['cat_exp_refresh', 'Rehearsal Refreshments', 'EXPENSE', 'Water and refreshments for rehearsals and long ministrations'],
        ['cat_exp_honoraria', 'Director & Guest Honoraria', 'EXPENSE', 'Honoraria for music directors, guest musicians, and instructors'],
        ['cat_exp_venue', 'Venue Rental & Transport', 'EXPENSE', 'Rehearsal space rentals and ministry bus transportation'],
        ['cat_exp_admin', 'Administrative & Software', 'EXPENSE', 'Office stationery, bank charges, and web software costs'],
        ['cat_exp_welfare', 'Member Welfare & Benevolence', 'EXPENSE', 'Bereavement, wedding, and member welfare support'],
      ] as const;
      await db.collection('financial_categories').bulkWrite(
        categories.map(([id, name, type, description]) => ({
          updateOne: {
            filter: { id },
            update: {
              $setOnInsert: {
                id,
                name,
                type,
                description,
                is_active: 1,
                created_at: now,
              },
            },
            upsert: true,
          },
        }))
      );
    })().catch((error: unknown) => {
      globalForMongo.mongoIndexesPromise = undefined;
      throw error;
    });
  }

  await globalForMongo.mongoIndexesPromise;
}

export async function getCollection(name: string): Promise<Collection<Document>> {
  const db = await getDatabase();
  return db.collection(name);
}

export async function findOne<T>(
  name: string,
  filter: Filter<Document>,
  options?: { collation?: { locale: string; strength?: number } }
): Promise<T | null> {
  const collection = await getCollection(name);
  const document = await collection.findOne(filter, options);
  if (!document) return null;
  const { _id, ...fields } = document;
  return fields as T;
}

export async function findMany<T>(
  name: string,
  filter: Filter<Document> = {},
  sort?: Sort,
  limit?: number,
  skip?: number
): Promise<T[]> {
  const collection = await getCollection(name);
  let cursor = collection.find(filter);
  if (sort) cursor = cursor.sort(sort);
  if (skip) cursor = cursor.skip(skip);
  if (limit !== undefined) cursor = cursor.limit(limit);
  const documents = await cursor.toArray();
  return documents.map(({ _id, ...fields }) => fields as T);
}

export async function insertDocument<T extends { id: string }>(
  name: string,
  document: T
): Promise<void> {
  const collection = await getCollection(name);
  await collection.insertOne({ ...document });
}

export async function updateDocument(
  name: string,
  filter: Filter<Document>,
  update: UpdateFilter<Document>
): Promise<void> {
  const collection = await getCollection(name);
  await collection.updateOne(filter, update);
}

export async function deleteDocuments(
  name: string,
  filter: Filter<Document>
): Promise<void> {
  const collection = await getCollection(name);
  await collection.deleteMany(filter);
}

export async function countDocuments(
  name: string,
  filter: Filter<Document> = {}
): Promise<number> {
  const collection = await getCollection(name);
  return collection.countDocuments(filter);
}

export async function closeDatabaseConnection(): Promise<void> {
  if (globalForMongo.mongoClientPromise) {
    const client = await globalForMongo.mongoClientPromise;
    await client.close();
    globalForMongo.mongoClientPromise = undefined;
    globalForMongo.mongoIndexesPromise = undefined;
  }
}

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { runMigrations } from './migrate';

let dbInstance: Database.Database | null = null;

export function getDatabasePath(): string {
  if (process.env.DATABASE_PATH) {
    if (process.env.DATABASE_PATH === ':memory:') {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'DATABASE_PATH must point to persistent storage in production; in-memory databases are not supported.'
        );
      }
      return ':memory:';
    }
    if (path.isAbsolute(process.env.DATABASE_PATH)) {
      return process.env.DATABASE_PATH;
    }
    return path.resolve(process.cwd(), process.env.DATABASE_PATH);
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'DATABASE_PATH must be configured in production and point to persistent storage.'
    );
  }

  return path.resolve(process.cwd(), 'data', 'family_vine.db');
}

export function getDb(customPath?: string): Database.Database {
  if (customPath && customPath === ':memory:') {
    const memDb = new Database(':memory:');
    memDb.pragma('foreign_keys = ON');
    runMigrations(memDb);
    return memDb;
  }

  if (dbInstance && !customPath) {
    return dbInstance;
  }

  const targetPath = customPath || getDatabasePath();

  if (targetPath !== ':memory:') {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      if (!customPath && process.env.NODE_ENV === 'production') {
        throw new Error(
          `Database directory "${dir}" does not exist. Mount persistent storage there before starting the production app.`
        );
      }
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(targetPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');

  // Run initial migrations
  runMigrations(db);

  if (!customPath) {
    dbInstance = db;
  }

  return db;
}

export function closeDb(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // ignore
    }
    dbInstance = null;
  }
}


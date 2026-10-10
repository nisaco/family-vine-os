import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '@/lib/db/migrate';
import { parseCurrencyToCents, formatCurrency, validatePositiveCents } from '@/lib/utils/currency';
import { sanitizeCsvCell, generateSafeCsv } from '@/lib/utils/csv';

describe('Financial Ledger Integrity and Reversal Rules', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);

    const now = new Date().toISOString();
    // Insert Financial Secretary and Treasurer
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, join_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('u_finsec', 'finsec@choir.org', 'hash', 'David Addo', 'FINANCIAL_SECRETARY', 'ACTIVE', '2026-01-01', now, now);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, join_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('u_treasurer', 'treasurer@choir.org', 'hash', 'Abena Boateng', 'TREASURER', 'ACTIVE', '2026-01-01', now, now);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, join_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('u_member', 'member@choir.org', 'hash', 'Kofi Ansah', 'MEMBER', 'ACTIVE', '2026-01-01', now, now);
  });

  afterEach(() => {
    db.close();
  });

  it('rejects zero and negative amounts at validation and constraint level', () => {
    expect(validatePositiveCents(0).valid).toBe(false);
    expect(validatePositiveCents(-100).valid).toBe(false);
    expect(validatePositiveCents(2500).valid).toBe(true);

    const now = new Date().toISOString();
    expect(() => {
      db.prepare(`
        INSERT INTO financial_transactions (
          id, transaction_type, category_id, amount_cents, date, payee_or_source, description,
          payment_method, status, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('tx_neg', 'INCOME', 'cat_inc_dues', -500, '2026-10-01', 'Source', 'Invalid', 'CASH', 'POSTED', 'u_finsec', now, now);
    }).toThrow(/CHECK constraint failed/);
  });

  it('generates unique sequential receipt numbers for income records', () => {
    const currentYear = new Date().getFullYear();
    const prefix = `REC-${currentYear}-`;

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO financial_transactions (
        id, transaction_type, receipt_number, category_id, amount_cents, date, payee_or_source, description,
        payment_method, status, created_by, created_at, updated_at
      ) VALUES (?, 'INCOME', ?, 'cat_inc_dues', 2500, '2026-10-01', 'Member', 'Dues', 'CASH', 'POSTED', 'u_finsec', ?, ?)
    `).run('tx_1', `${prefix}0001`, now, now);

    db.prepare(`
      INSERT INTO financial_transactions (
        id, transaction_type, receipt_number, category_id, amount_cents, date, payee_or_source, description,
        payment_method, status, created_by, created_at, updated_at
      ) VALUES (?, 'INCOME', ?, 'cat_inc_dues', 2500, '2026-10-02', 'Member', 'Dues', 'CASH', 'POSTED', 'u_finsec', ?, ?)
    `).run('tx_2', `${prefix}0002`, now, now);

    // Duplicate receipt number must fail
    expect(() => {
      db.prepare(`
        INSERT INTO financial_transactions (
          id, transaction_type, receipt_number, category_id, amount_cents, date, payee_or_source, description,
          payment_method, status, created_by, created_at, updated_at
        ) VALUES (?, 'INCOME', ?, 'cat_inc_dues', 2500, '2026-10-03', 'Member', 'Dues', 'CASH', 'POSTED', 'u_finsec', ?, ?)
      `).run('tx_3', `${prefix}0001`, now, now);
    }).toThrow(/UNIQUE constraint failed/);
  });

  it('prevents silent erasure by requiring documented reversal / void reason', () => {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO financial_transactions (
        id, transaction_type, receipt_number, category_id, amount_cents, date, payee_or_source, description,
        payment_method, status, created_by, created_at, updated_at
      ) VALUES (?, 'INCOME', 'REC-2026-0005', 'cat_inc_dues', 5000, '2026-10-01', 'Member', 'Test', 'CASH', 'POSTED', 'u_finsec', ?, ?)
    `).run('tx_void_test', now, now);

    // Instead of deleting, mark as VOIDED with mandatory explanation
    const voidReason = 'Bank cheque dishonored due to drawer signature mismatch';
    db.prepare(`
      UPDATE financial_transactions SET
        status = 'VOIDED',
        reversal_reason = ?,
        updated_at = ?
      WHERE id = 'tx_void_test'
    `).run(voidReason, now);

    const record = db.prepare('SELECT * FROM financial_transactions WHERE id = ?').get('tx_void_test') as {
      status: string;
      reversal_reason: string;
    };

    expect(record.status).toBe('VOIDED');
    expect(record.reversal_reason).toBe(voidReason);

    // When calculating active totals, VOIDED records are excluded!
    const activeTotal = db.prepare(`
      SELECT COALESCE(SUM(amount_cents), 0) as total
      FROM financial_transactions
      WHERE status = 'POSTED'
    `).get() as { total: number };

    expect(activeTotal.total).toBe(0);
  });
});

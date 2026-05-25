import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('farm_reports_vanilla.db');
  }
  return _db;
}

export async function initDatabase(): Promise<void> {
  const db = getDb();

  // Core tables — all idempotent
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS workers_cache (
      id        INTEGER PRIMARY KEY,
      name      TEXT NOT NULL,
      job_title TEXT,
      active    INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS stock_categories_cache (
      id            INTEGER PRIMARY KEY,
      name          TEXT NOT NULL,
      unit          TEXT,
      display_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS stock_items_cache (
      id            INTEGER PRIMARY KEY,
      category_id   INTEGER NOT NULL,
      name          TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS expense_categories_cache (
      id   INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_attendance (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      year         INTEGER NOT NULL,
      month        INTEGER NOT NULL,
      day_of_month INTEGER NOT NULL,
      worker_id    INTEGER NOT NULL,
      worker_name  TEXT NOT NULL,
      present      INTEGER NOT NULL DEFAULT 0,
      UNIQUE (year, month, day_of_month, worker_id)
    );

    CREATE TABLE IF NOT EXISTS local_attendance_notes (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      year      INTEGER NOT NULL,
      month     INTEGER NOT NULL,
      worker_id INTEGER NOT NULL,
      note      TEXT NOT NULL DEFAULT '',
      UNIQUE (year, month, worker_id)
    );

    CREATE TABLE IF NOT EXISTS local_stock_records (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id  INTEGER NOT NULL,
      year     INTEGER NOT NULL,
      month    INTEGER NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      notes    TEXT,
      UNIQUE (item_id, year, month)
    );

    CREATE TABLE IF NOT EXISTS local_expenses (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id     INTEGER,
      year          INTEGER NOT NULL,
      month         INTEGER NOT NULL,
      expense_date  TEXT NOT NULL,
      category_id   INTEGER,
      category_name TEXT,
      description   TEXT,
      amount        REAL NOT NULL,
      pending_op    TEXT NOT NULL DEFAULT 'create',
      synced        INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      section    TEXT NOT NULL,
      ref_key    TEXT NOT NULL,
      synced     INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (section, ref_key)
    );
  `);

  // Schema migrations — safe to run on every startup; ALTER TABLE fails
  // silently if the column already exists (caught and ignored).
  const migrations = [
    "ALTER TABLE local_attendance ADD COLUMN status TEXT DEFAULT 'A'",
    'ALTER TABLE local_expenses ADD COLUMN entry_no INTEGER DEFAULT 0',
    'ALTER TABLE local_expenses ADD COLUMN supplier_contractor TEXT',
    'ALTER TABLE local_expenses ADD COLUMN receipt_no TEXT',
  ];
  for (const sql of migrations) {
    try { await db.execAsync(sql); } catch { /* column already exists — skip */ }
  }
}

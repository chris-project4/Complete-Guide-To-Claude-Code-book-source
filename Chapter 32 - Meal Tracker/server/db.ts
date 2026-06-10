import Database from "better-sqlite3";

export type DB = Database.Database;

// Open a database (a file path, or ":memory:" for tests) and ensure the schema
// exists. Calories are intentionally absent from the schema — they are always
// derived from macros, never stored.
export function openDb(path: string): DB {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);
  return db;
}

export function initSchema(db: DB): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meals (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      name      TEXT NOT NULL,
      eaten_at  TEXT NOT NULL              -- local datetime "YYYY-MM-DDTHH:mm"
    );

    CREATE TABLE IF NOT EXISTS foods (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      meal_id  INTEGER NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
      name     TEXT NOT NULL,
      carbs    REAL NOT NULL DEFAULT 0,    -- grams
      protein  REAL NOT NULL DEFAULT 0,    -- grams
      fat      REAL NOT NULL DEFAULT 0     -- grams
    );

    CREATE INDEX IF NOT EXISTS idx_foods_meal_id ON foods(meal_id);
    CREATE INDEX IF NOT EXISTS idx_meals_eaten_at ON meals(eaten_at);
  `);
}

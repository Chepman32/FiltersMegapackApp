import { db } from './sqlite';

export const LATEST_SCHEMA_VERSION = 1;

export function runMigrations(): void {
  db.execute(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL
    );`,
  );

  const versionRow = db.execute(
    `SELECT MAX(version) as version FROM schema_migrations;`,
  );
  const currentVersion = Number(versionRow.rows?.item(0)?.version ?? 0);

  if (currentVersion < 1) {
    db.execute(
      `CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        payload TEXT NOT NULL,
        cover_uri TEXT,
        updated_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );`,
    );
    db.execute(
      `CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);`,
    );
    db.execute('INSERT INTO schema_migrations (version) VALUES (?);', [1]);
  }
}


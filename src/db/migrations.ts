import { db } from './sqlite';

export const LATEST_SCHEMA_VERSION = 2;

interface TableInfoRow {
  name: string;
}

interface ProjectPayloadRow {
  id: string;
  payload: string;
  updated_at: string;
}

function rowsArray<T>(result: {
  rows?: {
    _array?: T[];
    length?: number;
    item?: (index: number) => T;
  };
}): T[] {
  if (result.rows?._array) {
    return result.rows._array;
  }
  const length = result.rows?.length ?? 0;
  const item = result.rows?.item;
  if (!item || length === 0) {
    return [];
  }
  return Array.from({ length }, (_, index) => item(index));
}

function hasColumn(table: string, column: string): boolean {
  const result = db.execute(`PRAGMA table_info(${table});`);
  return rowsArray<TableInfoRow>(result).some(row => row.name === column);
}

function ensureProjectColumn(column: string, definition: string): void {
  if (hasColumn('projects', column)) {
    return;
  }
  db.execute(`ALTER TABLE projects ADD COLUMN ${column} ${definition};`);
}

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
        folder_id TEXT,
        is_trashed INTEGER NOT NULL DEFAULT 0,
        trashed_at TEXT,
        restore_folder_id TEXT,
        updated_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );`,
    );
    db.execute(
      `CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);`,
    );
    db.execute('INSERT INTO schema_migrations (version) VALUES (?);', [1]);
  }

  if (currentVersion < 2) {
    db.execute(
      `CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
    );
    ensureProjectColumn('folder_id', 'TEXT');
    ensureProjectColumn('is_trashed', 'INTEGER NOT NULL DEFAULT 0');
    ensureProjectColumn('trashed_at', 'TEXT');
    ensureProjectColumn('restore_folder_id', 'TEXT');

    db.execute(
      `CREATE INDEX IF NOT EXISTS idx_projects_folder_id ON projects(folder_id);`,
    );
    db.execute(
      `CREATE INDEX IF NOT EXISTS idx_projects_is_trashed_updated_at ON projects(is_trashed, updated_at DESC);`,
    );
    db.execute(
      `CREATE INDEX IF NOT EXISTS idx_folders_name ON folders(name COLLATE NOCASE);`,
    );

    const projects = rowsArray<ProjectPayloadRow>(
      db.execute(`SELECT id, payload, updated_at FROM projects;`),
    );

    projects.forEach(row => {
      const parsed = JSON.parse(row.payload) as Record<string, unknown>;
      const migrated = {
        ...parsed,
        schemaVersion: 2,
        folderId: (parsed.folderId as string | null | undefined) ?? null,
        isTrashed: Boolean(parsed.isTrashed ?? false),
        trashedAt: (parsed.trashedAt as string | null | undefined) ?? null,
        restoreFolderId:
          (parsed.restoreFolderId as string | null | undefined) ?? null,
        updatedAt: (parsed.updatedAt as string | undefined) ?? row.updated_at,
      };

      db.execute(
        `UPDATE projects
         SET payload = ?,
             title = ?,
             cover_uri = ?,
             folder_id = ?,
             is_trashed = ?,
             trashed_at = ?,
             restore_folder_id = ?,
             updated_at = ?
         WHERE id = ?;`,
        [
          JSON.stringify(migrated),
          typeof parsed.title === 'string' ? parsed.title : 'Untitled Project',
          typeof parsed.coverUri === 'string' ? parsed.coverUri : null,
          migrated.folderId,
          migrated.isTrashed ? 1 : 0,
          migrated.trashedAt,
          migrated.restoreFolderId,
          migrated.updatedAt,
          row.id,
        ],
      );
    });

    db.execute('INSERT INTO schema_migrations (version) VALUES (?);', [2]);
  }
}

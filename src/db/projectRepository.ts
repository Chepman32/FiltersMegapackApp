import { createNeutralFilterStack } from '../filters/recipe';
import type { FolderDocument } from '../types/folder';
import type { ProjectDocument } from '../types/project';
import { db } from './sqlite';

interface ProjectRow {
  id: string;
  payload: string;
  updated_at: string;
  created_at: string;
  folder_id: string | null;
  is_trashed: number;
  trashed_at: string | null;
  restore_folder_id: string | null;
}

interface FolderRow {
  id: string;
  name: string;
  created_at: string;
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

function normalizeProject(
  parsed: Partial<ProjectDocument>,
  row: ProjectRow,
): ProjectDocument {
  return {
    id: row.id,
    schemaVersion: 2,
    title: parsed.title ?? 'Untitled Project',
    createdAt: parsed.createdAt ?? row.created_at,
    updatedAt: row.updated_at,
    folderId: row.folder_id ?? parsed.folderId ?? null,
    isTrashed: Boolean(row.is_trashed ?? (parsed.isTrashed ? 1 : 0)),
    trashedAt: row.trashed_at ?? parsed.trashedAt ?? null,
    restoreFolderId: row.restore_folder_id ?? parsed.restoreFolderId ?? null,
    coverUri: parsed.coverUri,
    assets: parsed.assets ?? [],
    activeAssetId: parsed.activeAssetId,
    filterStack: parsed.filterStack ?? createNeutralFilterStack(),
    history: parsed.history ?? [],
    historyCursor: parsed.historyCursor ?? 0,
    collageLayoutId: parsed.collageLayoutId,
  };
}

function mapRowToProject(row: ProjectRow): ProjectDocument {
  const parsed = JSON.parse(row.payload) as Partial<ProjectDocument>;
  return normalizeProject(parsed, row);
}

function mapRowToFolder(row: FolderRow): FolderDocument {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listProjects(limit = 500): ProjectDocument[] {
  const result = db.execute(
    `SELECT id, payload, updated_at, created_at, folder_id, is_trashed, trashed_at, restore_folder_id
     FROM projects
     ORDER BY updated_at DESC
     LIMIT ?;`,
    [limit],
  );
  return rowsArray<ProjectRow>(result).map(mapRowToProject);
}

export function getProject(projectId: string): ProjectDocument | null {
  const result = db.execute(
    `SELECT id, payload, updated_at, created_at, folder_id, is_trashed, trashed_at, restore_folder_id
     FROM projects
     WHERE id = ?
     LIMIT 1;`,
    [projectId],
  );
  const [row] = rowsArray<ProjectRow>(result);
  return row ? mapRowToProject(row) : null;
}

export function upsertProject(project: ProjectDocument): void {
  const now = new Date().toISOString();
  const normalized: ProjectDocument = {
    ...project,
    schemaVersion: 2,
    updatedAt: now,
    folderId: project.folderId ?? null,
    isTrashed: Boolean(project.isTrashed),
    trashedAt: project.trashedAt ?? null,
    restoreFolderId: project.restoreFolderId ?? null,
  };
  const payload = JSON.stringify(normalized);

  db.execute(
    `INSERT INTO projects (
       id,
       title,
       payload,
       cover_uri,
       folder_id,
       is_trashed,
       trashed_at,
       restore_folder_id,
       updated_at,
       created_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      payload = excluded.payload,
      cover_uri = excluded.cover_uri,
      folder_id = excluded.folder_id,
      is_trashed = excluded.is_trashed,
      trashed_at = excluded.trashed_at,
      restore_folder_id = excluded.restore_folder_id,
      updated_at = excluded.updated_at;`,
    [
      normalized.id,
      normalized.title,
      payload,
      normalized.coverUri ?? null,
      normalized.folderId,
      normalized.isTrashed ? 1 : 0,
      normalized.trashedAt,
      normalized.restoreFolderId,
      now,
      normalized.createdAt,
    ],
  );
}

export function removeProject(projectId: string): void {
  db.execute('DELETE FROM projects WHERE id = ?;', [projectId]);
}

export function listFolders(): FolderDocument[] {
  const result = db.execute(
    `SELECT id, name, created_at, updated_at
     FROM folders
     ORDER BY name COLLATE NOCASE ASC;`,
  );
  return rowsArray<FolderRow>(result).map(mapRowToFolder);
}

export function getFolder(folderId: string): FolderDocument | null {
  const result = db.execute(
    `SELECT id, name, created_at, updated_at
     FROM folders
     WHERE id = ?
     LIMIT 1;`,
    [folderId],
  );
  const [row] = rowsArray<FolderRow>(result);
  return row ? mapRowToFolder(row) : null;
}

export function createFolder(folder: FolderDocument): void {
  db.execute(
    `INSERT INTO folders (id, name, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      updated_at = excluded.updated_at;`,
    [folder.id, folder.name, folder.createdAt, folder.updatedAt],
  );
}

export function renameFolder(folderId: string, name: string, updatedAt: string): void {
  db.execute(
    `UPDATE folders
     SET name = ?, updated_at = ?
     WHERE id = ?;`,
    [name, updatedAt, folderId],
  );
}

export function removeFolder(folderId: string): void {
  db.execute('DELETE FROM folders WHERE id = ?;', [folderId]);
}

import { db } from './sqlite';
import type { ProjectDocument } from '../types/project';

function mapRowToProject(row: {
  id: string;
  payload: string;
  updated_at: string;
}): ProjectDocument {
  const parsed = JSON.parse(row.payload) as ProjectDocument;
  return {
    ...parsed,
    id: row.id,
    updatedAt: row.updated_at,
  };
}

export function listProjects(limit = 200): ProjectDocument[] {
  const result = db.execute(
    `SELECT id, payload, updated_at FROM projects ORDER BY updated_at DESC LIMIT ?;`,
    [limit],
  );
  return (result.rows?._array ?? []).map(mapRowToProject);
}

export function getProject(projectId: string): ProjectDocument | null {
  const result = db.execute(
    `SELECT id, payload, updated_at FROM projects WHERE id = ? LIMIT 1;`,
    [projectId],
  );
  if (!result.rows?.length) {
    return null;
  }
  return mapRowToProject(result.rows.item(0));
}

export function upsertProject(project: ProjectDocument): void {
  const now = new Date().toISOString();
  const payload = JSON.stringify({
    ...project,
    updatedAt: now,
  });

  db.execute(
    `INSERT INTO projects (id, title, payload, cover_uri, updated_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
      title=excluded.title,
      payload=excluded.payload,
      cover_uri=excluded.cover_uri,
      updated_at=excluded.updated_at;`,
    [
      project.id,
      project.title,
      payload,
      project.coverUri ?? null,
      now,
      project.createdAt,
    ],
  );
}

export function removeProject(projectId: string): void {
  db.execute('DELETE FROM projects WHERE id = ?;', [projectId]);
}


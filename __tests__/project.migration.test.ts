import { runMigrations } from '../src/db/migrations';
import { db } from '../src/db/sqlite';

describe('project migrations', () => {
  it('creates schema v2 on a fresh database', () => {
    const execute = db.execute as jest.Mock;
    execute.mockReset();
    execute.mockImplementation((query: string) => {
      if (query.includes('SELECT MAX(version)')) {
        return {
          rowsAffected: 0,
          rows: {
            _array: [{ version: 0 }],
            length: 1,
            item: () => ({ version: 0 }),
          },
        };
      }
      return {
        rowsAffected: 0,
        rows: {
          _array: [],
          length: 0,
          item: () => null,
        },
      };
    });

    runMigrations();

    const calledSql = execute.mock.calls.map(args => args[0]).join('\n');
    expect(calledSql).toContain('CREATE TABLE IF NOT EXISTS schema_migrations');
    expect(calledSql).toContain('CREATE TABLE IF NOT EXISTS projects');
    expect(calledSql).toContain('CREATE TABLE IF NOT EXISTS folders');
    expect(calledSql).toContain('idx_projects_folder_id');
    expect(calledSql).toContain('idx_projects_is_trashed_updated_at');
    expect(calledSql).toContain('INSERT INTO schema_migrations');
  });

  it('backfills folder and trash defaults for existing projects', () => {
    const execute = db.execute as jest.Mock;
    execute.mockReset();
    execute.mockImplementation((query: string) => {
      if (query.includes('SELECT MAX(version)')) {
        return {
          rowsAffected: 0,
          rows: {
            _array: [{ version: 1 }],
            length: 1,
            item: () => ({ version: 1 }),
          },
        };
      }
      if (query.includes('PRAGMA table_info(projects)')) {
        return {
          rowsAffected: 0,
          rows: {
            _array: [],
            length: 0,
            item: () => null,
          },
        };
      }
      if (query.includes('SELECT id, payload, updated_at FROM projects')) {
        return {
          rowsAffected: 0,
          rows: {
            _array: [
              {
                id: 'project_1',
                payload: JSON.stringify({
                  id: 'project_1',
                  schemaVersion: 1,
                  title: 'Legacy',
                  createdAt: '2026-03-01T10:00:00.000Z',
                  updatedAt: '2026-03-01T10:00:00.000Z',
                  assets: [],
                  filterStack: {
                    filterId: '__none__',
                    intensity: 1,
                    parameterValues: { strength: 1, micro: 0.5 },
                  },
                  history: [],
                  historyCursor: 0,
                }),
                updated_at: '2026-03-01T10:00:00.000Z',
              },
            ],
            length: 1,
            item: () => null,
          },
        };
      }
      return {
        rowsAffected: 0,
        rows: {
          _array: [],
          length: 0,
          item: () => null,
        },
      };
    });

    runMigrations();

    const updateCall = execute.mock.calls.find(([query]) =>
      String(query).includes('UPDATE projects'),
    );
    expect(updateCall).toBeTruthy();
    expect(updateCall?.[1]).toEqual(
      expect.arrayContaining([
        expect.stringContaining('"folderId":null'),
        'Legacy',
        null,
        null,
        0,
        null,
        null,
        '2026-03-01T10:00:00.000Z',
        'project_1',
      ]),
    );
  });
});

import { runMigrations } from '../src/db/migrations';
import { db } from '../src/db/sqlite';

describe('project migrations', () => {
  it('creates schema and inserts migration version on fresh database', () => {
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
    expect(calledSql).toContain('INSERT INTO schema_migrations');
  });
});


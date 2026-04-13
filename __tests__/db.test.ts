import { DatabaseSync } from 'node:sqlite';

// Minimal schema subset used in tests
function createTestDb(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      priority TEXT DEFAULT 'P3',
      status TEXT DEFAULT 'todo',
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      frequency TEXT DEFAULT 'daily',
      target_count INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE habit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      completed INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(habit_id, date)
    );
    CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
  return db;
}

describe('tasks table', () => {
  let db: DatabaseSync;

  beforeEach(() => { db = createTestDb(); });
  afterEach(() => { db.close(); });

  it('inserts and retrieves a task', () => {
    db.exec(`INSERT INTO tasks (title, priority) VALUES ('Write tests', 'P1')`);
    const row = db.prepare('SELECT * FROM tasks WHERE title = ?').get('Write tests') as any;
    expect(row.title).toBe('Write tests');
    expect(row.priority).toBe('P1');
    expect(row.status).toBe('todo');
  });

  it('defaults tags to empty JSON array', () => {
    db.exec(`INSERT INTO tasks (title) VALUES ('No tags')`);
    const row = db.prepare('SELECT tags FROM tasks WHERE title = ?').get('No tags') as any;
    expect(row.tags).toBe('[]');
  });

  it('updates status', () => {
    db.exec(`INSERT INTO tasks (title) VALUES ('Pending')`);
    db.exec(`UPDATE tasks SET status = 'done' WHERE title = 'Pending'`);
    const row = db.prepare('SELECT status FROM tasks WHERE title = ?').get('Pending') as any;
    expect(row.status).toBe('done');
  });

  it('deletes a task', () => {
    db.exec(`INSERT INTO tasks (title) VALUES ('To delete')`);
    db.exec(`DELETE FROM tasks WHERE title = 'To delete'`);
    const row = db.prepare('SELECT * FROM tasks WHERE title = ?').get('To delete');
    expect(row).toBeUndefined();
  });
});

describe('habits and habit_logs', () => {
  let db: DatabaseSync;

  beforeEach(() => { db = createTestDb(); });
  afterEach(() => { db.close(); });

  it('inserts a habit and logs completion', () => {
    db.exec(`INSERT INTO habits (name) VALUES ('Meditate')`);
    const habit = db.prepare('SELECT id FROM habits WHERE name = ?').get('Meditate') as any;
    db.prepare('INSERT INTO habit_logs (habit_id, date) VALUES (?, ?)').run(habit.id, '2026-04-13');
    const log = db.prepare('SELECT * FROM habit_logs WHERE habit_id = ?').get(habit.id) as any;
    expect(log.date).toBe('2026-04-13');
    expect(log.completed).toBe(1);
  });

  it('enforces unique constraint on habit_id + date', () => {
    db.exec(`INSERT INTO habits (name) VALUES ('Exercise')`);
    const habit = db.prepare('SELECT id FROM habits WHERE name = ?').get('Exercise') as any;
    db.prepare('INSERT INTO habit_logs (habit_id, date) VALUES (?, ?)').run(habit.id, '2026-04-13');
    expect(() => {
      db.prepare('INSERT INTO habit_logs (habit_id, date) VALUES (?, ?)').run(habit.id, '2026-04-13');
    }).toThrow();
  });
});

describe('settings table', () => {
  let db: DatabaseSync;

  beforeEach(() => { db = createTestDb(); });
  afterEach(() => { db.close(); });

  it('upserts a setting', () => {
    db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run('theme', 'dark');
    db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run('theme', 'light');
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('theme') as any;
    expect(row.value).toBe('light');
  });
});

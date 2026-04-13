import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const projects = db.prepare(`
      SELECT p.*,
        COUNT(DISTINCT t.id) as task_count,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done_count
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id AND t.parent_id IS NULL
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `).all();
    return NextResponse.json(projects);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { name, description, color = '#8B5CF6' } = body;
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const result = db.prepare(
      'INSERT INTO projects (name, description, color) VALUES (?, ?, ?)'
    ).run(name, description || '', color);
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(project, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}

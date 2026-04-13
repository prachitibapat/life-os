import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const task = db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color
      FROM tasks t LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = ?
    `).get(params.id);
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const subtasks = db.prepare('SELECT * FROM tasks WHERE parent_id = ?').all(params.id);
    return NextResponse.json({ ...task as object, subtasks });
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const body = await req.json();
    const {
      title, description, project_id, priority, status,
      due_date, tags, estimated_minutes, actual_minutes
    } = body;

    db.prepare(`
      UPDATE tasks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        project_id = CASE WHEN ? IS NOT NULL THEN ? ELSE project_id END,
        priority = COALESCE(?, priority),
        status = COALESCE(?, status),
        due_date = CASE WHEN ? IS NOT NULL THEN ? ELSE due_date END,
        tags = COALESCE(?, tags),
        estimated_minutes = CASE WHEN ? IS NOT NULL THEN ? ELSE estimated_minutes END,
        actual_minutes = COALESCE(?, actual_minutes),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      title, description,
      project_id, project_id,
      priority, status,
      due_date, due_date,
      tags ? JSON.stringify(tags) : null,
      estimated_minutes, estimated_minutes,
      actual_minutes,
      params.id
    );

    const task = db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color
      FROM tasks t LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = ?
    `).get(params.id);
    return NextResponse.json(task);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    db.prepare('DELETE FROM tasks WHERE id = ?').run(params.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

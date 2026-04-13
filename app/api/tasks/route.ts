import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('project_id');
    const status = searchParams.get('status');
    const today = searchParams.get('today');
    const parentId = searchParams.get('parent_id');

    let query = `
      SELECT t.*, p.name as project_name, p.color as project_color,
        (SELECT COUNT(*) FROM tasks st WHERE st.parent_id = t.id) as subtask_count,
        (SELECT COUNT(*) FROM tasks st WHERE st.parent_id = t.id AND st.status = 'done') as subtask_done
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (parentId) {
      query += ' AND t.parent_id = ?';
      params.push(parentId);
    } else {
      query += ' AND t.parent_id IS NULL';
    }
    if (projectId) { query += ' AND t.project_id = ?'; params.push(projectId); }
    if (status) { query += ' AND t.status = ?'; params.push(status); }
    if (today === 'true') {
      const todayDate = new Date().toISOString().split('T')[0];
      query += ` AND (t.due_date = ? OR t.due_date < ?)`;
      params.push(todayDate, todayDate);
    }

    query += ' ORDER BY t.priority ASC, t.due_date ASC, t.created_at DESC';

    const tasks = db.prepare(query).all(...params);
    return NextResponse.json(tasks);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const {
      title, description, project_id, parent_id, priority = 'P3',
      status = 'todo', due_date, tags = [], estimated_minutes
    } = body;

    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

    const result = db.prepare(`
      INSERT INTO tasks (title, description, project_id, parent_id, priority, status, due_date, tags, estimated_minutes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title, description || '', project_id || null, parent_id || null,
      priority, status, due_date || null, JSON.stringify(tags), estimated_minutes || null
    );

    const task = db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color
      FROM tasks t LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = ?
    `).get(result.lastInsertRowid);

    return NextResponse.json(task, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

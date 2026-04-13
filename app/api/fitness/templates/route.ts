import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const templates = db.prepare('SELECT * FROM workout_templates ORDER BY name').all() as any[];
    for (const t of templates) {
      t.exercises = JSON.parse(t.exercises || '[]');
    }
    return NextResponse.json(templates);
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { name, type = 'strength', exercises = [] } = body;
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const result = db.prepare(
      'INSERT INTO workout_templates (name, type, exercises) VALUES (?, ?, ?)'
    ).run(name, type, JSON.stringify(exercises));
    return NextResponse.json(db.prepare('SELECT * FROM workout_templates WHERE id = ?').get(result.lastInsertRowid), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

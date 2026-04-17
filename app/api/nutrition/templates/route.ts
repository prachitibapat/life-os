import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const templates = db.prepare('SELECT * FROM meal_templates ORDER BY name ASC').all();
    return NextResponse.json(templates);
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { name, calories = 0, protein = 0, carbs = 0, fat = 0, source_url = '' } = body;
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

    // Upsert: if template with same name exists, update it
    const existing = db.prepare('SELECT id FROM meal_templates WHERE name = ?').get(name) as any;
    if (existing) {
      db.prepare('UPDATE meal_templates SET calories=?, protein=?, carbs=?, fat=?, source_url=? WHERE id=?')
        .run(calories, protein, carbs, fat, source_url, existing.id);
      return NextResponse.json(db.prepare('SELECT * FROM meal_templates WHERE id = ?').get(existing.id), { status: 200 });
    }

    const result = db.prepare(
      'INSERT INTO meal_templates (name, calories, protein, carbs, fat, source_url) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, calories, protein, carbs, fat, source_url);
    return NextResponse.json(db.prepare('SELECT * FROM meal_templates WHERE id = ?').get(result.lastInsertRowid), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    db.prepare('DELETE FROM meal_logs WHERE id = ?').run(params.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const body = await req.json();
    const { meal_type, name, calories, protein, carbs, fat } = body;
    db.prepare(`
      UPDATE meal_logs SET
        meal_type = COALESCE(?, meal_type),
        name = COALESCE(?, name),
        calories = COALESCE(?, calories),
        protein = COALESCE(?, protein),
        carbs = COALESCE(?, carbs),
        fat = COALESCE(?, fat)
      WHERE id = ?
    `).run(meal_type, name, calories, protein, carbs, fat, params.id);
    return NextResponse.json(db.prepare('SELECT * FROM meal_logs WHERE id = ?').get(params.id));
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

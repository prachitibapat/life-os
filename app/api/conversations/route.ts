import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    return NextResponse.json(getDb().prepare('SELECT * FROM conversation_logs ORDER BY date DESC').all());
  } catch (e) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const b = await req.json();
    const { date = new Date().toISOString().split('T')[0], context = '', what_went_well = '', what_to_improve = '', key_insight = '', growth_areas = [] } = b;
    const r = db.prepare('INSERT INTO conversation_logs (date, context, what_went_well, what_to_improve, key_insight, growth_areas) VALUES (?, ?, ?, ?, ?, ?)')
      .run(date, context, what_went_well, what_to_improve, key_insight, JSON.stringify(growth_areas));
    return NextResponse.json(db.prepare('SELECT * FROM conversation_logs WHERE id = ?').get(r.lastInsertRowid), { status: 201 });
  } catch (e) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

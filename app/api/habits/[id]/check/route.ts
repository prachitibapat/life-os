import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const body = await req.json();
    const date = body.date || new Date().toISOString().split('T')[0];

    const existing = db.prepare('SELECT id FROM habit_logs WHERE habit_id = ? AND date = ?').get(params.id, date);

    if (existing) {
      db.prepare('DELETE FROM habit_logs WHERE habit_id = ? AND date = ?').run(params.id, date);
      return NextResponse.json({ completed: false });
    } else {
      db.prepare('INSERT INTO habit_logs (habit_id, date) VALUES (?, ?)').run(params.id, date);
      return NextResponse.json({ completed: true });
    }
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const tables = ['projects','tasks','habits','habit_logs','meal_logs','meal_templates','workouts','workout_exercises','workout_templates','personal_records','journal_entries','thinking_logs','idea_inbox','conversation_logs','sleep_logs','weekly_reviews','settings'];
    const data: Record<string, any[]> = {};
    for (const t of tables) {
      data[t] = db.prepare(`SELECT * FROM ${t}`).all();
    }
    return new NextResponse(JSON.stringify({ exported_at: new Date().toISOString(), data }, null, 2), {
      headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="lifeos-backup-${new Date().toISOString().split('T')[0]}.json"` }
    });
  } catch (e) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

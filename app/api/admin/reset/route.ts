import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST() {
  try {
    const db = getDb();
    const tables = ['habit_logs','tasks','projects','meal_logs','meal_templates','workout_exercises','workouts','workout_templates','personal_records','journal_entries','thinking_logs','idea_inbox','conversation_logs','sleep_logs','weekly_reviews','habits','settings'];
    for (const t of tables) db.exec(`DELETE FROM ${t}`);
    db.exec("VACUUM");
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

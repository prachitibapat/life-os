import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

function getWeekStart(offset = 0): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) - offset * 7;
  return new Date(now.setDate(diff)).toISOString().split('T')[0];
}

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const weekStart = searchParams.get('week') || getWeekStart();
    const weekEnd = new Date(new Date(weekStart).getTime() + 6 * 86400000).toISOString().split('T')[0];

    // Auto-generate summary data
    const tasksDone = (db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE status='done' AND updated_at >= ? AND updated_at <= ?`).get(weekStart + ' 00:00:00', weekEnd + ' 23:59:59') as any).c;
    const habitsTotal = (db.prepare('SELECT COUNT(*) as c FROM habits WHERE is_active=1').get() as any).c;
    const habitsLogged = (db.prepare(`SELECT COUNT(*) as c FROM habit_logs WHERE date >= ? AND date <= ?`).get(weekStart, weekEnd) as any).c;
    const workouts = (db.prepare(`SELECT COUNT(*) as c FROM workouts WHERE date >= ? AND date <= ?`).get(weekStart, weekEnd) as any).c;
    const sleepAvg = (db.prepare(`SELECT AVG(duration_hours) as a FROM sleep_logs WHERE date >= ? AND date <= ?`).get(weekStart, weekEnd) as any).a;
    const calAvg = db.prepare(`SELECT date, SUM(calories) as c FROM meal_logs WHERE date >= ? AND date <= ? GROUP BY date`).all(weekStart, weekEnd) as any[];
    const journalStreak = (db.prepare(`SELECT COUNT(*) as c FROM journal_entries WHERE date >= ? AND date <= ?`).get(weekStart, weekEnd) as any).c;

    const autoSummary = {
      tasks_done: tasksDone,
      habits_rate: habitsTotal > 0 ? Math.round((habitsLogged / (habitsTotal * 7)) * 100) : 0,
      workouts,
      avg_sleep: sleepAvg ? Math.round(sleepAvg * 10) / 10 : 0,
      avg_calories: calAvg.length ? Math.round(calAvg.reduce((s, r) => s + r.c, 0) / calAvg.length) : 0,
      journal_days: journalStreak,
    };

    const existing = db.prepare('SELECT * FROM weekly_reviews WHERE week_start = ?').get(weekStart) as any;
    const history = db.prepare('SELECT * FROM weekly_reviews ORDER BY week_start DESC LIMIT 10').all();

    return NextResponse.json({ review: existing || null, autoSummary, history, weekStart, weekEnd });
  } catch (e) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const b = await req.json();
    const { week_start, wins = '', drains = '', next_week_focus = '', auto_summary = {} } = b;
    if (!week_start) return NextResponse.json({ error: 'week_start required' }, { status: 400 });
    const existing = db.prepare('SELECT id FROM weekly_reviews WHERE week_start = ?').get(week_start);
    if (existing) {
      db.prepare(`UPDATE weekly_reviews SET wins=?,drains=?,next_week_focus=?,auto_summary=?,updated_at=datetime('now') WHERE week_start=?`)
        .run(wins, drains, next_week_focus, JSON.stringify(auto_summary), week_start);
    } else {
      db.prepare('INSERT INTO weekly_reviews (week_start, wins, drains, next_week_focus, auto_summary) VALUES (?, ?, ?, ?, ?)')
        .run(week_start, wins, drains, next_week_focus, JSON.stringify(auto_summary));
    }
    return NextResponse.json(db.prepare('SELECT * FROM weekly_reviews WHERE week_start = ?').get(week_start));
  } catch (e) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

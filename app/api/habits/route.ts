import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const withHistory = searchParams.get('history') === 'true';

    const habits = db.prepare(`
      SELECT h.*,
        CASE WHEN hl.id IS NOT NULL THEN 1 ELSE 0 END as completed_today,
        (SELECT COUNT(*) FROM habit_logs WHERE habit_id = h.id) as total_completions
      FROM habits h
      LEFT JOIN habit_logs hl ON h.id = hl.habit_id AND hl.date = ?
      WHERE h.is_active = 1
      ORDER BY h.name
    `).all(date) as any[];

    if (withHistory) {
      // Get last 90 days for each habit
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
      const logs = db.prepare(`
        SELECT habit_id, date FROM habit_logs
        WHERE date >= ? AND date <= ?
        ORDER BY date ASC
      `).all(ninetyDaysAgo, date) as { habit_id: number; date: string }[];

      const logMap: Record<number, string[]> = {};
      for (const log of logs) {
        if (!logMap[log.habit_id]) logMap[log.habit_id] = [];
        logMap[log.habit_id].push(log.date);
      }

      for (const habit of habits) {
        habit.history = logMap[habit.id] || [];
        habit.streak = calculateStreak(logMap[habit.id] || [], date);
        habit.longest_streak = calculateLongestStreak(logMap[habit.id] || []);
      }
    }

    return NextResponse.json(habits);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch habits' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { name, description, frequency = 'daily', color = '#10B981', icon = '✓' } = body;
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const result = db.prepare(
      'INSERT INTO habits (name, description, frequency, color, icon) VALUES (?, ?, ?, ?, ?)'
    ).run(name, description || '', frequency, color, icon);
    return NextResponse.json(db.prepare('SELECT * FROM habits WHERE id = ?').get(result.lastInsertRowid), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create habit' }, { status: 500 });
  }
}

function calculateStreak(dates: string[], today: string): number {
  if (!dates.length) return 0;
  const sorted = [...dates].sort().reverse();
  let streak = 0;
  let current = new Date(today);

  for (const dateStr of sorted) {
    const d = new Date(dateStr);
    const diff = Math.round((current.getTime() - d.getTime()) / 86400000);
    if (diff === 0 || diff === 1) {
      streak++;
      current = d;
    } else {
      break;
    }
  }
  return streak;
}

function calculateLongestStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const sorted = [...dates].sort();
  let longest = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

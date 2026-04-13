import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getDailyQuote } from '@/lib/quotes';

export async function GET() {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const weekStart = getWeekStart();

    // Tasks due today
    const tasksDueToday = db.prepare(`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done
      FROM tasks WHERE due_date = ? AND parent_id IS NULL
    `).get(today) as { total: number; done: number };

    // Habits today
    const habitsTotal = db.prepare('SELECT COUNT(*) as count FROM habits WHERE is_active = 1').get() as { count: number };
    const habitsDone = db.prepare(`
      SELECT COUNT(*) as count FROM habit_logs
      WHERE date = ?
    `).get(today) as { count: number };

    // Calories today
    const nutrition = db.prepare(`
      SELECT COALESCE(SUM(calories), 0) as calories,
        COALESCE(SUM(protein), 0) as protein,
        COALESCE(SUM(carbs), 0) as carbs,
        COALESCE(SUM(fat), 0) as fat
      FROM meal_logs WHERE date = ?
    `).get(today) as { calories: number; protein: number; carbs: number; fat: number };

    // Workout today
    const workoutToday = db.prepare('SELECT id FROM workouts WHERE date = ?').get(today);

    // Journal streak
    const journalStreak = getJournalStreak(db, today);

    // Weekly habits hit rate
    const weeklyHabits = db.prepare(`
      SELECT COUNT(*) as logged FROM habit_logs
      WHERE date >= ? AND date <= ?
    `).get(weekStart, today) as { logged: number };
    const weekDays = Math.ceil((Date.now() - new Date(weekStart).getTime()) / 86400000) + 1;
    const weeklyHabitRate = habitsTotal.count > 0
      ? Math.round((weeklyHabits.logged / (habitsTotal.count * weekDays)) * 100)
      : 0;

    // Weekly workouts
    const weeklyWorkouts = db.prepare(`
      SELECT COUNT(*) as count FROM workouts WHERE date >= ? AND date <= ?
    `).get(weekStart, today) as { count: number };

    // Sleep last night
    const lastSleep = db.prepare(`
      SELECT duration_hours, quality FROM sleep_logs ORDER BY date DESC LIMIT 1
    `).get() as { duration_hours: number; quality: number } | undefined;

    // Recent tasks
    const recentTasks = db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE (t.due_date = ? OR t.due_date < ?) AND t.status != 'done' AND t.parent_id IS NULL
      ORDER BY t.priority ASC, t.due_date ASC
      LIMIT 5
    `).all(today, today) as any[];

    // Today's habits
    const habits = db.prepare(`
      SELECT h.*, CASE WHEN hl.id IS NOT NULL THEN 1 ELSE 0 END as completed_today
      FROM habits h
      LEFT JOIN habit_logs hl ON h.id = hl.habit_id AND hl.date = ?
      WHERE h.is_active = 1
      ORDER BY h.name
    `).all(today) as any[];

    const calTarget = parseInt((db.prepare('SELECT value FROM settings WHERE key = ?').get('calorie_target') as any)?.value || '2000');
    const sleepTarget = parseFloat((db.prepare('SELECT value FROM settings WHERE key = ?').get('sleep_target') as any)?.value || '8');
    const workoutTarget = parseInt((db.prepare('SELECT value FROM settings WHERE key = ?').get('workout_days_target') as any)?.value || '4');

    return NextResponse.json({
      today,
      quote: getDailyQuote(),
      summary: {
        tasks: { done: tasksDueToday.done || 0, total: tasksDueToday.total || 0 },
        habits: { done: habitsDone.count || 0, total: habitsTotal.count || 0 },
        calories: {
          consumed: Math.round(nutrition.calories),
          target: calTarget,
          protein: Math.round(nutrition.protein || 0),
          carbs: Math.round(nutrition.carbs || 0),
          fat: Math.round(nutrition.fat || 0),
        },
        workout: { done: !!workoutToday },
        journalStreak,
        sleep: lastSleep ? { hours: lastSleep.duration_hours, quality: lastSleep.quality } : null,
      },
      weeklyProgress: {
        habits: weeklyHabitRate,
        workouts: { done: weeklyWorkouts.count, target: workoutTarget },
        sleepAvg: getWeeklyAvgSleep(db, weekStart, today),
        caloriesAvg: getWeeklyAvgCalories(db, weekStart, today),
      },
      recentTasks,
      habits,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 });
  }
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff)).toISOString().split('T')[0];
}

function getJournalStreak(db: any, today: string): number {
  let streak = 0;
  let date = new Date(today);
  while (true) {
    const dateStr = date.toISOString().split('T')[0];
    const entry = db.prepare('SELECT id FROM journal_entries WHERE date = ?').get(dateStr);
    if (!entry) break;
    streak++;
    date = new Date(date.getTime() - 86400000);
  }
  return streak;
}

function getWeeklyAvgSleep(db: any, weekStart: string, today: string): number {
  const result = db.prepare(`
    SELECT AVG(duration_hours) as avg FROM sleep_logs WHERE date >= ? AND date <= ?
  `).get(weekStart, today) as { avg: number | null };
  return result.avg ? Math.round(result.avg * 10) / 10 : 0;
}

function getWeeklyAvgCalories(db: any, weekStart: string, today: string): number {
  const result = db.prepare(`
    SELECT date, SUM(calories) as daily_cal FROM meal_logs
    WHERE date >= ? AND date <= ?
    GROUP BY date
  `).all(weekStart, today) as { daily_cal: number }[];
  if (!result.length) return 0;
  return Math.round(result.reduce((sum, r) => sum + r.daily_cal, 0) / result.length);
}

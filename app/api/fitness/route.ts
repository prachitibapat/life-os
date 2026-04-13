import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const range = searchParams.get('range');

    if (range === 'week') {
      const weekStart = getWeekStart();
      const today = new Date().toISOString().split('T')[0];
      const workouts = db.prepare(`
        SELECT w.*, GROUP_CONCAT(we.exercise_name) as exercise_names
        FROM workouts w
        LEFT JOIN workout_exercises we ON w.id = we.workout_id
        WHERE w.date >= ? AND w.date <= ?
        GROUP BY w.id
        ORDER BY w.date DESC
      `).all(weekStart, today);
      return NextResponse.json({ workouts });
    }

    const query = date
      ? `SELECT w.* FROM workouts w WHERE w.date = ? ORDER BY w.created_at DESC`
      : `SELECT w.* FROM workouts w ORDER BY w.date DESC LIMIT 20`;

    const workouts = db.prepare(query).all(...(date ? [date] : [])) as any[];

    for (const w of workouts) {
      w.exercises = db.prepare('SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY order_index').all(w.id);
    }

    const prs = db.prepare('SELECT * FROM personal_records ORDER BY exercise_name').all();

    return NextResponse.json({ workouts, personalRecords: prs });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const {
      date = new Date().toISOString().split('T')[0],
      name, type = 'strength', notes = '', duration_minutes = 0, exercises = []
    } = body;

    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

    const workoutId = db.prepare(`
      INSERT INTO workouts (date, name, type, notes, duration_minutes)
      VALUES (?, ?, ?, ?, ?)
    `).run(date, name, type, notes, duration_minutes).lastInsertRowid;

    const insertEx = db.prepare(`
      INSERT INTO workout_exercises (workout_id, exercise_name, muscle_group, sets, reps, weight, duration_seconds, distance_km, notes, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      insertEx.run(
        workoutId, ex.exercise_name, ex.muscle_group || '',
        ex.sets || 0, ex.reps || 0, ex.weight || 0,
        ex.duration_seconds || 0, ex.distance_km || 0,
        ex.notes || '', i
      );

      // Update personal records
      if (ex.weight > 0) {
        const pr = db.prepare('SELECT value FROM personal_records WHERE exercise_name = ?').get(ex.exercise_name) as any;
        if (!pr || ex.weight > pr.value) {
          db.prepare(`
            INSERT INTO personal_records (exercise_name, value, unit, date, updated_at)
            VALUES (?, ?, 'kg', ?, datetime('now'))
            ON CONFLICT(exercise_name) DO UPDATE SET value = excluded.value, date = excluded.date, updated_at = excluded.updated_at
          `).run(ex.exercise_name, ex.weight, date);
        }
      }
    }

    const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(workoutId) as any;
    workout.exercises = db.prepare('SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY order_index').all(workoutId);

    return NextResponse.json(workout, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(new Date().setDate(diff)).toISOString().split('T')[0];
}

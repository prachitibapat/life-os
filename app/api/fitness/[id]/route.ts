import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    db.prepare('DELETE FROM workouts WHERE id = ?').run(params.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(params.id) as any;
    if (!workout) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    workout.exercises = db.prepare('SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY order_index').all(params.id);
    return NextResponse.json(workout);
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const range = searchParams.get('range'); // 'week' | 'month'

    if (range === 'week' || range === 'month') {
      const days = range === 'week' ? 7 : 30;
      const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
      const dailyTotals = db.prepare(`
        SELECT date,
          SUM(calories) as calories,
          SUM(protein) as protein,
          SUM(carbs) as carbs,
          SUM(fat) as fat
        FROM meal_logs WHERE date >= ? AND date <= ?
        GROUP BY date ORDER BY date ASC
      `).all(startDate, date);
      return NextResponse.json({ dailyTotals });
    }

    const meals = db.prepare('SELECT * FROM meal_logs WHERE date = ? ORDER BY created_at ASC').all(date);
    const totals = db.prepare(`
      SELECT COALESCE(SUM(calories), 0) as calories,
        COALESCE(SUM(protein), 0) as protein,
        COALESCE(SUM(carbs), 0) as carbs,
        COALESCE(SUM(fat), 0) as fat
      FROM meal_logs WHERE date = ?
    `).get(date) as any;

    const settings = db.prepare('SELECT key, value FROM settings WHERE key IN (?, ?, ?, ?)').all(
      'calorie_target', 'protein_target', 'carbs_target', 'fat_target'
    ) as { key: string; value: string }[];
    const settingsMap = Object.fromEntries(settings.map(s => [s.key, parseInt(s.value)]));

    return NextResponse.json({ meals, totals, targets: settingsMap });
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const {
      date = new Date().toISOString().split('T')[0],
      meal_type = 'lunch',
      name, calories = 0, protein = 0, carbs = 0, fat = 0
    } = body;
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

    const result = db.prepare(`
      INSERT INTO meal_logs (date, meal_type, name, calories, protein, carbs, fat)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(date, meal_type, name, calories, protein, carbs, fat);

    return NextResponse.json(db.prepare('SELECT * FROM meal_logs WHERE id = ?').get(result.lastInsertRowid), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

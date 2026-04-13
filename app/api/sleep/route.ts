import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '14');
    if (date) return NextResponse.json(db.prepare('SELECT * FROM sleep_logs WHERE date = ?').get(date) || null);
    const logs = db.prepare('SELECT * FROM sleep_logs ORDER BY date DESC LIMIT ?').all(limit);
    const target = parseFloat((db.prepare('SELECT value FROM settings WHERE key = ?').get('sleep_target') as any)?.value || '8');
    const avg = logs.length ? logs.reduce((s: number, l: any) => s + l.duration_hours, 0) / logs.length : 0;
    return NextResponse.json({ logs, average: Math.round(avg * 10) / 10, target });
  } catch (e) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const b = await req.json();
    const { date = new Date().toISOString().split('T')[0], bedtime = '', wake_time = '', quality, duration_hours = 0, notes = '' } = b;
    const existing = db.prepare('SELECT id FROM sleep_logs WHERE date = ?').get(date);
    if (existing) {
      db.prepare('UPDATE sleep_logs SET bedtime=?,wake_time=?,quality=?,duration_hours=?,notes=? WHERE date=?')
        .run(bedtime, wake_time, quality || null, duration_hours, notes, date);
    } else {
      db.prepare('INSERT INTO sleep_logs (date, bedtime, wake_time, quality, duration_hours, notes) VALUES (?, ?, ?, ?, ?, ?)')
        .run(date, bedtime, wake_time, quality || null, duration_hours, notes);
    }
    return NextResponse.json(db.prepare('SELECT * FROM sleep_logs WHERE date = ?').get(date));
  } catch (e) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

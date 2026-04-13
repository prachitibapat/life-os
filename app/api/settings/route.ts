import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const rows = getDb().prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    return NextResponse.json(Object.fromEntries(rows.map(r => [r.key, r.value])));
  } catch (e) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const upsert = db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`);
    for (const [key, value] of Object.entries(body)) {
      upsert.run(key, String(value));
    }
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    return NextResponse.json(Object.fromEntries(rows.map(r => [r.key, r.value])));
  } catch (e) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

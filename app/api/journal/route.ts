import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '30');

    if (date) {
      const entry = db.prepare('SELECT * FROM journal_entries WHERE date = ?').get(date);
      return NextResponse.json(entry || null);
    }

    let query = 'SELECT * FROM journal_entries';
    const params: any[] = [];

    if (search) {
      query += ' WHERE content LIKE ? OR what_went_well LIKE ? OR gratitude LIKE ?';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY date DESC LIMIT ?';
    params.push(limit);

    const entries = db.prepare(query).all(...params);
    return NextResponse.json(entries);
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
      content = '', mood, what_went_well = '', what_to_change = '', gratitude = ''
    } = body;

    const existing = db.prepare('SELECT id FROM journal_entries WHERE date = ?').get(date);

    if (existing) {
      db.prepare(`
        UPDATE journal_entries SET
          content = ?, mood = ?, what_went_well = ?, what_to_change = ?, gratitude = ?,
          updated_at = datetime('now')
        WHERE date = ?
      `).run(content, mood || null, what_went_well, what_to_change, gratitude, date);
    } else {
      db.prepare(`
        INSERT INTO journal_entries (date, content, mood, what_went_well, what_to_change, gratitude)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(date, content, mood || null, what_went_well, what_to_change, gratitude);
    }

    return NextResponse.json(db.prepare('SELECT * FROM journal_entries WHERE date = ?').get(date));
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

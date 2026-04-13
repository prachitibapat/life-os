import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    let q = 'SELECT * FROM thinking_logs WHERE 1=1';
    const p: any[] = [];
    if (category) { q += ' AND category = ?'; p.push(category); }
    if (search) { q += ' AND (title LIKE ? OR summary LIKE ? OR my_critique LIKE ?)'; const s = `%${search}%`; p.push(s, s, s); }
    q += ' ORDER BY created_at DESC';
    return NextResponse.json(db.prepare(q).all(...p));
  } catch (e) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const b = await req.json();
    const { title, type = 'article', source = '', summary = '', key_arguments = '', my_critique = '', rating, tags = [], category = 'general' } = b;
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });
    const r = db.prepare('INSERT INTO thinking_logs (title, type, source, summary, key_arguments, my_critique, rating, tags, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(title, type, source, summary, key_arguments, my_critique, rating || null, JSON.stringify(tags), category);
    return NextResponse.json(db.prepare('SELECT * FROM thinking_logs WHERE id = ?').get(r.lastInsertRowid), { status: 201 });
  } catch (e) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

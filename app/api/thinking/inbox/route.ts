import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    return NextResponse.json(getDb().prepare('SELECT * FROM idea_inbox ORDER BY created_at DESC').all());
  } catch (e) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const { content } = await req.json();
    if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 });
    const r = db.prepare('INSERT INTO idea_inbox (content) VALUES (?)').run(content);
    return NextResponse.json(db.prepare('SELECT * FROM idea_inbox WHERE id = ?').get(r.lastInsertRowid), { status: 201 });
  } catch (e) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    getDb().prepare('DELETE FROM idea_inbox WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (e) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const body = await req.json();
    const { content = '', mood, what_went_well = '', what_to_change = '', gratitude = '' } = body;
    db.prepare(`
      UPDATE journal_entries SET
        content = ?, mood = ?, what_went_well = ?, what_to_change = ?, gratitude = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(content, mood || null, what_went_well, what_to_change, gratitude, params.id);
    return NextResponse.json(db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(params.id));
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    getDb().prepare('DELETE FROM journal_entries WHERE id = ?').run(params.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

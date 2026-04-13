import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const b = await req.json();
    db.prepare(`UPDATE thinking_logs SET title=COALESCE(?,title), type=COALESCE(?,type), source=COALESCE(?,source), summary=COALESCE(?,summary), key_arguments=COALESCE(?,key_arguments), my_critique=COALESCE(?,my_critique), rating=COALESCE(?,rating), tags=COALESCE(?,tags), category=COALESCE(?,category), updated_at=datetime('now') WHERE id=?`)
      .run(b.title, b.type, b.source, b.summary, b.key_arguments, b.my_critique, b.rating, b.tags ? JSON.stringify(b.tags) : null, b.category, params.id);
    return NextResponse.json(db.prepare('SELECT * FROM thinking_logs WHERE id = ?').get(params.id));
  } catch (e) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    getDb().prepare('DELETE FROM thinking_logs WHERE id = ?').run(params.id);
    return NextResponse.json({ success: true });
  } catch (e) { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const body = await req.json();
    const { name, description, frequency, color, icon, is_active } = body;
    db.prepare(`
      UPDATE habits SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        frequency = COALESCE(?, frequency),
        color = COALESCE(?, color),
        icon = COALESCE(?, icon),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(name, description, frequency, color, icon, is_active, params.id);
    return NextResponse.json(db.prepare('SELECT * FROM habits WHERE id = ?').get(params.id));
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    db.prepare('DELETE FROM habits WHERE id = ?').run(params.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

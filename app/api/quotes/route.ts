import { NextResponse } from 'next/server';
import { getDailyQuote } from '@/lib/quotes';

export async function GET() {
  return NextResponse.json(getDailyQuote());
}

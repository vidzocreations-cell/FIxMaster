import { NextResponse } from 'next/server';
import { getStoredParts } from '@/lib/supabase';

export async function GET() {
  try {
    const parts = getStoredParts();
    return NextResponse.json({ success: true, count: parts.length, data: parts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

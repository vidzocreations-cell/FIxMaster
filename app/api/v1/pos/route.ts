import { NextResponse } from 'next/server';
import { getStoredInvoices } from '@/lib/supabase';

export async function GET() {
  try {
    const invoices = getStoredInvoices();
    return NextResponse.json({ success: true, count: invoices.length, data: invoices });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getStoredJobs } from '@/lib/supabase';

export async function GET() {
  try {
    const jobs = getStoredJobs();
    return NextResponse.json({ success: true, count: jobs.length, data: jobs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customer_name, phone_number, machine_category, brand_model, reported_fault } = body;

    if (!customer_name || !phone_number || !machine_category || !brand_model || !reported_fault) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: customer_name, phone_number, machine_category, brand_model, reported_fault' },
        { status: 400 }
      );
    }

    const jobs = getStoredJobs();
    const newJob = {
      id: 'job-' + Date.now(),
      job_no: `JOB-${1001 + jobs.length}`,
      customer_name,
      phone_number,
      machine_category,
      brand_model,
      reported_fault,
      status: 'Pending' as const,
      labor_charge: body.labor_charge || 1500,
      advance_deposit: body.advance_deposit || 0,
      total_amount: body.labor_charge || 1500,
      parts: [],
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, message: 'Job Card created via REST API', data: newJob });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { JobCard, Part, Invoice, BusinessProfile } from './types';

const HARDCODED_SUPABASE_URL = 'https://emvbsjturokhyjpeoiiv.supabase.co';
const HARDCODED_SUPABASE_KEY = 'sb_publishable_TAPl-Lyp0TejP6u60giaxA_sk76E7d9';

const INITIAL_BUSINESS_PROFILE: BusinessProfile = {
  shop_name: 'FixMaster Repair & Hardware POS',
  address: 'No. 124, High Level Road, Maharagama, Sri Lanka',
  phone: '+94 77 123 4567 / +94 11 280 9988',
  email: 'service@fixmasterpos.com',
  currency: 'LKR',
  invoice_prefix: 'INV-',
  job_prefix: 'JOB-',
  default_margin: 30,
};

const INITIAL_PARTS: Part[] = [
  {
    id: 'part-1',
    part_name: 'Chainsaw Spark Plug (L7T)',
    category: 'Chainsaws',
    vendor_name: 'Husqvarna Spares LK',
    cost_price: 400,
    margin_percent: 50,
    retail_price: 600,
    stock_quantity: 25,
    min_stock_alert: 5,
    created_at: new Date().toISOString(),
  },
  {
    id: 'part-2',
    part_name: 'Brush Cutter Carburetor 33cc',
    category: 'Brush Cutters',
    vendor_name: 'Stihl Importers',
    cost_price: 2500,
    margin_percent: 30,
    retail_price: 3250,
    stock_quantity: 8,
    min_stock_alert: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: 'part-3',
    part_name: 'Water Pump Mechanical Seal 2"',
    category: 'Petrol / Diesel Water Pumps',
    vendor_name: 'Lanka Hardware Tech',
    cost_price: 1200,
    margin_percent: 40,
    retail_price: 1680,
    stock_quantity: 12,
    min_stock_alert: 4,
    created_at: new Date().toISOString(),
  },
  {
    id: 'part-4',
    part_name: 'Angle Grinder Carbon Brush Set',
    category: 'Cutting Machines / Angle Grinders',
    vendor_name: 'Bosch Parts Center',
    cost_price: 350,
    margin_percent: 60,
    retail_price: 560,
    stock_quantity: 40,
    min_stock_alert: 10,
    created_at: new Date().toISOString(),
  },
];

const INITIAL_JOBS: JobCard[] = [
  {
    id: 'job-1',
    job_no: 'JOB-1001',
    customer_name: 'Kamal Perera',
    phone_number: '0771234567',
    machine_category: 'Chainsaws',
    brand_model: 'Stihl MS180',
    serial_number: 'SN-998821',
    reported_fault: 'Engine starting issue & hard pull',
    status: 'In Progress',
    labor_charge: 1500,
    advance_deposit: 500,
    total_amount: 2100,
    assigned_technician_name: 'Saman Kumara',
    parts: [
      {
        id: 'jp-1',
        job_card_id: 'job-1',
        part_id: 'part-1',
        part_name: 'Chainsaw Spark Plug (L7T)',
        quantity: 1,
        unit_price: 600,
        total_price: 600,
        warranty_days: 30,
      },
    ],
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'job-2',
    job_no: 'JOB-1002',
    customer_name: 'Nimal Silva',
    phone_number: '0719876543',
    machine_category: 'Brush Cutters',
    brand_model: 'Honda GX35',
    serial_number: 'GX-44512',
    reported_fault: 'Carburetor overflow & low speed vibration',
    status: 'Pending',
    labor_charge: 2000,
    advance_deposit: 0,
    total_amount: 2000,
    assigned_technician_name: 'Ruwan Dissayake',
    parts: [],
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

let cachedClient: SupabaseClient | null = null;

// Supabase client instance helper
export function getSupabaseClient() {
  if (cachedClient) return cachedClient;

  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || url.includes('your-supabase-project')) {
    url = (typeof window !== 'undefined' ? localStorage.getItem('fixmaster_sb_url') : '') || HARDCODED_SUPABASE_URL;
  }
  if (!key || key.includes('your-supabase-anon-key')) {
    key = (typeof window !== 'undefined' ? localStorage.getItem('fixmaster_sb_key') : '') || HARDCODED_SUPABASE_KEY;
  }

  if (url && key) {
    cachedClient = createClient(url, key);
    return cachedClient;
  }
  return null;
}

// LocalStorage Persistence Helpers
export function getStoredParts(): Part[] {
  if (typeof window === 'undefined') return INITIAL_PARTS;
  const data = localStorage.getItem('fixmaster_parts');
  if (!data) {
    localStorage.setItem('fixmaster_parts', JSON.stringify(INITIAL_PARTS));
    return INITIAL_PARTS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_PARTS;
  }
}

export function saveStoredParts(parts: Part[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('fixmaster_parts', JSON.stringify(parts));
  }
  const supabase = getSupabaseClient();
  if (supabase) {
    for (const p of parts) {
      supabase.from('parts').upsert({
        part_name: p.part_name,
        category: p.category,
        vendor_name: p.vendor_name,
        cost_price: p.cost_price,
        margin_percent: p.margin_percent,
        retail_price: p.retail_price,
        stock_quantity: p.stock_quantity,
        min_stock_alert: p.min_stock_alert,
      }).then();
    }
  }
}

export function getStoredJobs(): JobCard[] {
  if (typeof window === 'undefined') return INITIAL_JOBS;
  const data = localStorage.getItem('fixmaster_jobs');
  if (!data) {
    localStorage.setItem('fixmaster_jobs', JSON.stringify(INITIAL_JOBS));
    return INITIAL_JOBS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_JOBS;
  }
}

export async function saveStoredJobs(jobs: JobCard[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('fixmaster_jobs', JSON.stringify(jobs));
  }
  const supabase = getSupabaseClient();
  if (supabase) {
    for (const j of jobs) {
      try {
        await supabase.from('job_cards').upsert({
          job_no: j.job_no,
          customer_name: j.customer_name,
          phone_number: j.phone_number,
          machine_category: j.machine_category,
          brand_model: j.brand_model,
          serial_number: j.serial_number,
          reported_fault: j.reported_fault,
          status: j.status,
          labor_charge: j.labor_charge,
          advance_deposit: j.advance_deposit,
          total_amount: j.total_amount,
          assigned_technician_name: j.assigned_technician_name,
          has_external_parts: j.has_external_parts,
          ext_shop_name: j.ext_shop_name,
          ext_part_name: j.ext_part_name,
          ext_cost_price: j.ext_cost_price,
          ext_selling_price: j.ext_selling_price,
          created_at: j.created_at,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'job_no' });
      } catch (e) {
        console.error('Failed to upsert job card to Supabase:', e);
      }
    }
  }
}

export async function deleteStoredJob(jobId: string, jobNo: string) {
  const jobs = getStoredJobs();
  const updated = jobs.filter(j => j.id !== jobId && j.job_no !== jobNo);
  saveStoredJobs(updated);

  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from('job_cards').delete().eq('job_no', jobNo);
  }
}

export async function fetchJobsFromSupabaseCloud(): Promise<JobCard[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return getStoredJobs();

  try {
    const { data, error } = await supabase.from('job_cards').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Supabase query error:', error.message);
      return getStoredJobs();
    }
    if (!data || data.length === 0) {
      return getStoredJobs();
    }

    const localJobs = getStoredJobs();
    const map = new Map<string, JobCard>();

    localJobs.forEach(j => map.set(j.job_no, j));

    data.forEach((row: any) => {
      const existing = map.get(row.job_no);
      map.set(row.job_no, {
        id: row.id || existing?.id || 'job-' + Date.now(),
        job_no: row.job_no,
        customer_name: row.customer_name,
        phone_number: row.phone_number,
        machine_category: row.machine_category,
        brand_model: row.brand_model,
        serial_number: row.serial_number || '',
        reported_fault: row.reported_fault,
        status: row.status,
        labor_charge: Number(row.labor_charge) || 0,
        advance_deposit: Number(row.advance_deposit) || 0,
        total_amount: Number(row.total_amount) || 0,
        assigned_technician_name: row.assigned_technician_name || 'Saman Kumara',
        has_external_parts: row.has_external_parts,
        ext_shop_name: row.ext_shop_name,
        ext_part_name: row.ext_part_name,
        ext_cost_price: Number(row.ext_cost_price) || 0,
        ext_selling_price: Number(row.ext_selling_price) || 0,
        parts: existing?.parts || [],
        created_at: row.created_at,
        updated_at: row.updated_at,
      });
    });

    const merged = Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (typeof window !== 'undefined') {
      localStorage.setItem('fixmaster_jobs', JSON.stringify(merged));
    }
    return merged;
  } catch (e) {
    console.error('Failed to fetch from Supabase:', e);
    return getStoredJobs();
  }
}

export function getStoredInvoices(): Invoice[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('fixmaster_invoices');
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveStoredInvoices(invoices: Invoice[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('fixmaster_invoices', JSON.stringify(invoices));
  }
  const supabase = getSupabaseClient();
  if (supabase) {
    for (const inv of invoices) {
      supabase.from('invoices').upsert({
        invoice_no: inv.invoice_no,
        customer_name: inv.customer_name,
        phone_number: inv.phone_number,
        subtotal: inv.subtotal,
        discount: inv.discount,
        net_payable: inv.net_payable,
        payment_method: inv.payment_method,
        status: inv.status,
        created_at: inv.created_at,
      }, { onConflict: 'invoice_no' }).then();
    }
  }
}

export function getStoredProfile(): BusinessProfile {
  if (typeof window === 'undefined') return INITIAL_BUSINESS_PROFILE;
  const data = localStorage.getItem('fixmaster_profile');
  if (!data) {
    localStorage.setItem('fixmaster_profile', JSON.stringify(INITIAL_BUSINESS_PROFILE));
    return INITIAL_BUSINESS_PROFILE;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_BUSINESS_PROFILE;
  }
}

export function saveStoredProfile(profile: BusinessProfile) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('fixmaster_profile', JSON.stringify(profile));
  }
}

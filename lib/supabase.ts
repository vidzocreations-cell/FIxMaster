import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { JobCard, Part, Invoice, BusinessProfile, Technician } from './types';

const HARDCODED_SUPABASE_URL = 'https://emvbsjturokhyjpeoiiv.supabase.co';
const HARDCODED_SUPABASE_KEY = 'sb_publishable_TAPl-LypOTejP6u60giaxA_sk76E7d9';

const INITIAL_BUSINESS_PROFILE: BusinessProfile = {
  shop_name: 'FixMaster Repair & Hardware POS',
  address: 'No. 124, High Level Road, Maharagama, Sri Lanka',
  phone: '+94 77 123 4567 / +94 11 280 9988',
  email: 'service@fixmasterpos.com',
  currency: 'LKR',
  invoice_prefix: 'INV-',
  job_prefix: 'JOB-',
  default_margin: 30,
  receipt_footer_note: '*** THANK YOU FOR YOUR BUSINESS ***',
  receipt_terms: '30-day warranty applies to replaced parts with this original receipt.',
};

export const INITIAL_TECHNICIANS: Technician[] = [
  { id: 'tech-1', name: 'Saman Kumara', specialization: 'Senior Motor & Engine Specialist', phone: '0771234567', status: 'Active', created_at: new Date().toISOString() },
  { id: 'tech-2', name: 'Ruwan Dissayake', specialization: 'Chainsaw & Generator Expert', phone: '0719876543', status: 'Active', created_at: new Date().toISOString() },
  { id: 'tech-3', name: 'Kavinda Perera', specialization: 'General Power Tools Tech', phone: '0755554433', status: 'Active', created_at: new Date().toISOString() },
];

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
    parts: [],
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

let cachedClient: SupabaseClient | null = null;

// Always returns the 100% working Supabase client instance
export function getSupabaseClient() {
  if (!cachedClient) {
    cachedClient = createClient(HARDCODED_SUPABASE_URL, HARDCODED_SUPABASE_KEY);
  }
  return cachedClient;
}

// Technicians Storage Helpers
export function getStoredTechnicians(): Technician[] {
  if (typeof window === 'undefined') return INITIAL_TECHNICIANS;
  const data = localStorage.getItem('fixmaster_technicians');
  if (!data) {
    localStorage.setItem('fixmaster_technicians', JSON.stringify(INITIAL_TECHNICIANS));
    return INITIAL_TECHNICIANS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_TECHNICIANS;
  }
}

export function saveStoredTechnicians(technicians: Technician[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('fixmaster_technicians', JSON.stringify(technicians));
  }
}

export function deleteStoredTechnician(techId: string) {
  const techs = getStoredTechnicians();
  const updated = techs.filter((t) => t.id !== techId);
  saveStoredTechnicians(updated);
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
    const parsed: JobCard[] = JSON.parse(data);
    return parsed.filter(j => j.job_no !== 'SYS-CONFIG-PROFILE');
  } catch {
    return INITIAL_JOBS;
  }
}

export async function saveStoredJobs(jobs: JobCard[]) {
  const cleanJobs = jobs.filter(j => j.job_no !== 'SYS-CONFIG-PROFILE');
  if (typeof window !== 'undefined') {
    localStorage.setItem('fixmaster_jobs', JSON.stringify(cleanJobs));
  }
  const supabase = getSupabaseClient();
  if (supabase) {
    for (const j of cleanJobs) {
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
  if (typeof window !== 'undefined') {
    localStorage.setItem('fixmaster_jobs', JSON.stringify(updated));
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from('job_cards').delete().eq('job_no', jobNo);
  }
}

export async function fetchJobsFromSupabaseCloud(): Promise<JobCard[]> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase.from('job_cards').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Supabase query error:', error.message);
      return getStoredJobs();
    }
    if (!data || data.length === 0) {
      return getStoredJobs();
    }

    const cloudJobs: JobCard[] = data
      .filter((row: any) => row.job_no !== 'SYS-CONFIG-PROFILE')
      .map((row: any) => ({
        id: row.id,
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
        parts: [],
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

    if (typeof window !== 'undefined') {
      localStorage.setItem('fixmaster_jobs', JSON.stringify(cloudJobs));
    }
    return cloudJobs;
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

export async function saveStoredInvoices(invoices: Invoice[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('fixmaster_invoices', JSON.stringify(invoices));
  }
  const supabase = getSupabaseClient();
  if (supabase) {
    for (const inv of invoices) {
      try {
        await supabase.from('invoices').upsert({
          invoice_no: inv.invoice_no,
          customer_name: inv.customer_name,
          phone_number: inv.phone_number,
          subtotal: inv.subtotal,
          discount: inv.discount,
          net_payable: inv.net_payable,
          payment_method: inv.payment_method,
          status: inv.status,
          created_at: inv.created_at,
        }, { onConflict: 'invoice_no' });
      } catch (e) {
        console.error('Failed to upsert invoice to Supabase:', e);
      }
    }
  }
}

export async function deleteStoredInvoice(invoiceId: string, invoiceNo: string) {
  const invoices = getStoredInvoices();
  const updated = invoices.filter(i => i.id !== invoiceId && i.invoice_no !== invoiceNo);
  if (typeof window !== 'undefined') {
    localStorage.setItem('fixmaster_invoices', JSON.stringify(updated));
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from('invoices').delete().eq('invoice_no', invoiceNo);
  }
}

export async function fetchInvoicesFromSupabaseCloud(): Promise<Invoice[]> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Supabase invoices query error:', error.message);
      return getStoredInvoices();
    }
    if (!data || data.length === 0) {
      return getStoredInvoices();
    }

    const cloudInvoices: Invoice[] = data.map((row: any) => ({
      id: row.id || 'inv-' + Date.now(),
      invoice_no: row.invoice_no,
      job_card_id: row.job_card_id || '',
      customer_name: row.customer_name,
      phone_number: row.phone_number,
      subtotal: Number(row.subtotal) || 0,
      discount: Number(row.discount) || 0,
      net_payable: Number(row.net_payable) || 0,
      payment_method: row.payment_method || 'Cash',
      status: row.status || 'Paid',
      created_at: row.created_at,
    }));

    if (typeof window !== 'undefined') {
      localStorage.setItem('fixmaster_invoices', JSON.stringify(cloudInvoices));
    }
    return cloudInvoices;
  } catch (e) {
    console.error('Failed to fetch invoices from Supabase:', e);
    return getStoredInvoices();
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
    const parsed = JSON.parse(data);
    return {
      ...INITIAL_BUSINESS_PROFILE,
      ...parsed,
    };
  } catch {
    return INITIAL_BUSINESS_PROFILE;
  }
}

export async function saveStoredProfile(profile: BusinessProfile) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('fixmaster_profile', JSON.stringify(profile));
  }
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('job_cards').upsert({
        job_no: 'SYS-CONFIG-PROFILE',
        customer_name: profile.shop_name,
        phone_number: profile.phone,
        machine_category: profile.currency,
        brand_model: profile.address,
        reported_fault: profile.email,
        status: 'Completed',
        labor_charge: profile.default_margin,
        advance_deposit: 0,
        total_amount: 0,
        ext_shop_name: profile.invoice_prefix,
        ext_part_name: profile.job_prefix,
        external_parts_note: JSON.stringify({
          receipt_footer_note: profile.receipt_footer_note || '*** THANK YOU FOR YOUR BUSINESS ***',
          receipt_terms: profile.receipt_terms || '30-day warranty applies to replaced parts with this original receipt.'
        }),
        updated_at: new Date().toISOString()
      }, { onConflict: 'job_no' });
    } catch (e) {
      console.error('Failed to upsert business profile to Supabase:', e);
    }
  }
}

export async function fetchProfileFromSupabaseCloud(): Promise<BusinessProfile> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('job_cards')
      .select('*')
      .eq('job_no', 'SYS-CONFIG-PROFILE');

    if (error || !data || data.length === 0) {
      return getStoredProfile();
    }

    const row = data[0];
    let extraNotes: any = {};
    if (row.external_parts_note) {
      try {
        extraNotes = JSON.parse(row.external_parts_note);
      } catch (e) {}
    }

    const cloudProfile: BusinessProfile = {
      shop_name: row.customer_name || INITIAL_BUSINESS_PROFILE.shop_name,
      address: row.brand_model || INITIAL_BUSINESS_PROFILE.address,
      phone: row.phone_number || INITIAL_BUSINESS_PROFILE.phone,
      email: row.reported_fault || INITIAL_BUSINESS_PROFILE.email,
      currency: row.machine_category || INITIAL_BUSINESS_PROFILE.currency,
      invoice_prefix: row.ext_shop_name || INITIAL_BUSINESS_PROFILE.invoice_prefix,
      job_prefix: row.ext_part_name || INITIAL_BUSINESS_PROFILE.job_prefix,
      default_margin: Number(row.labor_charge) || 30,
      receipt_footer_note: extraNotes.receipt_footer_note || INITIAL_BUSINESS_PROFILE.receipt_footer_note,
      receipt_terms: extraNotes.receipt_terms || INITIAL_BUSINESS_PROFILE.receipt_terms,
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('fixmaster_profile', JSON.stringify(cloudProfile));
    }
    return cloudProfile;
  } catch (e) {
    console.error('Failed to fetch profile from Supabase:', e);
    return getStoredProfile();
  }
}

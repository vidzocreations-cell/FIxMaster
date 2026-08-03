import { createClient } from '@supabase/supabase-js';
import { JobCard, Part, Invoice, BusinessProfile, JobPart } from './types';

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
  {
    id: 'part-5',
    part_name: 'Rice Cooker Heating Element 1.8L',
    category: 'Rice Cookers',
    vendor_name: 'Singer Spares',
    cost_price: 1800,
    margin_percent: 35,
    retail_price: 2430,
    stock_quantity: 6,
    min_stock_alert: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'part-6',
    part_name: 'Blender Motor Coupling Gear',
    category: 'Blenders',
    vendor_name: 'National Panasonic Center',
    cost_price: 250,
    margin_percent: 80,
    retail_price: 450,
    stock_quantity: 30,
    min_stock_alert: 8,
    created_at: new Date().toISOString(),
  },
  {
    id: 'part-7',
    part_name: 'Drill Machine Chuck Key 13mm',
    category: 'Drilling Machines',
    vendor_name: 'Makita Lanka',
    cost_price: 500,
    margin_percent: 40,
    retail_price: 700,
    stock_quantity: 15,
    min_stock_alert: 5,
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
  {
    id: 'job-3',
    job_no: 'JOB-1003',
    customer_name: 'Sunil Jayasinghe',
    phone_number: '0755554433',
    machine_category: 'Cutting Machines / Angle Grinders',
    brand_model: 'Makita GA4030',
    serial_number: 'MK-12009',
    reported_fault: 'Sparks coming from motor commutator',
    status: 'Completed',
    labor_charge: 1000,
    advance_deposit: 0,
    total_amount: 1560,
    assigned_technician_name: 'Saman Kumara',
    parts: [
      {
        id: 'jp-2',
        job_card_id: 'job-3',
        part_id: 'part-4',
        part_name: 'Angle Grinder Carbon Brush Set',
        quantity: 1,
        unit_price: 560,
        total_price: 560,
        warranty_days: 30,
      },
    ],
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

// Supabase client instance helper
export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || (typeof window !== 'undefined' ? localStorage.getItem('fixmaster_sb_url') : '');
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (typeof window !== 'undefined' ? localStorage.getItem('fixmaster_sb_key') : '');
  
  if (url && key) {
    return createClient(url, key);
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

export function saveStoredJobs(jobs: JobCard[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('fixmaster_jobs', JSON.stringify(jobs));
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

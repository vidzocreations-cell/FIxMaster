export type EquipmentCategory =
  | 'Chainsaws'
  | 'Brush Cutters'
  | 'Petrol / Diesel Water Pumps'
  | 'Air Compressors'
  | 'High-Pressure Washers'
  | 'Rice Cookers'
  | 'Gas Cookers'
  | 'Blenders'
  | 'Electric Fans'
  | 'Steam Irons'
  | 'Drilling Machines'
  | 'Cutting Machines / Angle Grinders'
  | 'General / Multi-use Equipment';

export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  'Chainsaws',
  'Brush Cutters',
  'Petrol / Diesel Water Pumps',
  'Air Compressors',
  'High-Pressure Washers',
  'Rice Cookers',
  'Gas Cookers',
  'Blenders',
  'Electric Fans',
  'Steam Irons',
  'Drilling Machines',
  'Cutting Machines / Angle Grinders',
  'General / Multi-use Equipment',
];

export type JobStatus = 'Pending' | 'In Progress' | 'Completed' | 'Delivered';

export interface Part {
  id: string;
  part_name: string;
  category: EquipmentCategory | string;
  vendor_name: string;
  cost_price: number;
  margin_percent: number;
  retail_price: number;
  stock_quantity: number;
  min_stock_alert: number;
  created_at?: string;
}

export interface JobPart {
  id: string;
  job_card_id: string;
  part_id: string;
  part_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  cost_price?: number;
  margin_percent?: number;
  is_external?: boolean;
  vendor_name?: string;
  warranty_days?: number;
}

export interface JobCard {
  id: string;
  job_no: string;
  customer_name: string;
  phone_number: string;
  machine_category: EquipmentCategory | string;
  brand_model: string;
  serial_number?: string;
  reported_fault: string;
  status: JobStatus;
  labor_charge: number;
  advance_deposit: number;
  total_amount: number;
  assigned_technician_name?: string;
  has_external_parts?: boolean;
  external_parts_note?: string;
  ext_shop_name?: string;
  ext_part_name?: string;
  ext_cost_price?: number;
  ext_selling_price?: number;
  ext_bill_image_uri?: string;
  parts?: JobPart[];
  created_at: string;
  updated_at?: string;
}

export interface Technician {
  id: string;
  name: string;
  specialization: string;
  phone: string;
  status: 'Active' | 'Inactive';
  created_at?: string;
}

export type PaymentMethod = 'Cash' | 'Card' | 'Mobile Payment' | 'Bank Transfer';

export interface Invoice {
  id: string;
  invoice_no: string;
  job_card_id: string;
  customer_name: string;
  phone_number: string;
  subtotal: number;
  discount: number;
  net_payable: number;
  payment_method: PaymentMethod;
  status: 'Paid';
  created_at: string;
  job_card?: JobCard;
  job_cards?: JobCard[];
  is_consolidated?: boolean;
}

export interface BusinessProfile {
  shop_name: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  invoice_prefix: string;
  job_prefix: string;
  default_margin: number;
  supabase_url?: string;
  supabase_anon_key?: string;
  receipt_footer_note?: string;
  receipt_terms?: string;
}

export interface Customer {
  id: string;
  customer_name: string;
  phone_number: string;
  machine_category?: string;
  brand_model?: string;
  visit_count?: number;
  last_visit?: string;
  created_at?: string;
}

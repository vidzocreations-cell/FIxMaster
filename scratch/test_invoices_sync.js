const { createClient } = require('@supabase/supabase-js');

const HARDCODED_SUPABASE_URL = 'https://emvbsjturokhyjpeoiiv.supabase.co';
const HARDCODED_SUPABASE_KEY = 'sb_publishable_TAPl-LypOTejP6u60giaxA_sk76E7d9';

const supabase = createClient(HARDCODED_SUPABASE_URL, HARDCODED_SUPABASE_KEY);

async function testInvoicesSync() {
  console.log('--- Testing Invoices Table in Supabase Cloud ---');

  // 1. Try selecting from invoices table
  const { data: selectData, error: selectError } = await supabase.from('invoices').select('*');
  console.log('Select invoices result:', { selectData, selectError });

  // 2. Try upserting a test invoice
  const testInv = {
    invoice_no: 'INV-1001',
    customer_name: 'Test Customer Sync',
    phone_number: '0771234567',
    subtotal: 3500,
    discount: 500,
    net_payable: 3000,
    payment_method: 'Cash',
    status: 'Paid',
    created_at: new Date().toISOString()
  };

  const { data: upsertData, error: upsertError } = await supabase
    .from('invoices')
    .upsert(testInv, { onConflict: 'invoice_no' })
    .select();

  console.log('Upsert invoice result:', { upsertData, upsertError });
}

testInvoicesSync();

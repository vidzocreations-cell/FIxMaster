const { createClient } = require('@supabase/supabase-js');

const HARDCODED_SUPABASE_URL = 'https://emvbsjturokhyjpeoiiv.supabase.co';
const HARDCODED_SUPABASE_KEY = 'sb_publishable_TAPl-LypOTejP6u60giaxA_sk76E7d9';

const supabase = createClient(HARDCODED_SUPABASE_URL, HARDCODED_SUPABASE_KEY);

async function testProfileInJobCards() {
  console.log('--- Testing Business Profile Sync in job_cards table ---');

  const testProfile = {
    job_no: 'SYS-CONFIG-PROFILE',
    customer_name: 'FixMaster Hardware POS (Cloud Test Sync)',
    phone_number: '+94 77 123 4567 / +94 11 280 9988',
    machine_category: 'LKR',
    brand_model: 'No. 124, High Level Road, Maharagama, Sri Lanka',
    reported_fault: 'service@fixmasterpos.com',
    status: 'Completed',
    labor_charge: 30,
    advance_deposit: 0,
    total_amount: 0,
    ext_shop_name: 'INV-',
    ext_part_name: 'JOB-',
    external_parts_note: JSON.stringify({
      receipt_footer_note: '*** THANK YOU FOR YOUR BUSINESS ***',
      receipt_terms: '30-day warranty applies to replaced parts with this original receipt.'
    }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: upsertData, error: upsertError } = await supabase
    .from('job_cards')
    .upsert(testProfile, { onConflict: 'job_no' })
    .select();

  console.log('Upsert result:', { upsertData, upsertError });

  const { data: selectData, error: selectError } = await supabase
    .from('job_cards')
    .select('*')
    .eq('job_no', 'SYS-CONFIG-PROFILE');

  console.log('Select result:', { selectData, selectError });
}

testProfileInJobCards();

const { createClient } = require('@supabase/supabase-js');

const HARDCODED_SUPABASE_URL = 'https://emvbsjturokhyjpeoiiv.supabase.co';
const HARDCODED_SUPABASE_KEY = 'sb_publishable_TAPl-LypOTejP6u60giaxA_sk76E7d9';

const supabase = createClient(HARDCODED_SUPABASE_URL, HARDCODED_SUPABASE_KEY);

async function testProfileSync() {
  console.log('--- Testing Profiles Table in Supabase Cloud ---');

  // 1. Try selecting from profiles table
  const { data: selectData, error: selectError } = await supabase.from('profiles').select('*');
  console.log('Select profiles result:', { selectData, selectError });

  // 2. Try upserting default profile
  const testProfile = {
    id: 'default-profile',
    shop_name: 'FixMaster Hardware POS (Cloud Test)',
    address: 'No. 124, High Level Road, Maharagama',
    phone: '+94 77 123 4567',
    email: 'service@fixmasterpos.com',
    currency: 'LKR',
    invoice_prefix: 'INV-',
    job_prefix: 'JOB-',
    default_margin: 30,
    receipt_footer_note: '*** THANK YOU FOR YOUR BUSINESS ***',
    receipt_terms: '30-day warranty applies to replaced parts.',
    updated_at: new Date().toISOString()
  };

  const { data: upsertData, error: upsertError } = await supabase.from('profiles').upsert(testProfile, { onConflict: 'id' }).select();
  console.log('Upsert profile result:', { upsertData, upsertError });
}

testProfileSync();

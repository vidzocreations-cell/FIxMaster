const { createClient } = require('@supabase/supabase-js');

const url = 'https://emvbsjturokhyjpeoiiv.supabase.co';
const key = 'sb_publishable_TAPl-LypOTejP6u60giaxA_sk76E7d9';

const supabase = createClient(url, key);

async function testInsert() {
  console.log('Inserting test job card...');
  const { data, error } = await supabase.from('job_cards').insert({
    job_no: 'JOB-SYNC-TEST-' + Date.now(),
    customer_name: 'Cloud Test Customer',
    phone_number: '0771234567',
    machine_category: 'Chainsaws',
    brand_model: 'Stihl Test Model',
    reported_fault: 'Cloud sync connection verified',
    status: 'Pending',
    labor_charge: 1500,
    advance_deposit: 0,
    total_amount: 1500,
  }).select();

  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log('Inserted successfully:', data);
  }

  const { data: allJobs, error: errFetch } = await supabase.from('job_cards').select('*');
  console.log('Current jobs in Supabase Cloud:', allJobs ? allJobs.length : 0);
}

testInsert();

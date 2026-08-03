const { createClient } = require('@supabase/supabase-js');

const HARDCODED_SUPABASE_URL = 'https://emvbsjturokhyjpeoiiv.supabase.co';
const HARDCODED_SUPABASE_KEY = 'sb_publishable_TAPl-LypOTejP6u60giaxA_sk76E7d9';

const supabase = createClient(HARDCODED_SUPABASE_URL, HARDCODED_SUPABASE_KEY);

async function inspect() {
  // Test basic upsert with just id and updated_at
  const res1 = await supabase.from('profiles').upsert({ id: 'default-profile' }).select();
  console.log('Upsert default id:', res1);

  // Test inserting into job_cards to see if job_cards can hold config or key-value
  const res2 = await supabase.from('job_cards').select('job_no').limit(1);
  console.log('Job cards test:', res2);
}

inspect();

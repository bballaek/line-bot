require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const userId = '11111111-1111-1111-1111-111111111111';
  
  // Make sure a user exists
  const { data: user, error: userErr } = await supabase.from('users').upsert({
    id: userId,
    line_user_id: 'test_liff_user_setting'
  }, { onConflict: 'id' }).select('id').single();
  
  if (userErr) {
    console.error('User error:', userErr);
  }
  
  // Try upserting settings
  const { data, error } = await supabase.from('user_settings').upsert({
    user_id: userId,
    notify_days: ['1d', '3d'],
    target_group: 'All'
  }, { onConflict: 'user_id' }).select();
  
  if (error) {
    console.error('Settings error:', error);
  } else {
    console.log('Settings data:', data);
  }
}

test();

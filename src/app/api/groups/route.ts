import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing config' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('groups')
      .select('id, line_group_id, group_name')
      .order('group_name', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ groups: data || [] });
  } catch (error: any) {
    console.error('Fetch groups error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

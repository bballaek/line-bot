import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { messagingApi } from '@line/bot-sdk';

const { MessagingApiClient } = messagingApi;

function getClient() {
  return new MessagingApiClient({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  });
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
}

// Map notify_days values to milliseconds
const OFFSET_MS: Record<string, number> = {
  '1h': 1 * 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '3d': 3 * 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
};

const OFFSET_LABELS: Record<string, string> = {
  '1h': '1 ชั่วโมง',
  '6h': '6 ชั่วโมง',
  '1d': '1 วัน',
  '3d': '3 วัน',
  '1w': '1 สัปดาห์',
};

const THAI_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

export async function GET(req: NextRequest) {
  // Optionally verify a secret header from cron
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const client = getClient();
  const now = new Date();
  let sentCount = 0;

  try {
    // Get all homeworks with due dates in the future
    const { data: homeworks } = await supabase
      .from('homeworks')
      .select('id, title, subject, due_date')
      .not('due_date', 'is', null)
      .gte('due_date', now.toISOString());

    if (!homeworks || homeworks.length === 0) {
      return NextResponse.json({ message: 'No upcoming homeworks', sent: 0 });
    }

    // Get all user settings with notify_days
    const { data: allSettings } = await supabase
      .from('user_settings')
      .select('user_id, notify_days');

    if (!allSettings || allSettings.length === 0) {
      return NextResponse.json({ message: 'No users with notifications', sent: 0 });
    }

    // Get user ID -> LINE user ID mapping
    const userIds = allSettings.map(s => s.user_id);
    const { data: users } = await supabase
      .from('users')
      .select('id, line_user_id')
      .in('id', userIds);

    if (!users) {
      return NextResponse.json({ message: 'No users found', sent: 0 });
    }

    const userLineMap = new Map(users.map(u => [u.id, u.line_user_id]));

    // Check each user's settings against each homework
    for (const setting of allSettings) {
      const notifyDays = setting.notify_days;
      if (!Array.isArray(notifyDays) || notifyDays.length === 0) continue;

      const lineUserId = userLineMap.get(setting.user_id);
      if (!lineUserId) continue;

      for (const hw of homeworks) {
        const dueDate = new Date(hw.due_date);

        for (const offset of notifyDays) {
          const offsetMs = OFFSET_MS[offset];
          if (!offsetMs) continue;

          // Calculate when to notify: due_date - offset
          const notifyTime = new Date(dueDate.getTime() - offsetMs);

          // Check if notifyTime falls within the current hour (±30 min)
          const diffMs = Math.abs(now.getTime() - notifyTime.getTime());
          if (diffMs <= 30 * 60 * 1000) {
            // This notification should fire now
            const label = OFFSET_LABELS[offset] || offset;
            const dueDateStr = `${dueDate.getDate()} ${THAI_MONTHS[dueDate.getMonth()]} ${dueDate.getFullYear() + 543}`;
            const dueTimeStr = `${String(dueDate.getHours()).padStart(2, '0')}:${String(dueDate.getMinutes()).padStart(2, '0')} น.`;

            try {
              const liffUrl = `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}`;

              await client.pushMessage({
                to: lineUserId,
                messages: [{
                  type: 'flex',
                  altText: `⏰ แจ้งเตือน: ${hw.title} ครบกำหนดอีก ${label}`,
                  contents: {
                    type: 'bubble',
                    size: 'kilo',
                    header: {
                      type: 'box', layout: 'vertical', backgroundColor: '#FFF3E0', paddingAll: '16px',
                      contents: [
                        { type: 'text', text: '⏰ แจ้งเตือนการบ้าน', color: '#E65100', size: 'md', weight: 'bold' },
                        { type: 'text', text: `ครบกำหนดอีก ${label}`, color: '#BF360C', size: 'sm', margin: '4px' },
                      ],
                    },
                    body: {
                      type: 'box', layout: 'vertical', paddingAll: '16px', spacing: 'sm',
                      contents: [
                        { type: 'text', text: hw.title, weight: 'bold', size: 'md', color: '#111111', wrap: true },
                        { type: 'text', text: `วิชา: ${hw.subject}`, size: 'sm', color: '#666666', margin: 'md' },
                        {
                          type: 'box', layout: 'horizontal', backgroundColor: '#FFF3E0', paddingAll: '10px', cornerRadius: '8px', margin: 'md',
                          contents: [
                            { type: 'text', text: `📅 กำหนดส่ง: ${dueDateStr} ${dueTimeStr}`, size: 'sm', color: '#E65100', weight: 'bold', wrap: true },
                          ],
                        },
                      ],
                    },
                    footer: {
                      type: 'box', layout: 'vertical', paddingAll: '12px',
                      contents: [{
                        type: 'button', style: 'primary', color: '#FF6D00', height: 'sm',
                        action: { type: 'uri', label: 'ดูรายละเอียด', uri: `${liffUrl}/homework-list` },
                      }],
                    },
                  },
                }],
              });
              sentCount++;
            } catch (pushErr) {
              console.error(`Failed to push to ${lineUserId}:`, pushErr);
            }
          }
        }
      }
    }

    return NextResponse.json({ message: 'OK', sent: sentCount });
  } catch (error: any) {
    console.error('Notify reminders error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}

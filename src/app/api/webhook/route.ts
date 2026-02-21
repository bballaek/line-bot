import { NextRequest, NextResponse } from 'next/server';
import { validateSignature, WebhookEvent, Client } from '@line/bot-sdk';
import { createClient } from '@supabase/supabase-js';

function getLineClient() {
  return new Client({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
    channelSecret: process.env.LINE_CHANNEL_SECRET!,
  });
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(req: NextRequest) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET!;
  const client = getLineClient();
  const supabase = getSupabase();

  const body = await req.text();
  const signature = req.headers.get('x-line-signature') as string;

  if (!signature || !validateSignature(body, channelSecret, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const events: WebhookEvent[] = JSON.parse(body).events;

  try {
    await Promise.all(
      events.map(async (event) => {
        // Track group join
        if (event.type === 'join' && event.source.type === 'group') {
          const groupId = event.source.groupId;
          try {
            const groupSummary = await client.getGroupSummary(groupId);
            await supabase.from('groups').upsert(
              { line_group_id: groupId, group_name: groupSummary.groupName || 'กลุ่มไม่มีชื่อ' },
              { onConflict: 'line_group_id' }
            );
          } catch (e) {
            await supabase.from('groups').upsert(
              { line_group_id: groupId, group_name: 'กลุ่มไม่มีชื่อ' },
              { onConflict: 'line_group_id' }
            );
          }
        }

        // Track group leave
        if (event.type === 'leave' && event.source.type === 'group') {
          await supabase.from('groups').delete().eq('line_group_id', event.source.groupId);
        }

        // Handle text messages
        if (event.type === 'message' && event.message.type === 'text') {
          const text = event.message.text.trim();

          // If message is from a group, ensure group is tracked
          if (event.source.type === 'group') {
            const groupId = event.source.groupId;
            try {
              const groupSummary = await client.getGroupSummary(groupId);
              await supabase.from('groups').upsert(
                { line_group_id: groupId, group_name: groupSummary.groupName || 'กลุ่มไม่มีชื่อ' },
                { onConflict: 'line_group_id' }
              );
            } catch { /* ignore */ }
          }

          if (text === '#การบ้าน') {
            const liffUrl = `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}`;
            const flexMessage: any = {
              type: 'flex',
              altText: 'เมนูจัดการการบ้าน',
              contents: {
                type: 'bubble',
                size: 'kilo',
                header: {
                  type: 'box', layout: 'vertical', backgroundColor: '#2563EB', paddingAll: '16px',
                  contents: [
                    { type: 'text', text: 'จัดการการบ้าน', color: '#ffffff', size: 'lg', weight: 'bold' },
                    { type: 'text', text: 'เลือกเมนูที่ต้องการได้เลย', color: '#93C5FD', size: 'sm', marginTop: '4px' },
                  ],
                },
                body: {
                  type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '12px',
                  contents: [
                    { type: 'button', style: 'primary', height: 'sm', color: '#2563EB',
                      action: { type: 'uri', label: 'เพิ่มการบ้าน', uri: `${liffUrl}/add-homework` }
                    },
                    { type: 'button', style: 'secondary', height: 'sm',
                      action: { type: 'uri', label: 'ดูการบ้านทั้งหมด', uri: `${liffUrl}/homework-list` }
                    },
                    { type: 'button', style: 'link', height: 'sm',
                      action: { type: 'uri', label: 'ตั้งค่า', uri: `${liffUrl}/settings` }
                    },
                  ],
                },
              },
            };
            await client.replyMessage(event.replyToken, flexMessage);
          }

          if (text === '#ประกาศ') {
            const liffUrl = `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}`;
            const flexMessage: any = {
              type: 'flex',
              altText: 'เมนูประกาศ',
              contents: {
                type: 'bubble',
                size: 'kilo',
                header: {
                  type: 'box', layout: 'vertical', backgroundColor: '#2563EB', paddingAll: '16px',
                  contents: [
                    { type: 'text', text: '📢 ระบบประกาศ', color: '#ffffff', size: 'lg', weight: 'bold' },
                    { type: 'text', text: 'สร้างหรือดูประกาศได้เลย', color: '#93C5FD', size: 'sm', marginTop: '4px' },
                  ],
                },
                body: {
                  type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '12px',
                  contents: [
                    { type: 'button', style: 'primary', height: 'sm', color: '#2563EB',
                      action: { type: 'uri', label: 'สร้างประกาศใหม่', uri: `${liffUrl}/announcements/create` }
                    },
                    { type: 'button', style: 'secondary', height: 'sm',
                      action: { type: 'uri', label: 'ดูประกาศทั้งหมด', uri: `${liffUrl}/announcements` }
                    },
                  ],
                },
              },
            };
            await client.replyMessage(event.replyToken, flexMessage);
          }
        }
      })
    );
    return NextResponse.json({ message: 'OK' }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

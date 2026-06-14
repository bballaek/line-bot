import { NextRequest, NextResponse } from 'next/server';
import { validateSignature } from '@line/bot-sdk';
import { messagingApi } from '@line/bot-sdk';
import { buildClassroomSetupFlex } from '@/lib/flex-messages/classroom-setup';
import { createClient } from '@supabase/supabase-js';

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

// Save or update a group in the database
async function saveGroup(groupId: string) {
  const supabase = getSupabase();
  const client = getClient();

  let groupName = 'กลุ่มไลน์';
  try {
    const summary = await client.getGroupSummary(groupId);
    groupName = summary.groupName || groupName;
  } catch (e) {
    console.error('Failed to get group summary:', e);
  }

  await supabase.from('groups').upsert(
    { line_group_id: groupId, group_name: groupName },
    { onConflict: 'line_group_id' }
  );
}

// Remove a group from the database
async function removeGroup(groupId: string) {
  const supabase = getSupabase();
  await supabase.from('groups').delete().eq('line_group_id', groupId);
}

// Save user info
async function saveUser(userId: string) {
  const supabase = getSupabase();
  const client = getClient();

  let displayName = '';
  let pictureUrl = '';
  try {
    const profile = await client.getProfile(userId);
    displayName = profile.displayName || '';
    pictureUrl = profile.pictureUrl || '';
  } catch (e) {
    console.error('Failed to get profile:', e);
  }

  await supabase.from('users').upsert(
    { line_user_id: userId, display_name: displayName, picture_url: pictureUrl },
    { onConflict: 'line_user_id' }
  );
}

export async function POST(req: NextRequest) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET || '';
  const body = await req.text();
  const signature = req.headers.get('x-line-signature') || '';

  if (!signature || !validateSignature(body, channelSecret, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const parsed = JSON.parse(body);
  const events = parsed.events || [];

  for (const event of events) {
    try {
      const liffUrl = `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}`;
      const client = getClient();

      // ===== Bot joins a group =====
      if (event.type === 'join') {
        const groupId = event.source?.groupId;
        if (groupId) {
          await saveGroup(groupId);
          await client.replyMessage({
            replyToken: event.replyToken,
            messages: [
              buildClassroomSetupFlex(liffUrl, groupId) as messagingApi.FlexMessage,
              {
                type: 'text',
                text: 'สวัสดีครับ! 🏫 Song-Yang พร้อมให้บริการ\n\nครู: กดปุ่ม「เปิดใช้งานสำหรับห้องเรียนนี้」ด้านบนเพื่อลงทะเบียนห้อง\n\nพิมพ์ #การบ้าน หรือ #ประกาศ เพื่อเริ่มใช้งาน',
              },
            ],
          });
        }
      }

      // ===== Bot leaves a group =====
      if (event.type === 'leave') {
        const groupId = event.source?.groupId;
        if (groupId) await removeGroup(groupId);
      }

      // ===== Text messages =====
      if (event.type === 'message' && event.message?.type === 'text') {
        const text = event.message.text.trim();

        // Save user on any message
        if (event.source?.userId) {
          await saveUser(event.source.userId);
        }

        // If message from group, ensure group is saved
        if (event.source?.type === 'group' && event.source?.groupId) {
          await saveGroup(event.source.groupId);
        }

        // ===== #ส่งการบ้านยัง - Greeting + Carousel Menu =====
        if (text === '#ส่งการบ้านยัง') {
          await client.replyMessage({
            replyToken: event.replyToken,
            messages: [
              {
                type: 'text',
                text: 'มาแล้วครับ! 🎒\nวันนี้คุณครู คุณพ่อคุณแม่ หรือน้องๆ อยากจะทำอะไรครับ เลือกหัวข้อเลยนะ',
              },
              {
                type: 'flex',
                altText: 'เมนูหลัก Song-Yang',
                contents: {
                  type: 'carousel',
                  contents: [
                    {
                      type: 'bubble', size: 'micro',
                      body: {
                        type: 'box', layout: 'vertical', backgroundColor: '#FFF2C8', paddingAll: '15px', cornerRadius: '12px',
                        contents: [
                          { type: 'image', url: 'https://cdn-icons-png.flaticon.com/512/3403/3403504.png', size: '70px', aspectMode: 'fit', margin: 'md' },
                          { type: 'text', text: 'ดูการบ้าน', weight: 'bold', color: '#4834d4', size: 'md', align: 'center', margin: 'lg' },
                          { type: 'text', text: 'เช็คงานวันนี้', size: 'xs', color: '#8c7b75', align: 'center', margin: 'sm' },
                        ],
                      },
                      action: { type: 'uri', label: 'ดูการบ้าน', uri: `${liffUrl}/homework-list` },
                    },
                    {
                      type: 'bubble', size: 'micro',
                      body: {
                        type: 'box', layout: 'vertical', backgroundColor: '#E3F2FD', paddingAll: '15px', cornerRadius: '12px',
                        contents: [
                          { type: 'image', url: 'https://cdn-icons-png.flaticon.com/512/8759/8759534.png', size: '70px', aspectMode: 'fit', margin: 'md' },
                          { type: 'text', text: 'ประกาศ', weight: 'bold', color: '#1565c0', size: 'md', align: 'center', margin: 'lg' },
                          { type: 'text', text: 'ข่าวสารห้องเรียน', size: 'xs', color: '#8c7b75', align: 'center', margin: 'sm' },
                        ],
                      },
                      action: { type: 'uri', label: 'ดูประกาศ', uri: `${liffUrl}/announcements` },
                    },
                    {
                      type: 'bubble', size: 'micro',
                      body: {
                        type: 'box', layout: 'vertical', backgroundColor: '#FFEBEE', paddingAll: '15px', cornerRadius: '12px',
                        contents: [
                          { type: 'image', url: 'https://cdn-icons-png.flaticon.com/512/9042/9042241.png', size: '70px', aspectMode: 'fit', margin: 'md' },
                          { type: 'text', text: 'งานค้างส่ง', weight: 'bold', color: '#c0392b', size: 'md', align: 'center', margin: 'lg' },
                          { type: 'text', text: 'เช็คงานที่ดองไว้', size: 'xs', color: '#8c7b75', align: 'center', margin: 'sm' },
                        ],
                      },
                      action: { type: 'uri', label: 'เช็คงานค้าง', uri: `${liffUrl}/homework-list` },
                    },
                  ],
                },
              },
            ],
          });
        }

        if (text === '#การบ้าน') {
          await client.replyMessage({
            replyToken: event.replyToken,
            messages: [{
              type: 'flex',
              altText: 'เมนูจัดการการบ้าน',
              contents: {
                type: 'bubble',
                size: 'kilo',
                header: {
                  type: 'box', layout: 'vertical', backgroundColor: '#2563EB', paddingAll: '16px',
                  contents: [
                    { type: 'text', text: 'จัดการการบ้าน', color: '#ffffff', size: 'lg', weight: 'bold' },
                    { type: 'text', text: 'เลือกเมนูที่ต้องการได้เลย', color: '#93C5FD', size: 'sm', margin: '4px' },
                  ],
                },
                body: {
                  type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '12px',
                  contents: [
                    { type: 'button', style: 'primary', height: 'sm', color: '#2563EB',
                      action: { type: 'uri', label: 'เพิ่มการบ้าน', uri: `${liffUrl}/add-homework` } },
                    { type: 'button', style: 'secondary', height: 'sm',
                      action: { type: 'uri', label: 'ดูการบ้านทั้งหมด', uri: `${liffUrl}/homework-list` } },
                    { type: 'button', style: 'link', height: 'sm',
                      action: { type: 'uri', label: 'ตั้งค่า', uri: `${liffUrl}/settings` } },
                  ],
                },
              },
            }],
          });
        }

        if (text === '#ประกาศ') {
          await client.replyMessage({
            replyToken: event.replyToken,
            messages: [{
              type: 'flex',
              altText: 'เมนูประกาศ',
              contents: {
                type: 'bubble',
                size: 'kilo',
                header: {
                  type: 'box', layout: 'vertical', backgroundColor: '#2563EB', paddingAll: '16px',
                  contents: [
                    { type: 'text', text: '📢 ระบบประกาศ', color: '#ffffff', size: 'lg', weight: 'bold' },
                    { type: 'text', text: 'สร้างหรือดูประกาศได้เลย', color: '#93C5FD', size: 'sm', margin: '4px' },
                  ],
                },
                body: {
                  type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '12px',
                  contents: [
                    { type: 'button', style: 'primary', height: 'sm', color: '#2563EB',
                      action: { type: 'uri', label: 'สร้างประกาศใหม่', uri: `${liffUrl}/announcements/create` } },
                    { type: 'button', style: 'secondary', height: 'sm',
                      action: { type: 'uri', label: 'ดูประกาศทั้งหมด', uri: `${liffUrl}/announcements` } },
                  ],
                },
              },
            }],
          });
        }

        // ===== #ส่งงานออกจากกลุ่ม - Bot leaves group =====
        if (text === '#ส่งยังออกจากกลุ่ม' && event.source?.type === 'group') {
          const groupId = event.source.groupId;
          await client.replyMessage({
            replyToken: event.replyToken,
            messages: [{ type: 'text', text: 'ลาก่อนครับ! 👋 บอท Song-Yang จะออกจากกลุ่มนี้แล้วนะ\n\nหากต้องการเพิ่มกลับมาใหม่ ให้เชิญบอทเข้ากลุ่มอีกครั้งได้เลยครับ' }],
          });
          // Remove from DB and leave
          await removeGroup(groupId);
          await client.leaveGroup(groupId);
        }
      }

      // ===== Follow event (user adds bot as friend) =====
      if (event.type === 'follow' && event.source?.userId) {
        await saveUser(event.source.userId);
      }

    } catch (e) {
      console.error('Event error:', e);
    }
  }

  return NextResponse.json({ message: 'OK' }, { status: 200 });
}

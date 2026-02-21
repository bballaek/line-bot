import { NextRequest, NextResponse } from 'next/server';
import { validateSignature } from '@line/bot-sdk';
import { messagingApi } from '@line/bot-sdk';

const { MessagingApiClient } = messagingApi;

function getClient() {
  return new MessagingApiClient({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  });
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
      if (event.type === 'message' && event.message?.type === 'text') {
        const text = event.message.text.trim();
        const liffUrl = `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}`;
        const client = getClient();

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
      }
    } catch (e) {
      console.error('Event error:', e);
    }
  }

  return NextResponse.json({ message: 'OK' }, { status: 200 });
}

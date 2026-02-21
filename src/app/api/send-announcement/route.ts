import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@line/bot-sdk';

function getLineClient() {
  return new Client({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
    channelSecret: process.env.LINE_CHANNEL_SECRET!,
  });
}

export async function POST(req: NextRequest) {
  try {
    const client = getLineClient();
    const { targetId, announcement } = await req.json();

    if (!targetId || !announcement) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const liffUrl = `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}`;
    const dateText = announcement.event_date
      ? new Date(announcement.event_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date(announcement.created_at || new Date()).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

    const flexMessage: any = {
      type: 'flex',
      altText: `📢 ประกาศ: ${announcement.title}`,
      contents: {
        type: 'bubble',
        size: 'mega',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#2563EB',
          paddingAll: '16px',
          contents: [
            {
              type: 'box', layout: 'horizontal', spacing: 'sm',
              contents: [
                { type: 'text', text: '📢', size: 'lg', flex: 0 },
                {
                  type: 'box', layout: 'vertical', flex: 1,
                  contents: [
                    { type: 'text', text: announcement.title, color: '#ffffff', size: 'lg', weight: 'bold', wrap: true },
                    { type: 'text', text: `วันที่ ${dateText}`, color: '#93C5FD', size: 'xs', marginTop: '4px' },
                  ],
                },
              ],
            },
          ],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '16px',
          spacing: 'md',
          contents: [
            ...(announcement.content ? [{
              type: 'text' as const,
              text: announcement.content.length > 200
                ? announcement.content.substring(0, 200) + '...'
                : announcement.content,
              size: 'sm' as const,
              color: '#475569',
              wrap: true,
            }] : []),
            {
              type: 'box' as const,
              layout: 'horizontal' as const,
              spacing: 'sm' as const,
              contents: [
                {
                  type: 'text' as const,
                  text: announcement.type === 'action' ? '⚠️ แจ้งเพื่อดำเนินการ' : '📋 แจ้งเพื่อทราบ',
                  size: 'xs' as const,
                  color: announcement.type === 'action' ? '#D97706' : '#3B82F6',
                  weight: 'bold' as const,
                },
              ],
            },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '12px',
          contents: [
            {
              type: 'button',
              style: 'primary',
              color: '#2563EB',
              height: 'sm',
              action: {
                type: 'uri',
                label: 'ดูประกาศ',
                uri: announcement.id ? `${liffUrl}/announcements/${announcement.id}` : `${liffUrl}/announcements`,
              },
            },
          ],
        },
      },
    };

    await client.pushMessage(targetId, flexMessage);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Send announcement error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}

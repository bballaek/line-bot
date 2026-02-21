import { NextRequest, NextResponse } from 'next/server';
import { messagingApi } from '@line/bot-sdk';

const { MessagingApiClient } = messagingApi;

const THAI_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

function formatDate(s: string) {
  const d = new Date(s);
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export async function POST(req: NextRequest) {
  try {
    const client = new MessagingApiClient({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    });

    const { targetId, announcement } = await req.json();
    if (!targetId || !announcement) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

    const liffUrl = `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}`;
    const isAction = announcement.type === 'action';
    const headerBg = isAction ? '#E74C3C' : '#2980B9';
    const headerText = isAction ? 'ประกาศแจ้งเพื่อดำเนินการ' : 'ประกาศแจ้งเพื่อทราบ';
    const dateText = announcement.event_date ? formatDate(announcement.event_date) : formatDate(new Date().toISOString());

    const bodyContents: any[] = [
      { type: 'text', text: `เรื่อง: ${announcement.title}`, weight: 'bold', size: 'md', color: '#2C3E50', wrap: true },
      { type: 'text', text: `📅 ประกาศเมื่อ: ${dateText}`, size: 'xs', color: '#999999', margin: 'md' },
      { type: 'separator', margin: 'lg' },
    ];

    if (announcement.content) {
      bodyContents.push({
        type: 'text',
        text: announcement.content.length > 300 ? announcement.content.substring(0, 300) + '...' : announcement.content,
        wrap: true, margin: 'lg', color: '#555555', size: 'sm',
      });
    }

    const detailUri = announcement.id
      ? `${liffUrl}/announcements/${announcement.id}`
      : `${liffUrl}/announcements`;

    const flexMsg = {
      type: 'flex' as const,
      altText: `📢 ประกาศ: ${announcement.title}`,
      contents: {
        type: 'bubble', size: 'mega',
        header: {
          type: 'box', layout: 'vertical', backgroundColor: headerBg, paddingAll: '15px',
          contents: [{ type: 'text', text: headerText, weight: 'bold', color: '#FFFFFF', size: 'lg', align: 'center' }],
        },
        body: {
          type: 'box', layout: 'vertical', paddingAll: '20px',
          contents: bodyContents,
        },
        footer: {
          type: 'box', layout: 'vertical',
          contents: [{
            type: 'button', style: 'link', height: 'sm', margin: 'sm',
            action: { type: 'uri', label: 'ดูประกาศเพิ่มเติม', uri: detailUri },
          }],
        },
      },
    };

    await client.pushMessage({ to: targetId, messages: [flexMsg as any] });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Send announcement error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}

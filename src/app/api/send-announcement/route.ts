import { NextRequest, NextResponse } from 'next/server';
import { messagingApi } from '@line/bot-sdk';

const { MessagingApiClient } = messagingApi;

export async function POST(req: NextRequest) {
  try {
    const client = new MessagingApiClient({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    });

    const { targetId, announcement } = await req.json();

    if (!targetId || !announcement) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const typeLabel = announcement.type === 'action' ? '⚠️ แจ้งเพื่อดำเนินการ' : '📋 แจ้งเพื่อทราบ';
    let text = `📢 ประกาศ\n\n📌 ${announcement.title}\n${typeLabel}`;
    if (announcement.content) text += `\n\n${announcement.content.substring(0, 400)}`;
    if (announcement.event_date) {
      const dateText = new Date(announcement.event_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      text += `\n\n📅 วันที่: ${dateText}`;
    }

    await client.pushMessage({
      to: targetId,
      messages: [{ type: 'text', text }],
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Send announcement error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}

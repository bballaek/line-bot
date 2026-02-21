import { NextRequest, NextResponse } from 'next/server';
import { messagingApi } from '@line/bot-sdk';

const { MessagingApiClient } = messagingApi;

export async function POST(req: NextRequest) {
  try {
    const client = new MessagingApiClient({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    });

    const { targetId, homework, type } = await req.json();

    if (!targetId) {
      return NextResponse.json({ error: 'Missing targetId' }, { status: 400 });
    }

    let messages: any[];

    if (type === 'daily' && Array.isArray(homework)) {
      // Daily report - list of homeworks
      const today = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
      let text = `📋 รายงานการบ้านประจำวัน\n${today}\nทั้งหมด ${homework.length} รายการ\n${'─'.repeat(20)}`;
      homework.slice(0, 10).forEach((hw: any, i: number) => {
        const due = hw.due_date
          ? ' (กำหนด ' + new Date(hw.due_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) + ')'
          : '';
        text += `\n${i + 1}. ${hw.title} - ${hw.subject}${due}`;
      });
      messages = [{ type: 'text', text }];
    } else if (homework) {
      // Single homework
      const dueText = homework.due_date
        ? new Date(homework.due_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'ไม่ระบุ';
      let text = `📋 การบ้านใหม่\n\n📌 ${homework.title}\n📚 วิชา: ${homework.subject}\n📅 กำหนดส่ง: ${dueText}`;
      if (homework.description) text += `\n\n📝 ${homework.description.substring(0, 300)}`;
      messages = [{ type: 'text', text }];
    } else {
      return NextResponse.json({ error: 'Missing homework data' }, { status: 400 });
    }

    await client.pushMessage({ to: targetId, messages });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Send homework error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}

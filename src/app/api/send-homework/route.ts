import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@line/bot-sdk';

function getLineClient() {
  return new Client({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
    channelSecret: process.env.LINE_CHANNEL_SECRET!,
  });
}

function buildHomeworkFlex(hw: { title: string; subject: string; description?: string; due_date?: string }) {
  const dueText = hw.due_date
    ? new Date(hw.due_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'ไม่ระบุ';

  return {
    type: 'flex' as const,
    altText: `📋 การบ้าน: ${hw.title}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#2563EB',
        paddingAll: '16px',
        contents: [
          { type: 'text', text: 'การบ้านใหม่', color: '#DBEAFE', size: 'xs', weight: 'bold' },
          { type: 'text', text: hw.title, color: '#ffffff', size: 'lg', weight: 'bold', wrap: true },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: '16px',
        contents: [
          {
            type: 'box', layout: 'horizontal', spacing: 'sm',
            contents: [
              { type: 'text', text: 'วิชา', size: 'sm', color: '#94A3B8', flex: 2 },
              { type: 'text', text: hw.subject, size: 'sm', color: '#1E293B', flex: 5, weight: 'bold' },
            ],
          },
          {
            type: 'box', layout: 'horizontal', spacing: 'sm',
            contents: [
              { type: 'text', text: 'กำหนดส่ง', size: 'sm', color: '#94A3B8', flex: 2 },
              { type: 'text', text: dueText, size: 'sm', color: '#1E293B', flex: 5, wrap: true },
            ],
          },
          ...(hw.description ? [{
            type: 'box' as const, layout: 'vertical' as const, marginTop: '12px',
            contents: [
              { type: 'text' as const, text: hw.description, size: 'sm' as const, color: '#64748B', wrap: true },
            ],
          }] : []),
        ],
      },
    },
  };
}

function buildDailyReportFlex(homeworks: { title: string; subject: string; due_date?: string }[]) {
  const today = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

  const items = homeworks.slice(0, 10).map((hw) => ({
    type: 'box' as const,
    layout: 'horizontal' as const,
    spacing: 'sm' as const,
    paddingBottom: '8px',
    contents: [
      { type: 'text' as const, text: '•', size: 'sm' as const, color: '#2563EB', flex: 1 },
      {
        type: 'box' as const, layout: 'vertical' as const, flex: 9,
        contents: [
          { type: 'text' as const, text: hw.title, size: 'sm' as const, color: '#1E293B', weight: 'bold' as const, wrap: true },
          { type: 'text' as const, text: `วิชา ${hw.subject}`, size: 'xs' as const, color: '#94A3B8' },
        ],
      },
    ],
  }));

  return {
    type: 'flex' as const,
    altText: `📋 รายงานการบ้านประจำวัน ${today}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#2563EB',
        paddingAll: '16px',
        contents: [
          { type: 'text', text: 'รายงานการบ้านประจำวัน', color: '#DBEAFE', size: 'xs', weight: 'bold' },
          { type: 'text', text: today, color: '#ffffff', size: 'md', weight: 'bold' },
          { type: 'text', text: `ทั้งหมด ${homeworks.length} รายการ`, color: '#93C5FD', size: 'xs', marginTop: '4px' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '16px',
        contents: items,
      },
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const client = getLineClient();
    const body = await req.json();
    const { type, targetId, homework, homeworks } = body;
    // type: 'single' | 'daily'
    // targetId: LINE user ID or group ID

    if (!targetId) {
      return NextResponse.json({ error: 'targetId is required' }, { status: 400 });
    }

    let message;
    if (type === 'daily' && homeworks) {
      message = buildDailyReportFlex(homeworks);
    } else if (homework) {
      message = buildHomeworkFlex(homework);
    } else {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    await client.pushMessage(targetId, message as any);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Send homework error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send' }, { status: 500 });
  }
}

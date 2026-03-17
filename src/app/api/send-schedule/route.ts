import { NextRequest, NextResponse } from 'next/server';
import { messagingApi } from '@line/bot-sdk';

const { MessagingApiClient } = messagingApi;

const PERIOD_COLORS = ["#FF7043","#42A5F5","#66BB6A","#FFA726","#7E57C2","#26C6DA","#EC407A","#4DB6AC"];

export async function POST(req: NextRequest) {
  try {
    const client = new MessagingApiClient({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    });

    const { targetId, dayName, schedules } = await req.json();
    if (!targetId) return NextResponse.json({ error: 'Missing targetId' }, { status: 400 });

    const liffUrl = `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}`;

    const DEFAULT_TIMES = [
      { start: "08:30", end: "09:20" },
      { start: "09:20", end: "10:10" },
      { start: "10:10", end: "11:00" },
      { start: "11:00", end: "11:50" },
      { start: "12:40", end: "13:30" },
      { start: "13:30", end: "14:20" },
      { start: "14:20", end: "15:10" },
      { start: "15:10", end: "16:00" },
    ];

    // Build schedule cards for periods 1-8
    const periodCards: any[] = [];
    for (let p = 1; p <= 8; p++) {
      const sched = schedules.find((s: any) => s.period === p);
      const color = PERIOD_COLORS[(p - 1) % PERIOD_COLORS.length];
      const timeStr = sched?.start_time && sched?.end_time
        ? `${sched.start_time}-${sched.end_time}`
        : `${DEFAULT_TIMES[p - 1].start}-${DEFAULT_TIMES[p - 1].end}`;
      const subjectText = sched?.subject || '- ว่าง -';
      const teacherText = sched?.teacher ? `👤 ${sched.teacher}` : '';

      const contents: any[] = [
        {
          type: 'box', layout: 'horizontal', alignItems: 'center',
          contents: [
            {
              type: 'box', layout: 'vertical', backgroundColor: sched?.subject ? color : '#E0E0E0',
              width: '28px', height: '28px', justifyContent: 'center', cornerRadius: '8px',
              contents: [{ type: 'text', text: String(p), weight: 'bold', color: '#FFFFFF', size: 'sm', align: 'center' }],
            },
            {
              type: 'box', layout: 'vertical', margin: 'md', flex: 1,
              contents: [
                { type: 'text', text: subjectText, weight: 'bold', size: 'sm', color: sched?.subject ? '#333333' : '#AAAAAA' },
                { type: 'text', text: `🕐 ${timeStr}${teacherText ? '  ' + teacherText : ''}`, size: 'xxs', color: '#888888', margin: 'xs' },
              ],
            },
          ],
        },
      ];

      periodCards.push({
        type: 'box', layout: 'vertical', margin: 'md',
        backgroundColor: '#FFFFFF', paddingAll: '12px', cornerRadius: '10px',
        contents,
      });
    }

    const flexMsg = {
      type: 'flex' as const,
      altText: `📅 ตารางเรียนวัน${dayName}`,
      contents: {
        type: 'bubble', size: 'mega',
        header: {
          type: 'box', layout: 'horizontal', backgroundColor: '#b3e5fc', paddingAll: '20px', paddingTop: '25px',
          contents: [
            {
              type: 'box', layout: 'vertical', flex: 1, justifyContent: 'center',
              contents: [
                { type: 'text', text: '📅 Class Schedule', weight: 'bold', color: '#1565c0', size: 'lg' },
                { type: 'text', text: `ตารางเรียนวัน${dayName}`, weight: 'bold', color: '#455a64', size: 'sm', margin: 'sm' },
              ],
            },
            {
              type: 'image', url: 'https://cdn-icons-png.flaticon.com/512/2693/2693507.png',
              size: '60px', aspectMode: 'fit', position: 'absolute', offsetTop: '15px', offsetEnd: '10px',
            },
          ],
        },
        body: {
          type: 'box', layout: 'vertical', backgroundColor: '#F0F4FA', paddingAll: '10px',
          contents: periodCards,
        },
        footer: {
          type: 'box', layout: 'vertical', backgroundColor: '#F0F4FA', paddingAll: '15px',
          contents: [{
            type: 'button', style: 'primary', color: '#42A5F5', height: 'sm',
            action: { type: 'uri', label: 'ดูตารางเรียน', uri: `${liffUrl}/schedule` },
          }],
        },
      },
    };

    await client.pushMessage({ to: targetId, messages: [flexMsg as any] });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Send schedule error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}

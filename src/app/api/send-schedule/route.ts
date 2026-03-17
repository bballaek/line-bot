import { NextRequest, NextResponse } from 'next/server';
import { messagingApi } from '@line/bot-sdk';

const { MessagingApiClient } = messagingApi;

const THAI_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const BAR_COLORS = ["#1976D2","#388E3C","#F57C00","#8E24AA","#00838F","#C62828","#5C6BC0","#2E7D32"];

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

export async function POST(req: NextRequest) {
  try {
    const client = new MessagingApiClient({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    });

    const { targetId, dayName, schedules } = await req.json();
    if (!targetId) return NextResponse.json({ error: 'Missing targetId' }, { status: 400 });

    const liffUrl = `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}`;
    const now = new Date();
    const dateStr = `ตารางเรียนวัน${dayName}ที่ ${now.getDate()} ${THAI_MONTHS[now.getMonth()]}`;

    // Build timeline rows
    const rows: any[] = [];
    for (let p = 1; p <= 8; p++) {
      const sched = schedules.find((s: any) => s.period === p);
      if (!sched?.subject) continue; // skip empty periods

      const color = BAR_COLORS[(p - 1) % BAR_COLORS.length];
      const startTime = sched.start_time || DEFAULT_TIMES[p - 1].start;
      const endTime = sched.end_time || DEFAULT_TIMES[p - 1].end;
      const timeStr = `${startTime.replace(':', '.')} - ${endTime.replace(':', '.')} น.`;
      const subjectLine = sched.teacher ? `${sched.subject} (${sched.teacher})` : sched.subject;

      rows.push({
        type: 'box', layout: 'horizontal', spacing: 'lg',
        contents: [
          {
            type: 'box', layout: 'vertical', width: '60px', flex: 1, paddingBottom: 'md',
            contents: [
              { type: 'text', text: `คาบ ${p}`, size: 'xs', color: '#AAAAAA', weight: 'bold', align: 'end' }
            ],
          },
          {
            type: 'box', layout: 'vertical', width: '2px', backgroundColor: color,
            contents: [],
          },
          {
            type: 'box', layout: 'vertical', flex: 4,
            contents: [
              { type: 'text', text: subjectLine, weight: 'bold', size: 'md', color: '#111111' },
              { type: 'text', text: timeStr, size: 'xs', color: '#666666', margin: 'xs' },
            ],
          },
        ],
      });
    }

    if (rows.length === 0) {
      rows.push({
        type: 'text', text: 'ไม่มีวิชาเรียนในวันนี้', size: 'sm', color: '#999999', align: 'center',
      });
    }

    const flexMsg = {
      type: 'flex' as const,
      altText: `📅 ตารางเรียนวัน${dayName}`,
      contents: {
        type: 'bubble', size: 'mega',
        header: {
          type: 'box', layout: 'vertical', backgroundColor: '#FF7F50', paddingAll: 'lg',
          contents: [
            { type: 'text', text: 'CLASS SCHEDULE', color: '#FFFFFF', weight: 'bold', size: 'md' },
            { type: 'text', text: dateStr, color: '#FFFFFFCC', size: 'xs', margin: 'xs' },
          ],
        },
        body: {
          type: 'box', layout: 'vertical', spacing: 'xl', paddingAll: 'lg',
          contents: rows,
        },
        footer: {
          type: 'box', layout: 'vertical', paddingAll: 'md',
          contents: [{
            type: 'button', style: 'primary', color: '#FF7F50', height: 'sm',
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

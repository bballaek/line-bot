import { NextRequest, NextResponse } from 'next/server';
import { messagingApi } from '@line/bot-sdk';

const { MessagingApiClient } = messagingApi;

const THAI_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const THAI_DAYS = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];

function formatDueShort(s: string) {
  const d = new Date(s);
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]}`;
}

function formatDueLabel(s: string) {
  const now = new Date();
  const due = new Date(s);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "วันนี้!";
  if (diffDays === 1) return "พรุ่งนี้";
  return `${due.getDate()} ${THAI_MONTHS[due.getMonth()]}`;
}

export async function POST(req: NextRequest) {
  try {
    const client = new MessagingApiClient({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    });

    const { targetId, homework, type } = await req.json();
    if (!targetId) return NextResponse.json({ error: 'Missing targetId' }, { status: 400 });

    const liffUrl = `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}`;

    if (type === 'daily' && Array.isArray(homework)) {
      // ===== Daily Report Flex =====
      const now = new Date();
      const dateStr = `🗓️ วัน${THAI_DAYS[now.getDay()]}ที่ ${now.getDate()} ${THAI_MONTHS[now.getMonth()]} ${now.getFullYear() + 543}`;

      const hwItems: any[] = [];
      homework.slice(0, 8).forEach((hw: any, i: number) => {
        if (i > 0) hwItems.push({ type: 'separator', margin: 'md', color: '#EEEEEE' });
        hwItems.push({
          type: 'box', layout: 'vertical', margin: 'md',
          contents: [
            { type: 'box', layout: 'horizontal', contents: [
              { type: 'text', text: `${i + 1}. ${hw.subject}`, weight: 'bold', color: '#495ca4', size: 'md', flex: 1 },
              ...(hw.due_date ? [{ type: 'text' as const, text: `⏰ ส่ง: ${formatDueLabel(hw.due_date)}`, size: 'xs' as const, color: '#E74C3C', align: 'end' as const, gravity: 'center' as const, flex: 1 }] : []),
            ]},
            { type: 'text', text: `หัวข้อ: ${hw.title}`, size: 'sm', color: '#34495E', margin: 'sm', weight: 'bold' },
            ...(hw.description ? [{ type: 'text' as const, text: hw.description.length > 100 ? hw.description.substring(0, 100) + '...' : hw.description, size: 'sm' as const, color: '#7F8C8D', wrap: true, margin: 'xs' as const }] : []),
          ],
        });
      });

      const flexMsg = {
        type: 'flex' as const,
        altText: `📋 รายงานการบ้านประจำวัน (${homework.length} รายการ)`,
        contents: {
          type: 'bubble', size: 'mega',
          header: {
            type: 'box', layout: 'vertical', backgroundColor: '#495ca4', paddingAll: '5px',
            contents: [{ type: 'text', text: 'HOMEWORK TODAY', weight: 'bold', color: '#FFFFFF', size: 'lg', align: 'center' }],
          },
          body: {
            type: 'box', layout: 'vertical', paddingAll: '20px',
            contents: [
              { type: 'box', layout: 'horizontal', contents: [
                { type: 'text', text: dateStr, size: 'sm', color: '#555551', weight: 'bold', flex: 1 },
                { type: 'text', text: `Total: ${homework.length} งาน`, size: 'sm', color: '#E74C3C', align: 'end', weight: 'bold' },
              ]},
              { type: 'separator', margin: 'md', color: '#DDDDDD' },
              ...hwItems,
            ],
          },
          footer: {
            type: 'box', layout: 'vertical',
            contents: [{ type: 'button', action: { type: 'uri', label: 'ดูการบ้านทั้งหมด', uri: `${liffUrl}/homework-list` } }],
          },
          styles: { footer: { separator: true } },
        },
      };

      await client.pushMessage({ to: targetId, messages: [flexMsg as any] });
    } else if (homework) {
      // ===== Single Homework Flex =====
      const dueText = homework.due_date
        ? `กำหนดส่ง: ${formatDueShort(homework.due_date)}`
        : 'ไม่ระบุกำหนดส่ง';

      const flexMsg = {
        type: 'flex' as const,
        altText: `📋 การบ้าน: ${homework.title}`,
        contents: {
          type: 'bubble',
          body: {
            type: 'box', layout: 'vertical', paddingAll: '20px',
            contents: [
              { type: 'text', text: `${homework.subject}: ${homework.title}`, weight: 'bold', size: 'md', wrap: true },
              { type: 'text', text: dueText, size: 'xs', color: '#666666', margin: 'sm' },
              ...(homework.description ? [{ type: 'text' as const, text: homework.description.length > 200 ? homework.description.substring(0, 200) + '...' : homework.description, size: 'sm' as const, color: '#7F8C8D', wrap: true, margin: 'md' as const }] : []),
              { type: 'button', action: { type: 'uri', label: 'ดูการบ้าน', uri: `${liffUrl}/homework-list` }, color: '#495ca4', margin: 'lg', height: 'sm', style: 'primary' },
            ],
          },
        },
      };

      await client.pushMessage({ to: targetId, messages: [flexMsg as any] });
    } else {
      return NextResponse.json({ error: 'Missing homework data' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Send homework error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}

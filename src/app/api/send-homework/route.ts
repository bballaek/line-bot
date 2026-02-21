import { NextRequest, NextResponse } from 'next/server';
import { messagingApi } from '@line/bot-sdk';

const { MessagingApiClient } = messagingApi;

const THAI_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const THAI_DAYS = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];
const BADGE_COLORS = ["#ff7043","#4DB6AC","#7E57C2","#42A5F5","#66BB6A","#FFA726","#EC407A","#26C6DA"];

function formatDueLabel(s: string) {
  const now = new Date();
  const due = new Date(s);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const time = `${String(due.getHours()).padStart(2,'0')}:${String(due.getMinutes()).padStart(2,'0')} น.`;
  if (diffDays <= 0) return `วันนี้ ${time}`;
  if (diffDays === 1) return `พรุ่งนี้ ${time}`;
  return `${due.getDate()} ${THAI_MONTHS[due.getMonth()]} ${time}`;
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
      // ===== Daily Report Flex (warm theme) =====
      const now = new Date();
      const dateStr = `วัน${THAI_DAYS[now.getDay()]}ที่ ${now.getDate()} ${THAI_MONTHS[now.getMonth()]} ${now.getFullYear() + 543}`;

      const hwCards: any[] = [];
      homework.slice(0, 6).forEach((hw: any, i: number) => {
        const num = String(i + 1).padStart(2, '0');
        const color = BADGE_COLORS[i % BADGE_COLORS.length];

        hwCards.push({
          type: 'box', layout: 'vertical', margin: 'md',
          backgroundColor: '#FFFFFF', paddingAll: '15px', cornerRadius: '12px', paddingBottom: '15px',
          contents: [
            {
              type: 'box', layout: 'horizontal', alignItems: 'center',
              contents: [
                {
                  type: 'box', layout: 'vertical', backgroundColor: color,
                  width: '30px', height: '30px', justifyContent: 'center', cornerRadius: '8px',
                  contents: [{ type: 'text', text: num, weight: 'bold', color: '#FFFFFF', size: 'md', align: 'center' }],
                },
                { type: 'text', text: hw.subject || 'ไม่ระบุวิชา', weight: 'bold', color: '#5e4034', size: 'md', margin: 'md', gravity: 'center', flex: 1 },
              ],
            },
            { type: 'text', text: `หัวข้อ: ${hw.title}`, weight: 'bold', size: 'sm', color: '#333333', margin: 'md' },
            ...(hw.description ? [{
              type: 'text' as const, text: `Details: ${hw.description.length > 80 ? hw.description.substring(0, 80) + '...' : hw.description}`,
              size: 'xxs' as const, color: '#8c7b75', wrap: true, margin: 'xs' as const,
            }] : []),
          ],
        });
      });

      const flexMsg = {
        type: 'flex' as const,
        altText: `📋 การบ้านวันนี้ (${homework.length} รายการ)`,
        contents: {
          type: 'bubble', size: 'mega',
          header: {
            type: 'box', layout: 'horizontal', backgroundColor: '#ffecb3', paddingAll: '20px', paddingTop: '25px',
            contents: [
              {
                type: 'box', layout: 'vertical', flex: 1, justifyContent: 'center',
                contents: [
                  { type: 'text', text: 'HomeWork Today', weight: 'bold', color: '#5e4034', size: 'lg' },
                  { type: 'text', text: dateStr, weight: 'bold', color: '#666666', size: 'xs', margin: 'sm' },
                ],
              },
              {
                type: 'image', url: 'https://cdn-icons-png.flaticon.com/512/9042/9042241.png',
                size: '60px', aspectMode: 'fit', position: 'absolute', offsetEnd: '10px', offsetTop: '20px',
              },
            ],
          },
          body: {
            type: 'box', layout: 'vertical', backgroundColor: '#FFF9F0', paddingAll: '10px',
            contents: hwCards,
          },
          footer: {
            type: 'box', layout: 'vertical', backgroundColor: '#FFF9F0', paddingAll: '15px',
            contents: [{
              type: 'button', style: 'primary', color: '#ffb74d', height: 'sm',
              action: { type: 'uri', label: 'ดูการบ้านทั้งหมด', uri: `${liffUrl}/homework-list` },
            }],
          },
        },
      };

      await client.pushMessage({ to: targetId, messages: [flexMsg as any] });

    } else if (homework) {
      // ===== Single Homework Flex =====
      const dueLabel = homework.due_date ? formatDueLabel(homework.due_date) : 'ไม่ระบุ';

      const bodyContents: any[] = [
        { type: 'text', text: `หัวข้อ: ${homework.title}`, weight: 'bold', size: 'md', color: '#333333' },
        { type: 'separator', margin: 'md', color: '#eeeeee' },
      ];

      if (homework.description) {
        bodyContents.push(
          { type: 'text', text: 'รายละเอียด:', size: 'xs', color: '#8c7b75', margin: 'md' },
          { type: 'text', text: homework.description.length > 200 ? homework.description.substring(0, 200) + '...' : homework.description, size: 'sm', color: '#5e4034', wrap: true, margin: 'xs' },
        );
      }

      bodyContents.push({
        type: 'box', layout: 'horizontal', margin: 'xl', backgroundColor: '#fff4f4', paddingAll: '10px', cornerRadius: '8px',
        contents: [
          { type: 'text', text: '⏰ กำหนดส่ง:', size: 'sm', color: '#8c7b75', flex: 0, gravity: 'center' },
          { type: 'text', text: ` ${dueLabel}`, size: 'md', color: '#d32f2f', weight: 'bold', margin: 'sm', flex: 1, gravity: 'center' },
        ],
      });

      const flexMsg = {
        type: 'flex' as const,
        altText: `📋 การบ้าน: ${homework.subject} - ${homework.title}`,
        contents: {
          type: 'bubble', size: 'mega',
          header: {
            type: 'box', layout: 'horizontal', backgroundColor: '#ffecb3', paddingAll: '20px', paddingTop: '25px',
            contents: [
              {
                type: 'box', layout: 'vertical', flex: 1, justifyContent: 'center',
                contents: [
                  { type: 'text', text: 'การบ้านใหม่', weight: 'bold', color: '#5e4034', size: 'xl' },
                  { type: 'text', text: `วิชา: ${homework.subject || 'ไม่ระบุ'}`, weight: 'bold', color: '#ff7043', size: 'md', margin: 'sm' },
                ],
              },
              {
                type: 'image', url: 'https://cdn-icons-png.flaticon.com/512/891/891446.png',
                size: '70px', aspectMode: 'fit', position: 'absolute', offsetEnd: '0px', offsetTop: '0px',
              },
            ],
          },
          body: {
            type: 'box', layout: 'vertical', backgroundColor: '#FFF9F0', paddingAll: '15px',
            contents: [{
              type: 'box', layout: 'vertical', backgroundColor: '#FFFFFF', paddingAll: '20px', cornerRadius: '12px',
              contents: bodyContents,
            }],
          },
          footer: {
            type: 'box', layout: 'horizontal', backgroundColor: '#FFF9F0', paddingAll: '15px', paddingTop: '0px',
            contents: [{
              type: 'button', style: 'secondary', height: 'sm', margin: 'sm', flex: 1,
              action: { type: 'uri', label: 'ดูการบ้าน', uri: `${liffUrl}/homework-list` },
            }],
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

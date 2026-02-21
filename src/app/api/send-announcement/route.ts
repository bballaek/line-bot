import { NextRequest, NextResponse } from 'next/server';
import { messagingApi } from '@line/bot-sdk';

const { MessagingApiClient } = messagingApi;

export async function POST(req: NextRequest) {
  try {
    const client = new MessagingApiClient({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    });

    const { targetId, announcement, announcements, type } = await req.json();
    if (!targetId) return NextResponse.json({ error: 'Missing targetId' }, { status: 400 });

    const liffUrl = `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}`;

    if (type === 'all' && Array.isArray(announcements)) {
      // ===== All Announcements Flex (blue theme) =====
      const annCards: any[] = [
        { type: 'text', text: `อัปเดต ${announcements.length} เรื่องสำคัญ อย่าลืมอ่านน้า 💌`, size: 'sm', color: '#8c7b75', weight: 'bold', margin: 'sm' },
      ];

      announcements.slice(0, 5).forEach((ann: any, i: number) => {
        annCards.push({
          type: 'box', layout: 'vertical', margin: 'md',
          backgroundColor: '#FFFFFF', paddingAll: '15px', cornerRadius: '12px', paddingBottom: '15px',
          contents: [
            {
              type: 'box', layout: 'horizontal', alignItems: 'center',
              contents: [
                {
                  type: 'box', layout: 'vertical', backgroundColor: '#64b5f6',
                  width: '24px', height: '24px', justifyContent: 'center', cornerRadius: '12px', margin: 'xs',
                  contents: [{ type: 'text', text: String(i + 1), weight: 'bold', color: '#FFFFFF', size: 'sm', align: 'center' }],
                },
                { type: 'text', text: ann.title, weight: 'bold', color: '#111111', size: 'md', margin: 'md', gravity: 'center', flex: 1, wrap: true },
              ],
            },
            ...(ann.content ? [{
              type: 'text' as const, text: ann.content.length > 60 ? ann.content.substring(0, 60) + '...' : ann.content,
              size: 'sm' as const, color: '#666666', wrap: true, margin: 'md' as const,
            }] : []),
          ],
        });
      });

      const flexMsg = {
        type: 'flex' as const,
        altText: `📢 ประกาศ (${announcements.length} รายการ)`,
        contents: {
          type: 'bubble', size: 'mega',
          header: {
            type: 'box', layout: 'horizontal', backgroundColor: '#b3e5fc', paddingAll: '20px', paddingTop: '25px',
            contents: [
              {
                type: 'box', layout: 'vertical', flex: 1, justifyContent: 'center',
                contents: [
                  { type: 'text', text: 'Announcements', weight: 'bold', color: '#1565c0', size: 'xl' },
                  { type: 'text', text: 'ประกาศห้องเรียนล่าสุด ✨', weight: 'bold', color: '#455a64', size: 'sm', margin: 'sm' },
                ],
              },
              {
                type: 'image', url: 'https://cdn-icons-png.flaticon.com/512/1511/1511151.png',
                size: '60px', aspectMode: 'fit', position: 'absolute', offsetTop: '20px', offsetEnd: '15px',
              },
            ],
          },
          body: {
            type: 'box', layout: 'vertical', backgroundColor: '#FFF9F0', paddingAll: '15px',
            contents: annCards,
          },
          footer: {
            type: 'box', layout: 'vertical', backgroundColor: '#FFF9F0', paddingAll: '15px', paddingTop: '0px',
            contents: [{
              type: 'button', style: 'primary', color: '#64b5f6', height: 'sm',
              action: { type: 'uri', label: 'ดูประกาศทั้งหมด', uri: `${liffUrl}/announcements` },
            }],
          },
        },
      };

      await client.pushMessage({ to: targetId, messages: [flexMsg as any] });

    } else if (announcement) {
      // ===== Single Announcement Flex =====
      const isAction = announcement.type === 'action';
      const headerSub = isAction ? 'ประกาศเพื่อดำเนินการ ⚠️' : 'ประกาศเพื่อแจ้งให้ทราบ ✨';

      const cardContents: any[] = [
        { type: 'text', text: `เรื่อง: ${announcement.title}`, weight: 'bold', size: 'md', color: '#111111', margin: 'lg', wrap: true },
        { type: 'separator', margin: 'md', color: '#eeeeee' },
      ];

      if (announcement.content) {
        cardContents.push({
          type: 'text', text: announcement.content.length > 300 ? announcement.content.substring(0, 300) + '...' : announcement.content,
          size: 'sm', color: '#555555', wrap: true, margin: 'md',
        });
      }

      if (announcement.event_date) {
        const d = new Date(announcement.event_date);
        const THAI_MONTHS_LONG = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
        cardContents.push({
          type: 'box', layout: 'horizontal', backgroundColor: '#e3f2fd', paddingAll: '10px', cornerRadius: '8px', margin: 'md',
          contents: [{ type: 'text', text: `📌 วันที่ ${d.getDate()} ${THAI_MONTHS_LONG[d.getMonth()]} ${d.getFullYear() + 543}`, weight: 'bold', color: '#1565c0', size: 'sm', align: 'center' }],
        });
      }

      const detailUri = announcement.id ? `${liffUrl}/announcements/${announcement.id}` : `${liffUrl}/announcements`;

      const flexMsg = {
        type: 'flex' as const,
        altText: `📢 ประกาศ: ${announcement.title}`,
        contents: {
          type: 'bubble', size: 'mega',
          header: {
            type: 'box', layout: 'horizontal', backgroundColor: '#b3e5fc', paddingAll: '20px', paddingTop: '25px',
            contents: [
              {
                type: 'box', layout: 'vertical', flex: 1, justifyContent: 'center',
                contents: [
                  { type: 'text', text: '📢 ANNOUNCEMENT', weight: 'bold', color: '#1565c0', size: 'xl' },
                  { type: 'text', text: headerSub, weight: 'bold', color: '#455a64', size: 'sm', margin: 'sm' },
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
              type: 'box', layout: 'vertical', backgroundColor: '#FFFFFF', paddingAll: '15px', cornerRadius: '12px',
              contents: cardContents,
            }],
          },
          footer: {
            type: 'box', layout: 'horizontal', backgroundColor: '#FFF9F0', paddingAll: '15px', paddingTop: '0px',
            contents: [{
              type: 'button', style: 'secondary', height: 'sm', margin: 'sm', flex: 1,
              action: { type: 'uri', label: 'ดูประกาศทั้งหมด', uri: detailUri },
            }],
          },
        },
      };

      await client.pushMessage({ to: targetId, messages: [flexMsg as any] });

    } else {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Send announcement error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}

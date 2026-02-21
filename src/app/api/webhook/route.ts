import { NextRequest, NextResponse } from 'next/server';
import { validateSignature, WebhookEvent, Client } from '@line/bot-sdk';

// Lazy initialization - only create client when request comes in (not at build time)
function getLineClient() {
  return new Client({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
    channelSecret: process.env.LINE_CHANNEL_SECRET!,
  });
}

export async function POST(req: NextRequest) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET!;
  const client = getLineClient();

  const body = await req.text();
  const signature = req.headers.get('x-line-signature') as string;

  if (!signature || !validateSignature(body, channelSecret, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const events: WebhookEvent[] = JSON.parse(body).events;

  try {
    await Promise.all(
      events.map(async (event) => {
        if (event.type === 'message' && event.message.type === 'text') {
          const text = event.message.text.trim();

          // Command: #การบ้าน
          if (text === '#การบ้าน') {
            const liffUrl = `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}`;
            
            // Send Flex Message with LIFF button
            const flexMessage: any = {
              type: 'flex',
              altText: 'เมนูจัดการการบ้าน',
              contents: {
                type: 'bubble',
                body: {
                  type: 'box',
                  layout: 'vertical',
                  contents: [
                    { type: 'text', text: 'สวัสดีครับ! เลือกเมนูที่ต้องการได้เลย', weight: 'bold', size: 'md' },
                  ]
                },
                footer: {
                  type: 'box',
                  layout: 'vertical',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'button',
                      style: 'primary',
                      height: 'sm',
                      action: {
                        type: 'uri',
                        label: '➕ เพิ่มการบ้าน',
                        uri: `${liffUrl}/add-homework`
                      }
                    },
                    {
                      type: 'button',
                      style: 'secondary',
                      height: 'sm',
                      action: {
                        type: 'uri',
                        label: '📋 ดูการบ้านทั้งหมด',
                        uri: `${liffUrl}/homework-list`
                      }
                    },
                    {
                      type: 'button',
                      style: 'link',
                      height: 'sm',
                      action: {
                        type: 'uri',
                        label: '⚙️ ตั้งค่า',
                        uri: `${liffUrl}/settings`
                      }
                    }
                  ]
                }
              }
            };

            await client.replyMessage(event.replyToken, flexMessage);
          }
        }
      })
    );
    return NextResponse.json({ message: 'OK' }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

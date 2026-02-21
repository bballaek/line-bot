import { NextRequest, NextResponse } from 'next/server';
import { messagingApi } from '@line/bot-sdk';

const { MessagingApiClient } = messagingApi;

export async function GET(req: NextRequest) {
  try {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
    const client = new MessagingApiClient({ channelAccessToken: token });

    // Test: verify bot info
    const botInfo = await client.getBotInfo();

    return NextResponse.json({
      status: 'ok',
      bot: {
        displayName: botInfo.displayName,
        userId: botInfo.userId,
      },
      tokenPrefix: token.substring(0, 10) + '...',
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message || String(error),
      tokenSet: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
    }, { status: 500 });
  }
}

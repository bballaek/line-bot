import { messagingApi } from "@line/bot-sdk";

export function getLineClient() {
  return new messagingApi.MessagingApiClient({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  });
}

export async function fetchAllGroupMemberIds(groupId: string): Promise<string[]> {
  const client = getLineClient();
  const ids: string[] = [];
  let start: string | undefined;

  do {
    const res = await client.getGroupMembersIds(groupId, start);
    ids.push(...(res.memberIds || []));
    start = res.next;
  } while (start);

  return ids;
}

export async function fetchGroupMemberProfile(groupId: string, userId: string) {
  const client = getLineClient();
  try {
    return await client.getGroupMemberProfile(groupId, userId);
  } catch {
    try {
      return await client.getProfile(userId);
    } catch {
      return null;
    }
  }
}

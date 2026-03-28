/**
 * Expo Push Notifications channel.
 * Sends push notifications to mobile app (React Native Expo).
 */

interface ExpoPushMessage {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  priority?: "default" | "normal" | "high";
}

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: Record<string, unknown>;
}

export async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
  accessToken?: string,
): Promise<ExpoPushTicket[]> {
  if (!tokens.length) return [];

  const messages: ExpoPushMessage[] = tokens.map((to) => ({
    to,
    title,
    body,
    data,
    sound: "default",
    priority: "high",
  }));

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Accept-Encoding": "gzip, deflate",
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const resp = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers,
    body: JSON.stringify(messages),
  });

  if (!resp.ok) {
    throw new Error(`Expo push failed: ${resp.status} ${await resp.text()}`);
  }

  const result = await resp.json() as { data: ExpoPushTicket[] };
  return result.data;
}

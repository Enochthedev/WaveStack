/**
 * Telegram notification channel.
 * Sends alerts to a Telegram chat.
 */

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
  parseMode: "HTML" | "Markdown" = "HTML",
): Promise<void> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Telegram send failed: ${resp.status} ${err}`);
  }
}

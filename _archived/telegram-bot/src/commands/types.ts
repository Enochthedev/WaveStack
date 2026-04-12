import { Context } from 'telegraf';

/** Extract message text from any Telegraf context. Returns undefined if not a text message. */
export function getMessageText(ctx: Context): string | undefined {
  return ctx.message && 'text' in ctx.message ? ctx.message.text : undefined;
}

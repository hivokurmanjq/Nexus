// ═══════════════════════════════════════════════════════════
//  NEXUS — AI Reply Handler
//  از worker.js اصلی منتقل شده — بدون حذف
// ═══════════════════════════════════════════════════════════

import { Utils } from '../lib/utils.js';
import { Views } from '../views/index.js';
import { Log } from '../lib/log.js';

export async function handleAIReply(ctx) {
  const s = await ctx.getSettings();
  if (!s.ai.enabled) return false;
  if (!ctx.env.AI) return false;
  if (s.shutup) return false;

  const botUsername = (ctx.env.BOT_USERNAME || '').toLowerCase();
  const text = ctx.text || '';
  const textLower = text.toLowerCase();

  const isMention = botUsername && (
    textLower.includes('@' + botUsername) || textLower.includes(botUsername)
  );
  const replyFrom = ctx.message.reply_to_message?.from;
  const isReplyToBot = replyFrom?.is_bot && replyFrom?.username?.toLowerCase() === botUsername;
  const isAdm = await ctx.isAdmin();

  let triggerReason = null;
  if (s.ai.replyToAdmins && isAdm) triggerReason = 'admin';
  if (s.ai.replyOnMention && isMention) triggerReason = 'mention';
  if (s.ai.replyOnReply && isReplyToBot) triggerReason = 'reply';
  if (!triggerReason) return false;

  if (triggerReason === 'admin' && !isMention && !isReplyToBot) {
    const t = text.trim();
    if (t.length < 12) return false;

    const words = t.split(/\s+/).filter(Boolean);
    if (words.length === 1 && t.length < 15) return false;

    const known = [
      'پین', 'پینگ', 'ping', 'بن', 'میوت', 'کیک', 'اخطار', 'حذف', 'پاکسازی',
      'تنظیمات', 'پنل', 'امار', 'آمار', 'پروفایل', 'لقب', 'ارتقا', 'تنزل',
      'قوانین', 'یادداشت', 'راهنما', 'سلام', 'ممنون', 'مرسی', 'اوکی',
      'ok', 'okay', 'thanks', 'thx', 'lol', 'lmao', 'hey', 'hi', 'hello',
      'شروع', 'استارت', 'start', 'help', 'بازی', 'اسلات', 'تاس', 'مسابقه',
      'وضعیت', 'status', 'داشبورد',
    ];
    const first = words[0].toLowerCase().replace(/[!؟?.،,]/g, '');
    if (known.includes(first)) return false;

    if (!/[\p{L}\p{N}]/u.test(t)) return false;
  }

  const rl = await ctx.db.checkRate(`ai:${ctx.chat.id}:${ctx.from.id}`, s.ai.rateLimit || 10, 60);
  if (!rl.allowed) return false;

  let userText = text;
  if (botUsername) userText = userText.replace(new RegExp('@' + botUsername, 'gi'), '').trim();
  if (!userText || userText.length < 2) return false;

  try {
    await ctx.api.sendChatAction(ctx.chat.id, 'typing');
    const result = await ctx.ai.chat(userText, ctx.from?.first_name || 'کاربر');
    if (result?.text) {
      await ctx.reply(
        `<b>🧠 پاسخ هوشمند</b>\n<blockquote>${Utils.escapeHtml(result.text)}</blockquote>`
      );
      return true;
    }
    if (result?.error === 'NO_BINDING') {
      await ctx.reply(Views.error('AI پیکربندی نشده'));
      return true;
    }
    await ctx.reply(Views.info('در حال حاضر پاسخگو نیستم، بعداً تلاش کن.'));
    return true;
  } catch (err) {
    Log.error('ai_handler', { err: err.message });
    return false;
  }
}

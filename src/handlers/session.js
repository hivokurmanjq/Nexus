// ═══════════════════════════════════════════════════════════
//  NEXUS — Session Input Handler
//  از worker.js اصلی منتقل شده — بدون حذف
// ═══════════════════════════════════════════════════════════

import { Utils } from '../lib/utils.js';
import { Views } from '../views/index.js';

export async function handleSessionInput(ctx, session) {
  const a = session.action;
  const inp = ctx.text;

  if (inp === '/cancel' || inp === 'لغو') {
    await ctx.db.clearSession(ctx.chat.id, ctx.from.id);
    return ctx.reply(Views.info('لغو شد'));
  }

  if (a === 'addword') {
    const ws = inp.split(/[\s,،]+/).filter(w => w);
    for (const w of ws) await ctx.db.addBlacklistWord(ctx.chat.id, w);
    await ctx.db.clearSession(ctx.chat.id, ctx.from.id);
    return ctx.reply(Views.success(`${ws.length} کلمه اضافه شد`));
  }

  if (a === 'addlink') {
    const ls = inp.split(/[\s,،]+/).filter(l => l);
    for (const l of ls) {
      const d = Utils.extractDomain(l) || l.toLowerCase();
      await ctx.db.addWhitelistLink(ctx.chat.id, d);
    }
    await ctx.db.clearSession(ctx.chat.id, ctx.from.id);
    return ctx.reply(Views.success(`${ls.length} دامنه اضافه شد`));
  }

  if (a === 'setwelcome') {
    await ctx.updateSettings(s => { s.welcome.text = inp; s.welcome.enabled = true; return s; });
    await ctx.db.clearSession(ctx.chat.id, ctx.from.id);
    return ctx.reply(Views.success('متن خوش‌آمد ذخیره شد'));
  }

  if (a === 'setgoodbye') {
    await ctx.updateSettings(s => { s.goodbye.text = inp; s.goodbye.enabled = true; return s; });
    await ctx.db.clearSession(ctx.chat.id, ctx.from.id);
    return ctx.reply(Views.success('متن خداحافظی ذخیره شد'));
  }

  if (a === 'addtrigger_key') {
    await ctx.db.setSession(ctx.chat.id, ctx.from.id, 'addtrigger_val', { keyword: inp });
    return ctx.reply(Views.inputPrompt('پاسخ خودکار',
      `کلمه: <code>${Utils.escapeHtml(inp)}</code>\nحالا <b>پاسخ</b> رو بفرست`
    ));
  }

  if (a === 'addtrigger_val') {
    const k = session.data?.keyword;
    if (k) {
      await ctx.db.saveTrigger(ctx.chat.id, k, inp, ctx.from.id);
      await ctx.db.clearSession(ctx.chat.id, ctx.from.id);
      return ctx.reply(Views.success(`پاسخ برای <code>${Utils.escapeHtml(k)}</code> ذخیره شد`));
    }
  }

  if (a === 'addnote_name') {
    await ctx.db.setSession(ctx.chat.id, ctx.from.id, 'addnote_content', { name: inp });
    return ctx.reply(Views.inputPrompt('یادداشت جدید',
      `نام: <code>#${Utils.escapeHtml(inp)}</code>\nحالا <b>محتوا</b> رو بفرست`
    ));
  }

  if (a === 'addnote_content') {
    const n = session.data?.name;
    if (n) {
      await ctx.db.saveNote(ctx.chat.id, n, inp, ctx.from.id);
      await ctx.db.clearSession(ctx.chat.id, ctx.from.id);
      return ctx.reply(Views.success(`<code>#${Utils.escapeHtml(n)}</code> ذخیره شد`));
    }
  }

  if (a === 'schedule_wait') {
    await ctx.db.setSession(ctx.chat.id, ctx.from.id, 'schedule_time', { text: inp }, 600);
    return ctx.reply(Views.inputPrompt('زمان ارسال',
      `متن ذخیره شد ✓\n\nحالا زمان رو بفرست\n<i>مثال: 5m، 2h، 1d</i>`
    ));
  }

  if (a === 'schedule_time') {
    const dur = Utils.parseDuration(inp);
    if (!dur) return ctx.reply(Views.error('زمان نامعتبر — مثال: 5m، 2h، 1d'));
    const sendAt = Math.floor(Date.now() / 1000) + dur;
    await ctx.db.createScheduled(ctx.chat.id, session.data.text, sendAt, 0, ctx.from.id);
    await ctx.db.clearSession(ctx.chat.id, ctx.from.id);
    return ctx.reply(Views.success(`پیام برای ${Utils.formatDuration(dur)} دیگر زمان‌بندی شد`));
  }

  if (a === 'scheddaily_wait') {
    await ctx.db.setSession(ctx.chat.id, ctx.from.id, 'scheddaily_interval', { text: inp }, 600);
    return ctx.reply(Views.inputPrompt('فاصله تکرار',
      `متن ذخیره شد ✓\n\nحالا فاصله تکرار رو بفرست\n<i>مثال: 6h، 1d، 1w</i>`
    ));
  }

  if (a === 'scheddaily_interval') {
    const dur = Utils.parseDuration(inp);
    if (!dur) return ctx.reply(Views.error('بازه نامعتبر'));
    const sendAt = Math.floor(Date.now() / 1000) + dur;
    await ctx.db.createScheduled(ctx.chat.id, session.data.text, sendAt, dur, ctx.from.id);
    await ctx.db.clearSession(ctx.chat.id, ctx.from.id);
    return ctx.reply(Views.success(`پیام هر ${Utils.formatDuration(dur)} تکرار می‌شود`));
  }

  if (a === 'welcomemedia') {
    const m = ctx.message;
    let media = null;
    if (m.photo) media = { type: 'photo', file_id: m.photo[m.photo.length - 1].file_id };
    else if (m.video) media = { type: 'video', file_id: m.video.file_id };
    else if (m.animation) media = { type: 'animation', file_id: m.animation.file_id };
    if (!media) return ctx.reply(Views.error('عکس، ویدیو یا گیف بفرست'));
    await ctx.updateSettings(s => { s.welcome.media = media; return s; });
    await ctx.db.clearSession(ctx.chat.id, ctx.from.id);
    return ctx.reply(Views.success('مدیا برای خوش‌آمد تنظیم شد'));
  }

  if (a === 'addchain_step') {
    const step = parseInt(inp, 10);
    if (isNaN(step) || step < 1 || step > 20) {
      return ctx.reply(Views.error('عدد بین ۱ تا ۲۰ وارد کن'));
    }
    await ctx.db.setSession(ctx.chat.id, ctx.from.id, 'addchain_action', { step }, 600);
    return ctx.reply(Views.inputPrompt('اکشن زنجیره',
      `پله: <b>${step}</b>\n\nاکشن رو بفرست:\n<code>mute 1h</code> یا <code>ban</code> یا <code>kick</code>`
    ));
  }

  if (a === 'addchain_action') {
    const parts = inp.split(/\s+/);
    const action = parts[0].toLowerCase();
    const dur = Utils.parseDuration(parts[1]) || 0;
    if (!['mute', 'ban', 'kick'].includes(action)) {
      return ctx.reply(Views.error('اکشن نامعتبر — فقط mute، ban، kick'));
    }
    await ctx.db.setWarnChain(ctx.chat.id, session.data.step, action, dur);
    await ctx.db.clearSession(ctx.chat.id, ctx.from.id);
    return ctx.reply(Views.success(`پله ${session.data.step} → ${action}`));
  }
}

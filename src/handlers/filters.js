// ═══════════════════════════════════════════════════════════
//  NEXUS — Filters & Lazy Expiration
//  از worker.js اصلی منتقل شده — بدون حذف
// ═══════════════════════════════════════════════════════════

import { Utils } from '../lib/utils.js';
import { RESTRICT_ALL } from '../config/constants.js';
import { Views } from '../views/index.js';

// ── Auto delete helper ──
export async function deleteLater(api, chatId, messageId, ms) {
  const delay = Math.min(ms, 25000);
  await new Promise(r => setTimeout(r, delay));
  try { await api.deleteMessage(chatId, messageId); } catch {}
}

// ── Main message filter pipeline ──
export async function runFilters(ctx) {
  const s = await ctx.getSettings();
  if (s.shutup) return false;
  if (await ctx.isAdmin()) return false;

  const gb = await ctx.db.isGlobalBanned(ctx.from.id);
  if (gb) {
    await ctx.api.banMember(ctx.chat.id, ctx.from.id);
    await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);
    ctx.ctx.waitUntil(ctx.send(
      `<b>بن سراسری</b>\n${Utils.mention(ctx.from)} در همه گروه‌ها مسدود است`
    ));
    return true;
  }

  if (s.nightMode.enabled && Utils.isNightTime(s.nightMode.from, s.nightMode.to)) {
    await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);
    const w = await ctx.send(
      `<b>🌙 حالت شب</b>\n${Utils.mention(ctx.from)}، در این ساعت پیام مجاز نیست`
    );
    if (w?.result) ctx.ctx.waitUntil(deleteLater(ctx.api, ctx.chat.id, w.result.message_id, 5000));
    return true;
  }

  if (s.locks.lockdown) {
    await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);
    ctx.ctx.waitUntil(ctx.db.incrementStat(ctx.chat.id, 'deletions'));
    return true;
  }

  const m = ctx.message;
  const lc = [
    s.locks.sticker && m.sticker,
    s.locks.gif && m.animation,
    s.locks.photo && m.photo,
    s.locks.video && m.video,
    s.locks.voice && m.voice,
    s.locks.audio && m.audio,
    s.locks.document && m.document && !m.animation,
    s.locks.forward && (m.forward_origin || m.forward_from || m.forward_date),
    s.locks.url && Utils.extractUrls(ctx.text || '').length > 0,
    s.locks.bot && ctx.from?.is_bot,
    s.locks.inline && m.via_bot,
    s.locks.game && m.game,
  ];
  if (lc.some(c => c)) {
    await ctx.api.deleteMessage(ctx.chat.id, m.message_id);
    ctx.ctx.waitUntil(ctx.db.incrementStat(ctx.chat.id, 'deletions'));
    return true;
  }

  if (s.antiLanguage && ctx.text && ctx.text.length > 4) {
    const lang = Utils.detectLanguage(ctx.text);
    const allowed = s.allowedLanguages || ['fa', 'en'];
    if (lang !== 'unknown' && lang !== 'mixed' && !allowed.includes(lang)) {
      await ctx.api.deleteMessage(ctx.chat.id, m.message_id);
      const w = await ctx.send(
        `<b>فیلتر زبان</b>\n${Utils.mention(ctx.from)}\n<i>فقط ${allowed.map(l => l.toUpperCase()).join('، ')} مجاز است</i>`
      );
      if (w?.result) ctx.ctx.waitUntil(deleteLater(ctx.api, ctx.chat.id, w.result.message_id, 5000));
      ctx.ctx.waitUntil(ctx.db.incrementStat(ctx.chat.id, 'deletions'));
      return true;
    }
  }

  if (s.antiLink && ctx.text) {
    const urls = Utils.extractUrls(ctx.text);
    if (urls.length > 0) {
      const wl = await ctx.db.getWhitelistLinks(ctx.chat.id);
      let bad = false;
      for (const u of urls) {
        const d = Utils.extractDomain(u);
        if (!wl.includes(d)) { bad = true; break; }
      }
      if (bad) {
        await ctx.api.deleteMessage(ctx.chat.id, m.message_id);
        const w = await ctx.send(Views.filterAlert('link'));
        if (w?.result) ctx.ctx.waitUntil(deleteLater(ctx.api, ctx.chat.id, w.result.message_id, 5000));
        ctx.ctx.waitUntil(ctx.db.incrementStat(ctx.chat.id, 'deletions'));
        return true;
      }
    }
  }

  if (s.antiWord && ctx.text) {
    const words = await ctx.db.getBlacklistWords(ctx.chat.id);
    if (words.length > 0) {
      const n = Utils.normalize(ctx.text);
      const tok = n.split(' ');
      for (const w of words) {
        const nw = Utils.normalize(w);
        if (tok.includes(nw) || n.includes(nw)) {
          await ctx.api.deleteMessage(ctx.chat.id, m.message_id);
          const wm = await ctx.send(Views.filterAlert('word'));
          if (wm?.result) ctx.ctx.waitUntil(deleteLater(ctx.api, ctx.chat.id, wm.result.message_id, 5000));
          ctx.ctx.waitUntil(ctx.db.incrementStat(ctx.chat.id, 'deletions'));
          return true;
        }
      }
    }
  }

  const ext = await ctx.db.getChatExt(ctx.chat.id);
  if (ext.anti_channel) {
    const fo = m.forward_origin;
    if (fo?.type === 'channel') {
      await ctx.api.deleteMessage(ctx.chat.id, m.message_id);
      const w = await ctx.send(
        `<b>فوروارد کانال</b>\n${Utils.mention(ctx.from)}\n<i>فوروارد از کانال مجاز نیست</i>`
      );
      if (w?.result) ctx.ctx.waitUntil(deleteLater(ctx.api, ctx.chat.id, w.result.message_id, 5000));
      ctx.ctx.waitUntil(ctx.db.incrementStat(ctx.chat.id, 'deletions'));
      ctx.ctx.waitUntil(ctx.db.logAction(ctx.chat.id, 0, ctx.from.id, 'anti_channel', null));
      return true;
    }
  }

  if (s.antiFlood && !ctx.isEdited) {
    const k = `flood:${ctx.chat.id}:${ctx.from.id}`;
    const now = Date.now();
    const t = (await ctx.cache.get(k)) || [];
    const win = s.floodSeconds * 1000;
    const rec = t.filter(x => now - x < win);
    rec.push(now);
    await ctx.cache.set(k, rec, 60);
    if (rec.length >= s.floodMax) {
      const until = Math.floor(Date.now() / 1000) + s.floodMute;
      await ctx.api.restrictMember(ctx.chat.id, ctx.from.id, RESTRICT_ALL, until);
      await ctx.cache.set(k, [], 60);
      const w = await ctx.send(
        `<b>ضد فلود</b>\n\n${Utils.mention(ctx.from)}\n<i>${Utils.formatDuration(s.floodMute)} ساکت شد</i>`
      );
      if (w?.result) ctx.ctx.waitUntil(deleteLater(ctx.api, ctx.chat.id, w.result.message_id, 8000));
      ctx.ctx.waitUntil(ctx.db.incrementStat(ctx.chat.id, 'mutes'));
      return true;
    }
  }
  return false;
}

// ── Lazy expiration (بدون setTimeout) ──
export async function lazyExpiration(ctx) {
  if (!ctx.isGroup()) return;

  const lock = await ctx.db.first(
    `SELECT expires_at FROM user_sessions WHERE chat_id=? AND user_id=0 AND action='raid_lock'`,
    [ctx.chat.id]
  );
  if (lock) {
    const now = Math.floor(Date.now() / 1000);
    if (lock.expires_at <= now) {
      await ctx.updateSettings(st => { st.locks.lockdown = false; return st; });
      await ctx.db.clearSession(ctx.chat.id, 0);
      ctx.ctx.waitUntil(ctx.send(`<b>قفل رید برداشته شد</b>`));
    }
  }

  const expired = await ctx.db.all(
    `SELECT user_id,message_id FROM captcha_pending WHERE chat_id=? AND expires_at<=unixepoch()`,
    [ctx.chat.id]
  );
  if (expired.length) {
    const s = await ctx.getSettings();
    for (const e of expired) {
      if (s.captcha.kickOnFail) {
        ctx.ctx.waitUntil(ctx.api.deleteMessage(ctx.chat.id, e.message_id));
        ctx.ctx.waitUntil(ctx.api.banMember(ctx.chat.id, e.user_id));
        ctx.ctx.waitUntil(ctx.api.unbanMember(ctx.chat.id, e.user_id));
        ctx.ctx.waitUntil(
          ctx.send(`<b>اخراج</b>\nکاربر <code>${e.user_id}</code> به دلیل عدم پاسخ کپچا اخراج شد`)
        );
      }
      ctx.ctx.waitUntil(ctx.db.deletePendingCaptcha(ctx.chat.id, e.user_id));
    }
  }
}

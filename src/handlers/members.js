// ═══════════════════════════════════════════════════════════
//  NEXUS — New/Left Members Handler
//  از worker.js اصلی منتقل شده — بدون حذف
// ═══════════════════════════════════════════════════════════

import { Utils } from '../lib/utils.js';
import { RESTRICT_ALL, DEFAULT_WELCOME } from '../config/constants.js';
import { Views } from '../views/index.js';

// ── New members ──
export async function handleNewMembers(ctx) {
  const s = await ctx.getSettings();
  const mem = ctx.message.new_chat_members || [];
  if (s.deleteService) await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);

  const fed = await ctx.db.getChatFederation(ctx.chat.id);
  for (const u of mem) {
    const gb = await ctx.db.isGlobalBanned(u.id);
    if (gb) {
      await ctx.api.banMember(ctx.chat.id, u.id);
      await ctx.send(
        `<b>بن سراسری</b>\n${Utils.mention(u)} در همه گروه‌ها مسدود است`
      );
      return;
    }
    if (fed) {
      const fb = await ctx.db.isFedBanned(fed.id, u.id);
      if (fb) {
        await ctx.api.banMember(ctx.chat.id, u.id);
        await ctx.send(
          `<b>بن فدرال</b>\n${Utils.mention(u)} در فدراسیون <b>${Utils.escapeHtml(fed.name)}</b> مسدود است`
        );
        return;
      }
    }
  }

  if (s.antiRaid) {
    for (const m of mem) if (!m.is_bot) await ctx.db.logRaidJoin(ctx.chat.id, m.id);
    const rec = await ctx.db.getRecentJoins(ctx.chat.id, s.raid.window);
    if (rec >= s.raid.threshold) {
      await ctx.updateSettings(st => { st.locks.lockdown = true; return st; });
      await ctx.send(Views.raidAlert(rec, s.raid.lockDuration));
      await ctx.db.execute(
        `INSERT INTO user_sessions (chat_id,user_id,action,expires_at) VALUES (?,0,'raid_lock',?)
         ON CONFLICT(chat_id,user_id) DO UPDATE SET expires_at=excluded.expires_at`,
        [ctx.chat.id, Math.floor(Date.now() / 1000) + s.raid.lockDuration]
      );
      return;
    }
  }

  ctx.ctx.waitUntil(ctx.db.cleanOldRaidEvents());
  const ext = await ctx.db.getChatExt(ctx.chat.id);

  for (const u of mem) {
    if (u.is_bot) continue;
    ctx.ctx.waitUntil(ctx.db.upsertUser(u));
    ctx.ctx.waitUntil(ctx.db.incrementStat(ctx.chat.id, 'new_users'));

    if (ctx.message.from?.id && ctx.message.from.id !== u.id) {
      ctx.ctx.waitUntil((async () => {
        const c = await ctx.db.addInvite(ctx.chat.id, ctx.message.from.id);
        if (c === 5) await ctx.db.unlockAchievement(ctx.chat.id, ctx.message.from.id, 'inviter_5');
        if (c === 20) await ctx.db.unlockAchievement(ctx.chat.id, ctx.message.from.id, 'inviter_20');
      })());
    }

    if (ext.approval_mode) {
      await ctx.api.restrictMember(ctx.chat.id, u.id, RESTRICT_ALL);
      const admins = await ctx.api.getChatAdministrators(ctx.chat.id);
      let notifyText = `<b>عضو جدید در انتظار تأیید</b>\n`;
      notifyText += `<blockquote>${Utils.mention(u)}\nگروه: <b>${Utils.escapeHtml(ctx.chat.title)}</b></blockquote>\n\n`;
      notifyText += `<i>تأیید یا رد کن</i>`;
      if (admins.ok) {
        for (const a of admins.result.slice(0, 3)) {
          if (a.user.is_bot) continue;
          ctx.ctx.waitUntil(
            ctx.api.sendMessage(a.user.id, notifyText, {
              reply_markup: {
                inline_keyboard: [[
                  { text: '✓ تأیید', callback_data: `app:yes:${ctx.chat.id}:${u.id}` },
                  { text: '✗ رد', callback_data: `app:no:${ctx.chat.id}:${u.id}` },
                ]],
              },
            }).catch(() => {})
          );
        }
      }
      continue;
    }

    if (s.captcha.enabled) { await sendCaptcha(ctx, u, s); continue; }
    if (s.welcome.enabled) await sendWelcome(ctx, u, s);
  }
}

// ── Send captcha ──
export async function sendCaptcha(ctx, user, s) {
  await ctx.api.restrictMember(ctx.chat.id, user.id, RESTRICT_ALL);
  let v, ans;
  if (s.captcha.type === 'math') {
    const c = Utils.generateMathCaptcha();
    v = Views.captchaMath(user, ctx.chat, c);
    ans = c.answer;
  } else if (s.captcha.type === 'emoji') {
    const c = Utils.generateEmojiCaptcha();
    v = Views.captchaEmoji(user, ctx.chat, c);
    ans = c.answer;
  } else {
    v = Views.captchaButton(user, ctx.chat);
    ans = 'verified';
  }
  const msg = await ctx.send(v.text, { reply_markup: v.keyboard });
  if (msg?.ok) {
    await ctx.db.savePendingCaptcha(ctx.chat.id, user.id, ans, msg.result.message_id, s.captcha.timeout);
  }
}

// ── Send welcome ──
export async function sendWelcome(ctx, user, s) {
  let c = 0;
  try {
    const cached = await ctx.cache.get(`member_count:${ctx.chat.id}`);
    if (cached !== null) c = cached;
    else {
      const r = await ctx.api.getChatMemberCount(ctx.chat.id);
      c = r.ok ? r.result : 0;
      await ctx.cache.set(`member_count:${ctx.chat.id}`, c, 60);
    }
  } catch {}

  const tpl = s.welcome.text || DEFAULT_WELCOME;
  const text = Utils.renderTemplate(tpl.replace(/\{DOT\}/g, '·'), {
    name: Utils.escapeHtml(user.first_name || 'کاربر'),
    mention: Utils.mention(user),
    group: Utils.escapeHtml(ctx.chat.title || 'گروه'),
    count: String(c),
    id: String(user.id),
  });

  if (s.welcome.cleanPrevious) {
    const pid = await ctx.cache.get(`welcome:${ctx.chat.id}`);
    if (pid) ctx.ctx.waitUntil(ctx.api.deleteMessage(ctx.chat.id, pid));
  }
  const extra = {};
  if (s.welcome.media?.file_id) {
    if (s.welcome.media.type === 'photo') extra.photo = s.welcome.media.file_id;
    else if (s.welcome.media.type === 'video') extra.video = s.welcome.media.file_id;
    else if (s.welcome.media.type === 'animation') extra.animation = s.welcome.media.file_id;
  }
  const msg = await ctx.send(text, extra);
  if (msg?.ok && s.welcome.cleanPrevious) {
    await ctx.cache.set(`welcome:${ctx.chat.id}`, msg.result.message_id, 86400);
  }
}

// ── Left member ──
export async function handleLeftMember(ctx) {
  const s = await ctx.getSettings();
  if (s.deleteService) await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);
  if (!s.goodbye.enabled) return;
  const u = ctx.message.left_chat_member;
  if (!u || u.is_bot) return;
  ctx.ctx.waitUntil(ctx.db.incrementStat(ctx.chat.id, 'left_users'));
  ctx.ctx.waitUntil(ctx.db.cleanReputationForUser(ctx.chat.id, u.id));

  const def = `<b>خداحافظ</b>\n\n${Utils.mention(u)} از گروه رفت`;
  const text = Utils.renderTemplate(s.goodbye.text || def, {
    name: Utils.escapeHtml(u.first_name || 'کاربر'),
    mention: Utils.mention(u),
    group: Utils.escapeHtml(ctx.chat.title || 'گروه'),
  });
  await ctx.send(text);
}

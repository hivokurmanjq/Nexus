// ═══════════════════════════════════════════════════════════
//  NEXUS — Callback Handler (Fixed)
// ═══════════════════════════════════════════════════════════

import { Utils } from '../lib/utils.js';
import { Views } from '../views/index.js';
import { RESTRICT_ALL, UNRESTRICT_ALL, D } from '../config/constants.js';
import { nxPremiumCallback } from '../views/premium.js';
import { nxHandleCallback } from '../nexus/core.js';
import { nexusV14HandleCallback } from '../views/v14.js';
import { Log } from '../lib/log.js';

export async function handleCallback(ctx) {
  if (await nxPremiumCallback(ctx)) return;
  const d = ctx.text;
  if (await nxHandleCallback(ctx, d)) return;
  if (await nexusV14HandleCallback(ctx)) return;
  if (d.startsWith('cap:')) return handleCaptchaCallback(ctx, d);
  if (d.startsWith('app:')) return handleApprovalCallback(ctx, d);
  if (d.startsWith('confirm:')) return handleConfirmCallback(ctx, d);
  if (d === 'noop') return ctx.answer();

  // ── Public views ──
  if (d === 'v:start') { const v = Views.start(ctx); await ctx.editText(v.text, { reply_markup: v.keyboard }); return ctx.answer(); }
  if (d === 'v:help') { const v = Views.help(); await ctx.editText(v.text, { reply_markup: v.keyboard }); return ctx.answer(); }
  if (d === 'v:help_admin') { const v = Views.helpAdmin(); await ctx.editText(v.text, { reply_markup: v.keyboard }); return ctx.answer(); }
  if (d === 'v:help_fun') { const v = Views.helpFun(); await ctx.editText(v.text, { reply_markup: v.keyboard }); return ctx.answer(); }
  if (d === 'v:help_security') { const v = Views.helpSecurity(); await ctx.editText(v.text, { reply_markup: v.keyboard }); return ctx.answer(); }
  if (d === 'v:help_ai') { const v = Views.helpAI(); await ctx.editText(v.text, { reply_markup: v.keyboard }); return ctx.answer(); }
  if (d === 'v:help_fed') { const v = Views.helpFed(); await ctx.editText(v.text, { reply_markup: v.keyboard }); return ctx.answer(); }
  if (d === 'v:help_auto') { const v = Views.helpAuto(); await ctx.editText(v.text, { reply_markup: v.keyboard }); return ctx.answer(); }
  if (d === 'v:help_advanced') { const v = Views.helpAdvanced(); await ctx.editText(v.text, { reply_markup: v.keyboard }); return ctx.answer(); }
  if (d === 'v:about') { const v = Views.about(); await ctx.editText(v.text, { reply_markup: v.keyboard }); return ctx.answer(); }
  if (d === 'v:dashboard') {
    const token = await ctx.db.createDashboardToken(ctx.from.id);
    const url = (ctx.env.WORKER_URL || 'https://your-worker.workers.dev') + `/dashboard?token=${token}`;
    await ctx.editText(
      `<b>داشبورد وب</b>\n<blockquote>لینک اختصاصی شما ✦\nمعتبر برای ۷ روز</blockquote>`,
      { reply_markup: { inline_keyboard: [[{ text: '🌐  باز کردن', url }], [{ text: '← بازگشت', callback_data: 'v:start' }]] } }
    );
    return ctx.answer();
  }

  // ── Panel views ──
  if (d.startsWith('p:')) {
    if (!ctx.isGroup()) return ctx.answer('فقط در گروه', true);
    if (d !== 'p:close' && d !== 'p:status_refresh' && !(await ctx.isAdmin())) return ctx.answer('فقط ادمین‌ها', true);
    const s = await ctx.getSettings();
    const v = d.slice(2);

    if (v === 'status_refresh') {
      const view = await Views.statusPanel(ctx);
      await ctx.editText(view.text, { reply_markup: view.keyboard });
      return ctx.answer('✓ به‌روز شد');
    }

    let view;
    if (v === 'main') view = Views.panelMain(ctx.chat, s);
    else if (v === 'security') view = Views.panelSecurity(s);
    else if (v === 'locks') view = Views.panelLocks(s);
    else if (v === 'filters') view = await Views.panelFilters(ctx);
    else if (v === 'welcome') view = Views.panelWelcome(s);
    else if (v === 'captcha') view = Views.panelCaptcha(s);
    else if (v === 'raid') view = Views.panelRaid(s);
    else if (v === 'ai') view = Views.panelAI(s);
    else if (v === 'triggers') view = await Views.panelTriggers(ctx);
    else if (v === 'xp') view = Views.panelXP(s);
    else if (v === 'notes') view = await Views.panelNotes(ctx);
    else if (v === 'admins') view = await Views.panelAdmins(ctx);
    else if (v === 'stats') view = await Views.panelStats(ctx);
    else if (v === 'dashboard') view = await Views.panelDashboard(ctx);
    else if (v === 'logs') view = await Views.panelLogs(ctx);
    else if (v === 'reports') view = await Views.panelReports(ctx);
    else if (v === 'schedule') view = await Views.panelSchedule(ctx);
    else if (v === 'ext') view = await Views.panelExt(ctx);
    else if (v === 'night') view = Views.panelNight(s);
    else if (v === 'rep') view = await Views.panelRep(ctx);
    else if (v === 'warnchain') view = await Views.panelWarnChain(ctx);
    else if (v === 'aliases') view = await Views.panelAliases(ctx);
    else if (v === 'close') {
      await ctx.editText(`<i>پنل بسته شد</i>`);
      return ctx.answer();
    }
    if (view) await ctx.editText(view.text, { reply_markup: view.keyboard });
    return ctx.answer();
  }

  // ── Toggles ──
  if (d.startsWith('t:')) {
    if (!(await ctx.isAdmin())) return ctx.answer('فقط ادمین‌ها', true);
    const p = d.split(':');

    if (p[1] === 'ext') {
      const ext = await ctx.db.getChatExt(ctx.chat.id);
      ext[p[2]] = ext[p[2]] ? 0 : 1;
      await ctx.db.saveChatExt(ctx.chat.id, ext);
      const v = await Views.panelExt(ctx);
      await ctx.editText(v.text, { reply_markup: v.keyboard });
      return ctx.answer('✓ ذخیره شد');
    }

    if (p[1] === 'night') {
      const upd = await ctx.updateSettings(s => {
        s.nightMode[p[2]] = !s.nightMode[p[2]];
        return s;
      });
      const v = Views.panelNight(upd);
      await ctx.editText(v.text, { reply_markup: v.keyboard });
      return ctx.answer('✓ ذخیره شد');
    }

    let upd, back = 'security';
    if (p[1] === 'lock') {
      upd = await ctx.updateSettings(s => { s.locks[p[2]] = !s.locks[p[2]]; return s; });
      back = 'locks';
    } else if (p[1] === 'welcome' || p[1] === 'goodbye') {
      upd = await ctx.updateSettings(s => { s[p[1]][p[2]] = !s[p[1]][p[2]]; return s; });
      back = 'welcome';
    } else if (p[1] === 'captcha') {
      upd = await ctx.updateSettings(s => { s.captcha[p[2]] = !s.captcha[p[2]]; return s; });
      back = 'captcha';
    } else if (p[1] === 'ai') {
      upd = await ctx.updateSettings(s => { s.ai[p[2]] = !s.ai[p[2]]; return s; });
      back = 'ai';
    } else if (p[1] === 'xp') {
      upd = await ctx.updateSettings(s => { s.xp[p[2]] = !s.xp[p[2]]; return s; });
      back = 'xp';
    } else if (p[1] === 'games') {
      upd = await ctx.updateSettings(s => { s.games[p[2]] = !s.games[p[2]]; return s; });
      back = 'xp';
    } else {
      upd = await ctx.updateSettings(s => { s[p[1]] = !s[p[1]]; return s; });
      if (p[1] === 'antiRaid') back = 'raid';
    }

    let v;
    if (back === 'locks') v = Views.panelLocks(upd);
    else if (back === 'welcome') v = Views.panelWelcome(upd);
    else if (back === 'captcha') v = Views.panelCaptcha(upd);
    else if (back === 'ai') v = Views.panelAI(upd);
    else if (back === 'raid') v = Views.panelRaid(upd);
    else if (back === 'xp') v = Views.panelXP(upd);
    else v = Views.panelSecurity(upd);
    await ctx.editText(v.text, { reply_markup: v.keyboard });
    return ctx.answer('✓ ذخیره شد');
  }

  // ── Numeric adjust ──
  if (d.startsWith('n:')) {
    if (!(await ctx.isAdmin())) return ctx.answer('فقط ادمین‌ها', true);
    const p = d.split(':');
    const k = p[1];
    const am = parseInt(p[2], 10);
    if (isNaN(am)) return ctx.answer('مقدار نامعتبر', true);

    const upd = await ctx.updateSettings(s => {
      if (k === 'warnLimit') s.warnLimit = Math.max(1, Math.min(20, (s.warnLimit || 3) + am));
      else if (k === 'floodMax') s.floodMax = Math.max(2, Math.min(20, (s.floodMax || 5) + am));
      else if (k === 'captchaTimeout') s.captcha.timeout = Math.max(30, Math.min(600, (s.captcha.timeout || 120) + am));
      else if (k === 'raidThreshold') s.raid.threshold = Math.max(2, Math.min(50, (s.raid.threshold || 5) + am));
      else if (k === 'raidWindow') s.raid.window = Math.max(5, Math.min(120, (s.raid.window || 10) + am));
      else if (k === 'xpPerMsg') s.xp.perMessage = Math.max(1, Math.min(50, (s.xp.perMessage || 5) + am));
      else if (k === 'xpCooldown') s.xp.cooldown = Math.max(10, Math.min(600, (s.xp.cooldown || 60) + am));
      else if (k === 'nightFrom') s.nightMode.from = Math.max(0, Math.min(23, (s.nightMode.from || 23) + am));
      else if (k === 'nightTo') s.nightMode.to = Math.max(0, Math.min(23, (s.nightMode.to || 7) + am));
      return s;
    });

    let v;
    if (k.startsWith('captcha')) v = Views.panelCaptcha(upd);
    else if (k.startsWith('raid')) v = Views.panelRaid(upd);
    else if (k.startsWith('xp')) v = Views.panelXP(upd);
    else if (k.startsWith('night')) v = Views.panelNight(upd);
    else v = Views.panelSecurity(upd);
    await ctx.editText(v.text, { reply_markup: v.keyboard });
    return ctx.answer();
  }

  // ── Add / input prompts ──
  if (d.startsWith('a:')) {
    if (!(await ctx.isAdmin())) return ctx.answer('فقط ادمین‌ها', true);
    const a = d.slice(2);
    const prompts = {
      addword: { title: 'افزودن کلمه ممنوع', desc: 'کلمه یا کلمات رو بفرست\n<i>مثال: کلمه۱ کلمه۲</i>' },
      addlink: { title: 'افزودن لینک مجاز', desc: 'دامنه رو بفرست\n<i>مثال: telegram.org github.com</i>' },
      setwelcome: { title: 'ویرایش خوش‌آمد', desc: 'متن جدید\n<i>متغیرها: {name} {mention} {group} {count}</i>' },
      setgoodbye: { title: 'ویرایش خداحافظی', desc: 'متن جدید رو بفرست' },
      addtrigger: { title: 'پاسخ خودکار', desc: '<b>کلمه کلیدی</b> رو بفرست', session: 'addtrigger_key' },
      addnote: { title: 'یادداشت جدید', desc: '<b>نام</b> یادداشت (بدون #)', session: 'addnote_name' },
      addchain: { title: 'افزودن پله زنجیره', desc: 'تعداد اخطار رو بفرست\n<i>مثال: 3</i>', session: 'addchain_step' },
    };
    const pr = prompts[a];
    if (!pr) return ctx.answer();
    await ctx.db.setSession(ctx.chat.id, ctx.from.id, pr.session || a, null, 600);
    await ctx.editText(Views.inputPrompt(pr.title, pr.desc));
    return ctx.answer();
  }

  // ── Lists ──
  if (d.startsWith('l:')) {
    if (!(await ctx.isAdmin())) return ctx.answer('فقط ادمین‌ها', true);
    const t = d.slice(2);
    let text = '', back = 'p:filters';
    if (t === 'words') {
      const w = await ctx.db.getBlacklistWords(ctx.chat.id);
      text = `<b>کلمات ممنوع</b>\n<blockquote>تعداد: <code>${w.length}</code></blockquote>\n\n`;
      text += w.length ? w.map(x => `◆ <code>${Utils.escapeHtml(x)}</code>`).join('\n') : '<i>خالی</i>';
    } else if (t === 'links') {
      const l = await ctx.db.getWhitelistLinks(ctx.chat.id);
      text = `<b>لینک‌های مجاز</b>\n<blockquote>تعداد: <code>${l.length}</code></blockquote>\n\n`;
      text += l.length ? l.map(x => `◆ <code>${Utils.escapeHtml(x)}</code>`).join('\n') : '<i>خالی</i>';
    } else if (t === 'triggers') {
      const tg = await ctx.db.getTriggers(ctx.chat.id);
      text = `<b>پاسخ‌های خودکار</b>\n<blockquote>تعداد: <code>${tg.length}</code></blockquote>\n\n`;
      text += tg.length
        ? tg.map(x => `◆ <code>${Utils.escapeHtml(x.keyword)}</code>\n   → ${Utils.escapeHtml(x.response.slice(0, 40))}`).join('\n\n')
        : '<i>خالی</i>';
      back = 'p:triggers';
    }
    await ctx.editText(text, { reply_markup: { inline_keyboard: [[{ text: '← بازگشت', callback_data: back }]] } });
    return ctx.answer();
  }

  // ── Clear ──
  if (d.startsWith('c:')) {
    if (!(await ctx.isAdmin())) return ctx.answer('فقط ادمین‌ها', true);
    const t = d.slice(2);
    let back = 'filters';
    if (t === 'words') { await ctx.db.clearBlacklistWords(ctx.chat.id); back = 'filters'; }
    else if (t === 'links') { await ctx.db.clearWhitelistLinks(ctx.chat.id); back = 'filters'; }
    else if (t === 'triggers') { await ctx.db.clearTriggers(ctx.chat.id); back = 'triggers'; }
    else if (t === 'notes') { await ctx.db.clearNotes(ctx.chat.id); back = 'notes'; }
    else if (t === 'chain') { await ctx.db.clearWarnChain(ctx.chat.id); back = 'warnchain'; }
    await ctx.answer('✓ پاک شد');
    let v;
    if (back === 'filters') v = await Views.panelFilters(ctx);
    else if (back === 'triggers') v = await Views.panelTriggers(ctx);
    else if (back === 'notes') v = await Views.panelNotes(ctx);
    else if (back === 'warnchain') v = await Views.panelWarnChain(ctx);
    if (v) await ctx.editText(v.text, { reply_markup: v.keyboard });
    return;
  }

  // ── Extra ──
  if (d.startsWith('x:')) {
    if (!(await ctx.isAdmin())) return ctx.answer('فقط ادمین‌ها', true);
    const p = d.split(':');
    const a = p[1];

    if (a === 'captype') {
      const upd = await ctx.updateSettings(s => { s.captcha.type = p[2]; return s; });
      const v = Views.panelCaptcha(upd);
      await ctx.editText(v.text, { reply_markup: v.keyboard });
      return ctx.answer('✓ تغییر کرد');
    }
    if (a === 'warnact') {
      const acts = ['mute', 'kick', 'ban'];
      const s = await ctx.getSettings();
      const cur = s.warnAction || 'mute';
      const next = acts[(acts.indexOf(cur) + 1) % acts.length];
      const upd = await ctx.updateSettings(st => { st.warnAction = next; return st; });
      const v = Views.panelSecurity(upd);
      await ctx.editText(v.text, { reply_markup: v.keyboard });
      return ctx.answer(`✓ اکشن: ${next}`);
    }
    if (a === 'previewwelcome') {
      const s = await ctx.getSettings();
      const { sendWelcome } = await import('./members.js');
      await sendWelcome(ctx, ctx.from, s);
      return ctx.answer('پیش‌نمایش ارسال شد');
    }
    if (a === 'resetwelcome') {
      await ctx.updateSettings(s => { s.welcome.text = null; s.welcome.media = null; return s; });
      const u = await ctx.getSettings();
      const v = Views.panelWelcome(u);
      await ctx.editText(v.text, { reply_markup: v.keyboard });
      return ctx.answer('برگشت به پیش‌فرض');
    }
    if (a === 'welcomemedia') {
      await ctx.db.setSession(ctx.chat.id, ctx.from.id, 'welcomemedia', null, 300);
      await ctx.editText(Views.inputPrompt('مدیای خوش‌آمد',
        'یک عکس، ویدیو یا گیف بفرست\n\n<i>برای لغو: /cancel</i>'
      ));
      return ctx.answer();
    }
  }

  // ── Games ──
  if (d.startsWith('g:')) {
    const p = d.split(':');
    const a = p[1];
    if (a === 'profile') { const v = await Views.profile(ctx); await ctx.editText(v.text, { reply_markup: v.keyboard }); return ctx.answer(); }
    if (a === 'leaderboard') { const v = await Views.leaderboard(ctx); await ctx.editText(v.text, { reply_markup: v.keyboard }); return ctx.answer(); }
    if (a === 'ach') { const uid = parseInt(p[2], 10); const v = await Views.achievements(ctx, uid); await ctx.editText(v.text, { reply_markup: v.keyboard }); return ctx.answer(); }
    if (a === 'games') { const v = Views.gamesMenu(); await ctx.editText(v.text, { reply_markup: v.keyboard }); return ctx.answer(); }
    if (a === 'play') {
      await ctx.answer(`شروع!`);
      const { startGame } = await import('./games.js');
      await startGame(ctx, p[2]);
      return;
    }

    if (a === 'rps') {
      const sub = p[2], gid = p[3];
      const g = await ctx.db.getGame(gid);
      if (!g) return ctx.answer('منقضی شده', true);
      const dt = g.data;

      if (sub === 'accept') {
        if (ctx.from.id === dt.p1_id) return ctx.answer('با خودت نمی‌تونی', true);
        if (dt.p2_id) return ctx.answer('کسی قبلاً پذیرفته', true);
        dt.p2_id = ctx.from.id;
        dt.p2_name = ctx.from.first_name;
        await ctx.db.updateGame(gid, dt);
        let text = `<b>✂️ سنگ کاغذ قیچی</b>\n`;
        text += `<blockquote>${Utils.mention({ id: dt.p1_id, first_name: dt.p1_name })}  vs  ${Utils.mention({ id: dt.p2_id, first_name: dt.p2_name })}\nانتخاب کنید</blockquote>`;
        await ctx.editText(text, {
          reply_markup: {
            inline_keyboard: [[
              { text: '🪨 سنگ', callback_data: `g:rps:pick:${gid}:rock` },
              { text: '📄 کاغذ', callback_data: `g:rps:pick:${gid}:paper` },
              { text: '✂️ قیچی', callback_data: `g:rps:pick:${gid}:scissors` },
            ]],
          },
        });
        return ctx.answer('✓ پذیرفتی');
      }

      if (sub === 'pick') {
        const mv = p[4];
        if (ctx.from.id !== dt.p1_id && ctx.from.id !== dt.p2_id) return ctx.answer('برای شما نیست', true);
        if (ctx.from.id === dt.p1_id) {
          if (dt.p1_move) return ctx.answer('قبلاً انتخاب کردی', true);
          dt.p1_move = mv;
        } else {
          if (dt.p2_move) return ctx.answer('قبلاً انتخاب کردی', true);
          dt.p2_move = mv;
        }
        await ctx.db.updateGame(gid, dt);
        await ctx.answer(`✓ ثبت شد`);
        if (dt.p1_move && dt.p2_move) {
          const { Games } = await import('../lib/games.js');
          const r = Games.rpsResult(dt.p1_move, dt.p2_move);
          const me = { rock: '🪨', paper: '📄', scissors: '✂️' };
          let text = `<b>✂️ نتیجه</b>\n\n`;
          text += `<pre>${dt.p1_name}  ${me[dt.p1_move]}\n${dt.p2_name}  ${me[dt.p2_move]}</pre>\n\n`;
          if (r === 'tie') {
            text += `<b>مساوی</b>  ·  هر دو <code>+10 XP</code>`;
            await ctx.db.addXP(ctx.chat.id, dt.p1_id, 10);
            await ctx.db.addXP(ctx.chat.id, dt.p2_id, 10);
            await ctx.db.recordGameResult(ctx.chat.id, dt.p1_id, 'rps', 'tie', 10);
            await ctx.db.recordGameResult(ctx.chat.id, dt.p2_id, 'rps', 'tie', 10);
          } else {
            const wid = r === 'p1' ? dt.p1_id : dt.p2_id;
            const wn = r === 'p1' ? dt.p1_name : dt.p2_name;
            const lid = r === 'p1' ? dt.p2_id : dt.p1_id;
            text += `<b>${wn}</b> برنده شد  ·  <code>+30 XP</code>`;
            await ctx.db.addXP(ctx.chat.id, wid, 30);
            await ctx.db.recordGameResult(ctx.chat.id, wid, 'rps', 'win', 30);
            await ctx.db.recordGameResult(ctx.chat.id, lid, 'rps', 'loss', 0);
          }
          await ctx.editText(text);
          await ctx.db.deleteGame(gid);
        }
        return;
      }
    }

    if (a === 'quiz') {
      const gid = p[2], ai = parseInt(p[3], 10);
      const g = await ctx.db.getGame(gid);
      if (!g) return ctx.answer('منقضی شده', true);
      const dt = g.data;
      if (dt.answered?.includes(ctx.from.id)) return ctx.answer('قبلاً جواب دادی', true);
      dt.answered = [...(dt.answered || []), ctx.from.id];
      await ctx.db.updateGame(gid, dt);

      if (ai === dt.answer) {
        await ctx.db.deleteGame(gid);
        await ctx.db.addXP(ctx.chat.id, ctx.from.id, 30);
        await ctx.db.recordGameResult(ctx.chat.id, ctx.from.id, 'quiz', 'win', 30);
        let text = `<b>🧠 پاسخ درست</b>\n`;
        text += `<blockquote>${Utils.mention(ctx.from)}</blockquote>\n\n`;
        text += `<pre>سوال    ${Utils.escapeHtml(dt.q)}\nپاسخ    ${Utils.escapeHtml(dt.options[dt.answer])}</pre>\n\n`;
        text += `<code>+30 XP</code>`;
        await ctx.editText(text);
        return ctx.answer('✓');
      }
      return ctx.answer('✗ اشتباه', true);
    }
  }
  return ctx.answer();
}

// ═══════════════════════════════════════════════════════════
//  Confirm Callback — Agentic two-step for dangerous actions
// ═══════════════════════════════════════════════════════════
export async function handleConfirmCallback(ctx, d) {
  const parts = d.split(':');
  if (parts[1] === 'cancel') {
    await ctx.editText(`<i>لغو شد</i>`);
    return ctx.answer('لغو شد');
  }
  const action = parts[1];
  const decision = parts[2];
  const param = parts[3] || '';

  if (decision !== 'yes') {
    await ctx.answer('لغو شد');
    return;
  }

  if (!(await ctx.isAdmin())) return ctx.answer('فقط ادمین‌ها', true);

  if (action === 'purge') {
    const parts2 = param.split('|');
    const startId = parseInt(parts2[0], 10);
    const endId = parseInt(parts2[1], 10);
    if (isNaN(startId) || isNaN(endId)) {
      await ctx.editText(Views.error('اطلاعات نامعتبر'));
      return ctx.answer();
    }
    let c = 0;
    for (let id = startId; id <= endId; id++) {
      const r = await ctx.api.deleteMessage(ctx.chat.id, id);
      if (r.ok) c++;
    }
    ctx.ctx.waitUntil(ctx.db.logAction(ctx.chat.id, ctx.from.id, null, 'purge', `${c} پیام`));
    await ctx.editText(`<b>🧹 پاکسازی</b>\n<blockquote><code>${c}</code> پیام حذف شد</blockquote>`);
    return ctx.answer('✓ انجام شد');
  }

  if (action === 'gban') {
    const tid = parseInt(param, 10);
    if (isNaN(tid)) {
      await ctx.editText(Views.error('اطلاعات نامعتبر'));
      return ctx.answer();
    }
    await ctx.db.addGlobalBan(tid, 'بن سراسری از طریق تأیید', ctx.from.id);
    ctx.ctx.waitUntil(ctx.db.logAction(ctx.chat.id, ctx.from.id, tid, 'gban', 'تأیید شده'));
    await ctx.editText(`<b>🌐 بن سراسری</b>\n<blockquote>کاربر <code>${tid}</code> در همه گروه‌ها مسدود شد</blockquote>`);
    return ctx.answer('✓ انجام شد');
  }

  if (action === 'fedban') {
    const parts2 = param.split('|');
    const fedId = parseInt(parts2[0], 10);
    const tid = parseInt(parts2[1], 10);
    if (isNaN(fedId) || isNaN(tid)) {
      await ctx.editText(Views.error('اطلاعات نامعتبر'));
      return ctx.answer();
    }
    await ctx.db.addFedBan(fedId, tid, 'بن فدرال از طریق تأیید', ctx.from.id);
    const chats = await ctx.db.getFederationChats(fedId);
    let count = 0;
    for (const c of chats) {
      const r = await ctx.api.banMember(c.chat_id, tid);
      if (r.ok) count++;
    }
    await ctx.editText(`<b>🌐 بن فدرال</b>\n<blockquote>کاربر در <b>${count}</b> گروه مسدود شد</blockquote>`);
    return ctx.answer('✓ انجام شد');
  }

  await ctx.editText(Views.error('اقدام ناشناخته'));
  return ctx.answer();
}

// ═══════════════════════════════════════════════════════════
//  Approval Callback
// ═══════════════════════════════════════════════════════════
export async function handleApprovalCallback(ctx, d) {
  const p = d.split(':');
  const action = p[1];
  const cid = parseInt(p[2], 10);
  const uid = parseInt(p[3], 10);
  if (!(await ctx.isAdmin())) return ctx.answer('فقط ادمین‌ها', true);

  if (action === 'yes') {
    await ctx.api.restrictMember(cid, uid, UNRESTRICT_ALL);
    await ctx.answer('✓ تأیید شد');
    await ctx.api.sendMessage(cid,
      `<b>خوش آمدید</b>\n<blockquote>کاربر <a href="tg://user?id=${uid}">عضو جدید</a> تأیید شد ✦</blockquote>`
    );
    ctx.ctx.waitUntil(ctx.db.logAction(cid, ctx.from.id, uid, 'approve', null));
  } else {
    await ctx.api.banMember(cid, uid);
    await ctx.api.unbanMember(cid, uid);
    await ctx.answer('✗ رد شد');
    await ctx.api.sendMessage(cid, `<b>عضو رد شد</b>`);
    ctx.ctx.waitUntil(ctx.db.logAction(cid, ctx.from.id, uid, 'reject', null));
  }
  return;
}

// ═══════════════════════════════════════════════════════════
//  Captcha Callback
// ═══════════════════════════════════════════════════════════
export async function handleCaptchaCallback(ctx, d) {
  const p = d.split(':');
  const t = p[1];
  const tid = parseInt(p[2], 10);
  const a = p[3];
  if (String(ctx.from.id) !== String(tid)) return ctx.answer('برای شما نیست', true);
  const pen = await ctx.db.getPendingCaptcha(ctx.chat.id, tid);
  if (!pen) return ctx.answer('منقضی شده', true);

  let ok = false;
  if (t === 'v') ok = true;
  else if (a && pen.answer === a) ok = true;

  if (ok) {
    await ctx.api.restrictMember(ctx.chat.id, tid, UNRESTRICT_ALL);
    await ctx.db.deletePendingCaptcha(ctx.chat.id, tid);
    await ctx.api.deleteMessage(ctx.chat.id, pen.message_id);
    await ctx.answer('✓ تأیید شدی');
    const s = await ctx.getSettings();
    if (s.welcome.enabled) {
      const { sendWelcome } = await import('./members.js');
      await sendWelcome(ctx, ctx.from, s);
    }
  } else {
    await ctx.db.incrementCaptchaAttempt(ctx.chat.id, tid);
    const u = await ctx.db.getPendingCaptcha(ctx.chat.id, tid);
    const s = await ctx.getSettings();
    if (u && u.attempts >= (s.captcha.maxAttempts || 3)) {
      await ctx.api.deleteMessage(ctx.chat.id, pen.message_id);
      await ctx.api.banMember(ctx.chat.id, tid);
      await ctx.api.unbanMember(ctx.chat.id, tid);
      await ctx.db.deletePendingCaptcha(ctx.chat.id, tid);
      await ctx.answer('تلاش‌ها تمام', true);
      await ctx.send(`<b>اخراج</b>\n${Utils.mention(ctx.from)} به دلیل عدم تأیید اخراج شد`);
    } else {
      await ctx.answer(`✗ اشتباه (${u?.attempts || 1}/${s.captcha.maxAttempts || 3})`, true);
    }
  }
}

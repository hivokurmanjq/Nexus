// ═══════════════════════════════════════════════════════════
//  NEXUS — Intent Handler (Part 1/2)
//  از worker.js اصلی منتقل شده — بدون حذف
// ═══════════════════════════════════════════════════════════

import { Utils } from '../lib/utils.js';
import { Views } from '../views/index.js';
import { RESTRICT_ALL, UNRESTRICT_ALL, BOT } from '../config/constants.js';
import { LANG } from '../config/constants.js';
import { Log } from '../lib/log.js';

export async function handleIntent(ctx, intent) {
  // ═══ Universal ═══
  if (intent === 'cancel') {
    await ctx.db.clearSession(ctx.chat.id, ctx.from.id);
    return ctx.reply(Views.info('لغو شد'));
  }
  if (intent === 'start') {
    const v = Views.start(ctx);
    return ctx.send(v.text, { reply_markup: v.keyboard });
  }
  if (intent === 'help') {
    const v = Views.help();
    return ctx.send(v.text, { reply_markup: v.keyboard });
  }

  if (intent === 'ping') {
    const t0 = Date.now();
    const m = await ctx.send(`<i>...</i>`);
    if (m?.ok) {
      const p = Date.now() - t0;
      const q = p < 200 ? 'عالی' : p < 500 ? 'خوب' : 'متوسط';
      let text = `<b>Pong</b>\n\n`;
      text += `<pre>سرعت     ${p}ms\n`;
      text += `وضعیت    ${q}\n`;
      text += `نسخه     ${BOT.version}</pre>`;
      await ctx.api.editMessage(ctx.chat.id, m.result.message_id, text);
    }
    return;
  }

  if (intent === 'id') {
    let text = `<b>شناسه‌ها</b>\n\n`;
    text += `<pre>شما     ${ctx.from.id}\n`;
    text += `چت      ${ctx.chat.id}</pre>`;
    if (ctx.message.reply_to_message?.from) {
      text += `\n\n<b>ریپلای</b>\n<pre>${ctx.message.reply_to_message.from.id}</pre>`;
    }
    return ctx.reply(text);
  }

  if (intent === 'dashboard') {
    const token = await ctx.db.createDashboardToken(ctx.from.id);
    const url = (ctx.env.WORKER_URL || 'https://your-worker.workers.dev') + `/dashboard?token=${token}`;
    return ctx.reply(
      `<b>داشبورد وب</b>\n<blockquote>معتبر برای ۷ روز\nفقط شما دسترسی دارید</blockquote>`,
      { reply_markup: { inline_keyboard: [[{ text: '🌐  باز کردن داشبورد', url }]] } }
    );
  }

  // ═══ Status panel (Agentic) ═══
  if (intent === 'status') {
    if (!ctx.isGroup()) return ctx.reply(Views.info('فقط در گروه'));
    const v = await Views.statusPanel(ctx);
    return ctx.send(v.text, { reply_markup: v.keyboard });
  }

  // ═══ Report ═══
  if (intent === 'report') {
    const target = ctx.message.reply_to_message?.from;
    if (!target) return ctx.reply(Views.info('روی پیام خاطی ریپلای کن'));
    const ext = await ctx.db.getChatExt(ctx.chat.id);
    if (!ext.reports_enabled) return ctx.reply(Views.info('گزارش‌گیری خاموش است'));
    if (target.id === ctx.from.id) return ctx.reply(Views.info('خودت رو نمی‌تونی گزارش کنی'));

    const reason = ctx.text.split(/\s+/).slice(1).join(' ').trim() || 'بدون توضیح';
    await ctx.db.execute(
      `INSERT INTO reports (chat_id,reporter_id,target_id,message_id,reason) VALUES (?,?,?,?,?)`,
      [ctx.chat.id, ctx.from.id, target.id, ctx.message.reply_to_message.message_id, reason]
    );

    const admins = await ctx.api.getChatAdministrators(ctx.chat.id);
    let notifyText = `<b>🚨 گزارش جدید</b>\n`;
    notifyText += `<blockquote>${Utils.mention(ctx.from)} گزارش داد\n${Utils.mention(target)} را</blockquote>\n\n`;
    notifyText += `<pre>دلیل     ${Utils.escapeHtml(reason)}\n`;
    notifyText += `گروه     ${Utils.escapeHtml(ctx.chat.title || '')}</pre>`;
    if (admins.ok) {
      for (const a of admins.result.slice(0, 3)) {
        if (a.user.is_bot || a.user.id === ctx.from.id) continue;
        ctx.ctx.waitUntil(ctx.api.sendMessage(a.user.id, notifyText).catch(() => {}));
      }
    }
    await ctx.reply(`<b>گزارش ثبت شد</b>\n<blockquote>ادمین‌ها مطلع شدند</blockquote>`);
    return;
  }

  // ═══ Price ═══
  if (intent === 'price') {
    const args = ctx.text.split(/\s+/).slice(1);
    const query = args.join(' ').trim() || 'دلار';
    const { code, label } = Utils.parseExchangeQuery(query);
    const cacheKey = `rate:${code}`;
    let cached = await ctx.db.getCachedRate(cacheKey, 900);

    if (!cached) {
      let result = null;
      try {
        const r = await fetch('https://open.er-api.com/v6/latest/USD', {
          signal: AbortSignal.timeout(6000),
        });
        if (r.ok) {
          const j = await r.json();
          if (j?.rates && j.rates[code]) {
            let price = j.rates[code];
            let unit = code;
            if (code === 'IRR') {
              price = Math.round(price / 10);
              unit = 'تومان';
            }
            result = {
              query, code, label,
              price, unit,
              irr: code === 'IRR' ? j.rates[code] : null,
              note: '',
              ts: Date.now(),
            };
          }
        }
      } catch (e) {
        Log.error('rate_fetch', { err: e.message });
      }
      if (!result) {
        result = {
          query, code, label,
          price: 0, unit: '',
          note: 'اتصال به سرور نرخ ناموفق بود. لطفاً بعداً تلاش کن.',
          ts: Date.now(),
        };
      }
      await ctx.db.saveCachedRate(cacheKey, result);
      cached = result;
    }

    if (cached.note) {
      return ctx.reply(
        `<b>💱 نرخ ارز</b>\n<blockquote>${Utils.escapeHtml(cached.label)}</blockquote>\n\n<i>${cached.note}</i>`
      );
    }

    let text = `<b>💱 نرخ ارز</b>\n`;
    text += `<blockquote>۱ <b>${Utils.escapeHtml(cached.label)}</b> چند؟</blockquote>\n\n`;
    text += `<pre>نرخ       ${Utils.formatPrice(cached.price)} ${cached.unit}`;
    if (cached.irr) text += `\nمعادل      ${Utils.formatPrice(cached.irr)} ریال`;
    text += `\nبه‌روزرسانی  ${Utils.formatTimestamp(Math.floor(cached.ts / 1000))}</pre>\n\n`;
    text += `<i>· نرخ‌ها تقریبی و از منابع عمومی است</i>`;
    return ctx.reply(text);
  }

  // ═══ Anime ═══
  if (intent === 'anime') {
    const args = ctx.text.split(/\s+/).slice(1);
    const query = args.join(' ').trim();
    if (!query) return ctx.reply(Views.info('نام انیمه رو بنویس — مثال: <code>انیمه Naruto</code>'));

    const cacheKey = `anime:${query.toLowerCase().slice(0, 40)}`;
    let cached = await ctx.db.getCachedRate(cacheKey, 3600);

    if (!cached) {
      try {
        const r = await fetch(
          `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`,
          { signal: AbortSignal.timeout(6000) }
        );
        if (r.ok) {
          const j = await r.json();
          const a = j?.data?.[0];
          if (a) {
            cached = {
              title: a.title || '',
              title_en: a.title_english || '',
              score: a.score || 0,
              rank: a.rank || 0,
              episodes: a.episodes || 0,
              status: a.status || '',
              year: a.year || '—',
              synopsis: (a.synopsis || '').slice(0, 250),
              url: a.url || 'https://myanimelist.net',
              ts: Date.now(),
            };
          }
        }
      } catch (e) {
        Log.error('anime_fetch', { err: e.message });
      }
      if (!cached) cached = { notFound: true, ts: Date.now() };
      await ctx.db.saveCachedRate(cacheKey, cached);
    }

    if (cached.notFound) return ctx.reply(Views.info('انیمه‌ای با این نام پیدا نشد'));

    let text = `<b>🎬 ${Utils.escapeHtml(cached.title)}</b>\n`;
    if (cached.title_en) text += `<i>${Utils.escapeHtml(cached.title_en)}</i>\n`;
    text += `\n<pre>امتیاز    ${cached.score || '—'}\n`;
    text += `رتبه      #${cached.rank || '—'}\n`;
    text += `قسمت      ${cached.episodes || '—'}\n`;
    text += `وضعیت     ${cached.status || '—'}\n`;
    text += `سال       ${cached.year || '—'}</pre>\n\n`;
    if (cached.synopsis) text += `<blockquote expandable>${Utils.escapeHtml(cached.synopsis)}…</blockquote>`;

    const buttons = [];
    if (cached.url) buttons.push({ text: '🔗 MyAnimeList', url: cached.url });

    return ctx.reply(text, {
      reply_markup: buttons.length ? { inline_keyboard: [buttons] } : undefined,
    });
  }

  if (!ctx.isGroup()) return ctx.reply(Views.info('این دستور فقط در گروه است'));

  // ═══ Group public commands ═══
  if (intent === 'settings') {
    if (!(await ctx.isAdmin())) return ctx.reply(Views.error('فقط ادمین‌ها'));
    const s = await ctx.getSettings();
    const v = Views.panelMain(ctx.chat, s);
    return ctx.send(v.text, { reply_markup: v.keyboard });
  }
  if (intent === 'stats') {
    const v = await Views.panelStats(ctx);
    return ctx.send(v.text, { reply_markup: v.keyboard });
  }
  if (intent === 'admins') {
    const v = await Views.panelAdmins(ctx);
    return ctx.send(v.text, { reply_markup: v.keyboard });
  }

  if (intent === 'rules') {
    const n = await ctx.db.findNote(ctx.chat.id, 'rules');
    if (n) return ctx.reply(n.content);
    return ctx.reply(Views.info('قوانینی ثبت نشده — ادمین از پنل > یادداشت‌ها اضافه کند'));
  }

  if (intent === 'listnotes') {
    const n = await ctx.db.listNotes(ctx.chat.id);
    if (!n.length) return ctx.reply(Views.info('یادداشتی نیست'));
    let text = `<b>یادداشت‌ها</b>\n\n`;
    text += n.map(x => `◆ <code>#${Utils.escapeHtml(x.name)}</code>`).join('\n');
    return ctx.reply(text);
  }

  if (intent === 'profile') {
    const t = ctx.message.reply_to_message?.from || ctx.from;
    if (t.is_bot) return ctx.reply(Views.info('پروفایل ربات نمایش داده نمی‌شود'));
    const v = await Views.profile(ctx, t);
    return ctx.send(v.text, { reply_markup: v.keyboard });
  }

  // ─── ادامه در پیام بعدی ───
}
  if (intent === 'leaderboard') {
    const v = await Views.leaderboard(ctx);
    return ctx.send(v.text, { reply_markup: v.keyboard });
  }
  if (intent === 'achievements') {
    const v = await Views.achievements(ctx, ctx.from.id);
    return ctx.send(v.text, { reply_markup: v.keyboard });
  }

  if (intent === 'games') {
    const s = await ctx.getSettings();
    if (!s.games.enabled) return ctx.reply(Views.info('بازی‌ها خاموش است'));
    const v = Views.gamesMenu();
    return ctx.send(v.text, { reply_markup: v.keyboard });
  }

  if (['guess', 'rps', 'slot', 'quiz', 'dice', 'type'].includes(intent)) {
    const s = await ctx.getSettings();
    if (!s.games.enabled) return ctx.reply(Views.info('بازی‌ها خاموش است'));
    const { startGame } = await import('./games.js');
    return startGame(ctx, intent);
  }

  if (intent === 'ai') {
    const args = ctx.text.split(/\s+/).slice(1).join(' ');
    if (!args) return ctx.reply(Views.info('یک سوال بپرس — مثال: <code>/ai هوا چطوره؟</code>'));
    if (!ctx.env.AI) return ctx.reply(Views.error('AI پیکربندی نشده'));
    const s = await ctx.getSettings();
    const rl = await ctx.db.checkRate(`ai:${ctx.chat.id}:${ctx.from.id}`, s.ai.rateLimit || 10, 60);
    if (!rl.allowed) return ctx.reply(Views.info(`محدودیت نرخ — ${rl.retry} ثانیه دیگر تلاش کن`));
    await ctx.api.sendChatAction(ctx.chat.id, 'typing');
    const r = await ctx.ai.chat(args, ctx.from.first_name);
    if (r?.text) {
      return ctx.reply(`<b>🧠 پاسخ هوشمند</b>\n<blockquote>${Utils.escapeHtml(r.text)}</blockquote>`);
    }
    return ctx.reply(Views.error('در حال حاضر پاسخگو نیستم'));
  }

  // ═══ Reputation ═══
  if (intent === 'plusrep' || intent === 'minusrep') {
    const s = await ctx.getSettings();
    if (!s.reputation?.enabled) return ctx.reply(Views.info('سیستم اعتبار خاموش است'));
    const target = ctx.message.reply_to_message?.from;
    if (!target) return ctx.reply(Views.info('روی پیام کاربر ریپلای کن'));
    if (target.id === ctx.from.id) return ctx.reply(Views.info('خودت رو نمی‌تونی امتیاز بدی'));
    if (target.is_bot) return ctx.reply(Views.info('ربات‌ها اعتبار نمی‌گیرن'));
    const last = await ctx.db.getLastRep(ctx.chat.id, ctx.from.id, target.id);
    const cd = s.reputation.cooldown || 86400;
    if (last && (Math.floor(Date.now() / 1000) - last.created_at) < cd) {
      const rem = cd - (Math.floor(Date.now() / 1000) - last.created_at);
      return ctx.reply(Views.info(`به این کاربر تازه امتیاز دادی — ${Utils.formatDuration(rem)} دیگر`));
    }
    const delta = intent === 'plusrep' ? 1 : -1;
    const score = await ctx.db.changeRep(ctx.chat.id, target.id, delta);
    await ctx.db.logRep(ctx.chat.id, ctx.from.id, target.id, delta);
    if (delta > 0) {
      if (score === 10) await ctx.db.unlockAchievement(ctx.chat.id, target.id, 'rep_10');
      if (score === 50) await ctx.db.unlockAchievement(ctx.chat.id, target.id, 'rep_50');
    }
    const icon = delta > 0 ? '💝' : '💔';
    return ctx.reply(
      `<b>${icon} اعتبار</b>\n<blockquote>${Utils.mention(target)}\nامتیاز جدید: <code>${score}</code></blockquote>`
    );
  }

  if (intent === 'reptop') {
    const v = await Views.panelRep(ctx);
    return ctx.send(v.text, { reply_markup: v.keyboard });
  }

  if (intent === 'invites') {
    const inv = await ctx.db.getInviteCount(ctx.chat.id, ctx.from.id);
    const top = await ctx.db.getInviteTop(ctx.chat.id, 5);
    let text = `<b>دعوت‌ها</b>\n`;
    text += `<blockquote>شما <code>${inv?.count || 0}</code> نفر دعوت کردی</blockquote>\n\n`;
    if (top.length) {
      text += `<b>پنج نفر برتر</b>\n\n`;
      const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
      top.forEach((u, i) => {
        text += `${medals[i]} <b>${Utils.escapeHtml(u.first_name || 'کاربر')}</b>  ·  <code>${u.count}</code>\n`;
      });
    }
    return ctx.reply(text);
  }

  // ═══ Federation ═══
  if (intent === 'fed') {
    const fed = await ctx.db.getChatFederation(ctx.chat.id);
    if (!fed) return ctx.reply(Views.info('این گروه در فدراسیونی نیست'));
    const chats = await ctx.db.getFederationChats(fed.id);
    const bans = await ctx.db.getFedBans(fed.id);
    const v = await Views.fedInfo(ctx, fed, chats, bans);
    return ctx.send(v.text, { reply_markup: v.keyboard });
  }

  if (intent === 'newfed') {
    if (!(await ctx.isAdmin())) return ctx.reply(Views.error('فقط ادمین‌ها'));
    const name = ctx.text.split(/\s+/).slice(2).join(' ').trim();
    if (!name) return ctx.reply(Views.info('نام فدراسیون رو بفرست\nمثال: <code>فدراسیون جدید پارسیان</code>'));
    if (!/^[a-zA-Z0-9_\u0600-\u06FF]{3,20}$/.test(name)) {
      return ctx.reply(Views.error('نام باید ۳ تا ۲۰ کاراکتر باشد'));
    }
    const existing = await ctx.db.getFederation(name);
    if (existing) return ctx.reply(Views.error('این نام قبلاً استفاده شده'));
    const f = await ctx.db.createFederation(name, ctx.from.id);
    if (!f) return ctx.reply(Views.error('خطا در ساخت'));
    await ctx.db.joinFederation(f.id, ctx.chat.id);
    return ctx.send(
      `<b>🌐 فدراسیون ساخته شد</b>\n<blockquote>نام: <b>${Utils.escapeHtml(name)}</b>\nمالک: ${Utils.mention(ctx.from)}</blockquote>`
    );
  }

  if (intent === 'joinfed') {
    if (!(await ctx.isAdmin())) return ctx.reply(Views.error('فقط ادمین‌ها'));
    const name = ctx.text.split(/\s+/).slice(2).join(' ').trim();
    if (!name) return ctx.reply(Views.info('نام فدراسیون رو بفرست'));
    const fed = await ctx.db.getFederation(name);
    if (!fed) return ctx.reply(Views.error('فدراسیون پیدا نشد'));
    await ctx.db.joinFederation(fed.id, ctx.chat.id);
    return ctx.send(`<b>به فدراسیون پیوستید</b>\n<blockquote><b>${Utils.escapeHtml(fed.name)}</b></blockquote>`);
  }

  if (intent === 'leavefed') {
    if (!(await ctx.isAdmin())) return ctx.reply(Views.error('فقط ادمین‌ها'));
    const fed = await ctx.db.getChatFederation(ctx.chat.id);
    if (!fed) return ctx.reply(Views.info('در فدراسیونی نیستی'));
    await ctx.db.leaveFederation(fed.id, ctx.chat.id);
    return ctx.send(`<b>از فدراسیون خارج شدید</b>`);
  }

  if (intent === 'fedban') {
    if (!(await ctx.isAdmin())) return ctx.reply(Views.error('فقط ادمین‌ها'));
    const fed = await ctx.db.getChatFederation(ctx.chat.id);
    if (!fed) return ctx.reply(Views.error('اول باید فدراسیون داشته باشی'));
    const target = ctx.message.reply_to_message?.from;
    const args = ctx.text.split(/\s+/).slice(1);
    let tid = target?.id;
    if (!tid && args[0] && /^\d+$/.test(args[0])) tid = parseInt(args[0], 10);
    if (!tid) return ctx.reply(Views.info('روی پیام کاربر ریپلای کن'));

    const desc = `کاربر <code>${tid}</code> در همه گروه‌های فدراسیون <b>${Utils.escapeHtml(fed.name)}</b> مسدود می‌شود.`;
    const v = Views.confirmAction('fedban', `${fed.id}|${tid}`, desc);
    return ctx.reply(v.text, { reply_markup: v.keyboard });
  }

  if (intent === 'fedunban') {
    if (!(await ctx.isAdmin())) return ctx.reply(Views.error('فقط ادمین‌ها'));
    const fed = await ctx.db.getChatFederation(ctx.chat.id);
    if (!fed) return ctx.reply(Views.error('در فدراسیونی نیستی'));
    const target = ctx.message.reply_to_message?.from;
    const args = ctx.text.split(/\s+/).slice(1);
    let tid = target?.id;
    if (!tid && args[0] && /^\d+$/.test(args[0])) tid = parseInt(args[0], 10);
    if (!tid) return ctx.reply(Views.info('روی پیام کاربر ریپلای کن'));
    await ctx.db.removeFedBan(fed.id, tid);
    const chats = await ctx.db.getFederationChats(fed.id);
    for (const c of chats) await ctx.api.unbanMember(c.chat_id, tid);
    return ctx.send(`<b>رفع بن فدرال</b>\n<blockquote>کاربر <code>${tid}</code> آزاد شد</blockquote>`);
  }

  if (intent === 'fedbans') {
    if (!(await ctx.isAdmin())) return ctx.reply(Views.error('فقط ادمین‌ها'));
    const fed = await ctx.db.getChatFederation(ctx.chat.id);
    if (!fed) return ctx.reply(Views.error('در فدراسیونی نیستی'));
    const bans = await ctx.db.getFedBans(fed.id);
    const v = await Views.fedBanList(ctx, bans);
    return ctx.send(v.text);
  }

  // ═══ Global bans (owner) ═══
  if (intent === 'gban') {
    if (!ctx.isOwner()) return ctx.reply(Views.error('فقط مالک ربات'));
    const target = ctx.message.reply_to_message?.from;
    const args = ctx.text.split(/\s+/).slice(1);
    let tid = target?.id;
    if (!tid && args[0] && /^\d+$/.test(args[0])) tid = parseInt(args[0], 10);
    if (!tid) return ctx.reply(Views.info('روی پیام کاربر ریپلای کن'));

    const desc = `کاربر <code>${tid}</code> در همه گروه‌های ربات مسدود می‌شود.`;
    const v = Views.confirmAction('gban', `${tid}`, desc);
    return ctx.reply(v.text, { reply_markup: v.keyboard });
  }

  if (intent === 'ungban') {
    if (!ctx.isOwner()) return ctx.reply(Views.error('فقط مالک ربات'));
    const target = ctx.message.reply_to_message?.from;
    const args = ctx.text.split(/\s+/).slice(1);
    let tid = target?.id;
    if (!tid && args[0] && /^\d+$/.test(args[0])) tid = parseInt(args[0], 10);
    if (!tid) return ctx.reply(Views.info('روی پیام کاربر ریپلای کن'));
    await ctx.db.removeGlobalBan(tid);
    return ctx.send(`رفع بن سراسری — <code>${tid}</code>`);
  }

  if (intent === 'gbans') {
    if (!ctx.isOwner()) return ctx.reply(Views.error('فقط مالک ربات'));
    const bans = await ctx.db.getGlobalBans();
    const v = await Views.gbanList(ctx, bans);
    return ctx.send(v.text);
  }

  // ═══ Shutup ═══
  if (intent === 'shutup') {
    if (!ctx.isOwner() && !(await ctx.isAdmin())) return ctx.reply(Views.error('فقط ادمین‌ها'));
    const val = ctx.text.split(/\s+/)[1]?.toLowerCase();
    const target = val === 'on' || val === 'روشن' || val === 'true';
    const off = val === 'off' || val === 'خاموش' || val === 'false';
    if (!target && !off) {
      const s = await ctx.getSettings();
      return ctx.reply(
        `<b>سکوت ربات</b>\n<blockquote>وضعیت: <code>${s.shutup ? 'ON' : 'OFF'}</code></blockquote>\n\n<i>استفاده: <code>سکوت ربات on</code> یا <code>off</code></i>`
      );
    }
    await ctx.updateSettings(s => { s.shutup = target; return s; });
    return ctx.send(`<b>سکوت ربات ${target ? 'فعال' : 'غیرفعال'}</b>`);
  }

  // ═══ Silent ═══
  if (intent === 'silent') {
    if (!(await ctx.isAdmin())) return ctx.reply(Views.error('فقط ادمین‌ها'));
    const s = await ctx.getSettings();
    const next = !s.silentActions;
    await ctx.updateSettings(st => { st.silentActions = next; return st; });
    return ctx.send(`<b>حالت بی‌صدا ${next ? 'فعال' : 'غیرفعال'}</b>`);
  }

  // ═══ Language ═══
  if (intent === 'setlang') {
    if (!(await ctx.isAdmin())) return ctx.reply(Views.error('فقط ادمین‌ها'));
    const args = ctx.text.split(/\s+/).slice(1);
    const lang = args[0]?.toLowerCase();
    if (!lang || !LANG[lang]) {
      return ctx.reply(Views.info('زبان‌های موجود: <code>fa</code> · <code>en</code>'));
    }
    await ctx.updateSettings(s => { s.language = lang; return s; });
    await ctx.db.setLangConfig(ctx.chat.id, lang);
    return ctx.send(`زبان گروه به <b>${lang}</b> تغییر کرد`);
  }

  // ═══ Backup ═══
  if (intent === 'backup') {
    if (!(await ctx.isAdmin())) return ctx.reply(Views.error('فقط ادمین‌ها'));
    const data = await ctx.db.getFullBackup(ctx.chat.id);
    const json = JSON.stringify(data, null, 2);
    const size = json.length;
    await ctx.db.logBackup(ctx.chat.id, size);

    if (size > 5 * 1024 * 1024) {
      return ctx.reply(Views.error('حجم پشتیبان بیش از ۵ مگابایت است'));
    }

    try {
      const blob = new Blob([json], { type: 'application/json' });
      const formData = new FormData();
      formData.append('chat_id', ctx.chat.id);
      formData.append('document', blob, `nexus_backup_${ctx.chat.id}_${Date.now()}.json`);
      formData.append('caption',
        `<b>پشتیبان ${BOT.name}</b>\n` +
        `<blockquote>گروه: ${Utils.escapeHtml(ctx.chat.title || '')}\n` +
        `حجم: ${(size / 1024).toFixed(1)} KB</blockquote>\n\n` +
        `<i>برای بازیابی، این فایل رو ریپلای کن و بنویس «بازیابی»</i>`
      );
      formData.append('parse_mode', 'HTML');
      await fetch(`https://api.telegram.org/bot${ctx.env.BOT_TOKEN}/sendDocument`, {
        method: 'POST',
        body: formData,
      });
    } catch (e) {
      Log.error('backup_send', { err: e.message });
      return ctx.reply(Views.error('خطا در ارسال پشتیبان'));
    }
    return;
  }

  // ═══ Restore ═══
  if (intent === 'restore') {
    if (!(await ctx.isAdmin())) return ctx.reply(Views.error('فقط ادمین‌ها'));
    const doc = ctx.message.reply_to_message?.document;
    if (!doc) return ctx.reply(Views.info('روی فایل JSON پشتیبان ریپلای کن و بنویس «بازیابی»'));
    if (doc.mime_type !== 'application/json' && !doc.file_name?.endsWith('.json')) {
      return ctx.reply(Views.error('فایل باید JSON باشد'));
    }
    if (doc.file_size > 5 * 1024 * 1024) {
      return ctx.reply(Views.error('فایل بیش از ۵ مگابایت است'));
    }
    try {
      const fileInfo = await ctx.api.call('getFile', { file_id: doc.file_id });
      if (!fileInfo.ok) return ctx.reply(Views.error('خطا در دریافت فایل'));
      const fileUrl = `https://api.telegram.org/file/bot${ctx.env.BOT_TOKEN}/${fileInfo.result.file_path}`;
      const r = await fetch(fileUrl);
      const data = await r.json();
      if (data.chat_id && String(data.chat_id) !== String(ctx.chat.id)) {
        return ctx.reply(Views.error('این پشتیبان مربوط به این گروه نیست'));
      }
      await ctx.db.restoreBackup(ctx.chat.id, data);
      await ctx.cache.del(`settings:${ctx.chat.id}`);
      return ctx.reply(
        `<b>بازیابی انجام شد</b>\n<blockquote>تنظیمات، یادداشت‌ها، فیلترها و نام‌گذاری‌ها بازگردانی شدند</blockquote>`
      );
    } catch (e) {
      Log.error('restore', { err: e.message });
      return ctx.reply(Views.error('خطا در بازیابی'));
    }
  }

  // ═══ Sync ═══
  if (intent === 'sync') {
    if (!(await ctx.isAdmin())) return ctx.reply(Views.error('فقط ادمین‌ها'));
    const r = await ctx.api.getChatAdministrators(ctx.chat.id);
    if (!r.ok) return ctx.reply(Views.error('خطا در دریافت اطلاعات'));
    for (const a of r.result) {
      if (a.user.is_bot) continue;
      ctx.ctx.waitUntil(ctx.db.upsertUser(a.user));
    }
    return ctx.send(
      `<b>همگام‌سازی انجام شد</b>\n<blockquote>${r.result.length} ادمین ذخیره شد</blockquote>`
    );
  }

  // ═══ Search ═══
  if (intent === 'search') {
    if (!(await ctx.isAdmin())) return ctx.reply(Views.error('فقط ادمین‌ها'));
    const s = await ctx.getSettings();
    if (!s.recordMode?.enabled) {
      return ctx.reply(Views.info('حالت رکورد خاموش است — از پنل روشن کن'));
    }
    const args = ctx.text.split(/\s+/).slice(1);
    const query = args.join(' ').trim();
    if (!query) return ctx.reply(Views.info('کلمه‌ای برای جستجو بنویس'));
    const results = await ctx.db.searchMessages(ctx.chat.id, query, 10);
    if (!results.length) return ctx.reply(Views.info('نتیجه‌ای پیدا نشد'));
    let text = `<b>🔍 نتایج جستجو</b>\n`;
    text += `<blockquote>کلمه: <code>${Utils.escapeHtml(query)}</code> — ${results.length} نتیجه</blockquote>\n\n`;
    for (const r of results.slice(0, 8)) {
      text += `◆ <b>${Utils.escapeHtml(r.first_name || 'کاربر')}</b>  ·  ${Utils.formatTimestamp(r.created_at)}\n`;
      text += `   <i>${Utils.escapeHtml((r.text || '').slice(0, 60))}…</i>\n\n`;
    }
    return ctx.reply(text);
  }

  // ═══ Screen ═══
  if (intent === 'screen') {
    if (!(await ctx.isAdmin())) return ctx.reply(Views.error('فقط ادمین‌ها'));
    const target = ctx.message.reply_to_message?.from;
    if (!target) return ctx.reply(Views.info('روی پیام کاربر ریپلای کن'));
    const u = await ctx.db.getUserFlags(target.id);
    let text = `<b>🔎 بررسی عمیق</b>\n<blockquote>${Utils.mention(target)}</blockquote>\n\n`;
    text += `<pre>آیدی       ${target.id}\n`;
    text += `ربات       ${target.is_bot ? 'بله' : 'خیر'}\n`;
    text += `یوزرنیم    ${target.username ? '@' + target.username : '—'}\n`;
    text += `اولین بازدید ${u?.first_seen ? Utils.formatTimestamp(u.first_seen) : '—'}\n`;
    text += `آخرین بازدید ${u?.last_seen ? Utils.formatTimestamp(u.last_seen) : '—'}\n`;
    text += `زبان       ${u?.language || '—'}</pre>`;
    const member = await ctx.api.getChatMember(ctx.chat.id, target.id);
    if (member.ok) {
      text += `\n\n<b>وضعیت در گروه</b>\n<pre>نقش       ${member.result.status}</pre>`;
    }
    return ctx.reply(text);
  }

  // ═══ Language block ═══
  if (intent === 'langblock') {
    if (!(await ctx.isAdmin())) return ctx.reply(Views.error('فقط ادمین‌ها'));
    const args = ctx.text.split(/\s+/).slice(1);
    const langs = args.join(' ').split(/[\s,،]+/).filter(Boolean).map(l => l.toLowerCase().slice(0, 2));
    if (!langs.length) {
      const s = await ctx.getSettings();
      return ctx.reply(
        `<b>فیلتر زبان</b>\n` +
        `<blockquote>وضعیت: <code>${s.antiLanguage ? 'ON' : 'OFF'}</code>\n` +
        `مجاز: <code>${s.allowedLanguages.join(', ')}</code></blockquote>\n\n` +
        `<i>برای تغییر: <code>فیلتر زبان fa en</code></i>`
      );
    }
    await ctx.updateSettings(s => { s.antiLanguage = true; s.allowedLanguages = langs; return s; });
    return ctx.send(`<b>فیلتر زبان فعال</b>\n<blockquote>مجاز: <code>${langs.join(', ')}</code></blockquote>`);
  }

  // ═══ Aliases ═══
  if (intent === 'aliases') {
    const v = await Views.panelAliases(ctx);
    return ctx.send(v.text, { reply_markup: v.keyboard });
  }

  if (intent === 'alias') {
    if (!(await ctx.isAdmin())) return ctx.reply(Views.error('فقط ادمین‌ها'));
    const args = ctx.text.split(/\s+/).slice(1);
    const name = args[0]?.toLowerCase();
    if (!name || name.length < 3 || name.length > 20) {
      return ctx.reply(Views.info('روی پیام کاربر ریپلای کن و بنویس <code>نام‌گذاری [نام]</code>\n<i>نام باید ۳ تا ۲۰ کاراکتر باشد</i>'));
    }
    const target = ctx.message.reply_to_message?.from;
    if (!target) return ctx.reply(Views.info('روی پیام کاربر ریپلای کن'));
    await ctx.db.addAlias(ctx.chat.id, name, target.id);
    return ctx.send(
      `<b>گروه نام‌گذاری</b>\n<blockquote>${Utils.mention(target)}\nاضافه شد به <b>@${Utils.escapeHtml(name)}</b></blockquote>`
    );
  }

  if (intent === 'unalias') {
    if (!(await ctx.isAdmin())) return ctx.reply(Views.error('فقط ادمین‌ها'));
    const args = ctx.text.split(/\s+/).slice(1);
    const name = args[0]?.toLowerCase();
    if (!name) return ctx.reply(Views.info('اسم گروه رو بنویس'));
    const target = ctx.message.reply_to_message?.from;
    if (target) {
      await ctx.db.removeAlias(ctx.chat.id, name, target.id);
      return ctx.send(
        `<b>حذف از گروه</b>\n<blockquote>${Utils.mention(target)}\nاز <b>@${Utils.escapeHtml(name)}</b> حذف شد</blockquote>`
      );
    }
    await ctx.db.clearAlias(ctx.chat.id, name);
    return ctx.send(`<b>گروه حذف شد</b>\n<blockquote>@${Utils.escapeHtml(name)}</blockquote>`);
  }

  // ═══ Warn chain ═══
  if (intent === 'warnchain') {
    if (!(await ctx.isAdmin())) return ctx.reply(Views.error('فقط ادمین‌ها'));
    const v = await Views.panelWarnChain(ctx);
    return ctx.send(v.text, { reply_markup: v.keyboard });
  }

  // ═══ Permissions ═══
  if (intent === 'perms') {
    if (!(await ctx.isAdmin())) return ctx.reply(Views.error('فقط ادمین‌ها'));
    const target = ctx.message.reply_to_message?.from;
    if (!target) return ctx.reply(Views.info('روی پیام ادمین ریپلای کن'));
    const perms = await ctx.db.getAdminPerms(ctx.chat.id, target.id);
    let text = `<b>🔑 دسترسی‌ها</b>\n<blockquote>${Utils.mention(target)}</blockquote>\n\n`;
    if (!Object.keys(perms).length) {
      text += `<i>محدودیتی نداره — همه دسترسی‌ها باز</i>`;
    } else {
      text += `<pre>`;
      for (const [k, v] of Object.entries(perms)) {
        text += `\n${k}  →  ${v ? '✓' : '✗'}`;
      }
      text += `</pre>`;
    }
    return ctx.reply(text);
  }

  // ═══ Schedule ═══
  if (intent === 'schedule') {
    if (!(await ctx.isAdmin())) return ctx.reply(Views.error('فقط ادمین‌ها'));
    await ctx.db.setSession(ctx.chat.id, ctx.from.id, 'schedule_wait', null, 600);
    return ctx.reply(Views.inputPrompt(
      'زمان‌بندی پیام',
      'متن پیام رو بفرست\n\nدر پیام بعدی زمان رو مشخص می‌کنی\n<i>برای لغو: /cancel</i>'
    ));
  }

  if (intent === 'scheddaily') {
    if (!(await ctx.isAdmin())) return ctx.reply(Views.error('فقط ادمین‌ها'));
    await ctx.db.setSession(ctx.chat.id, ctx.from.id, 'scheddaily_wait', null, 600);
    return ctx.reply(Views.inputPrompt(
      'زمان‌بندی دوره‌ای',
      'متن پیام رو بفرست\n\nدر پیام بعدی بازه تکرار رو مشخص می‌کنی\n<i>مثال: 6h، 1d، 1w</i>'
    ));
  }

  if (intent === 'schedules') {
    if (!(await ctx.isAdmin())) return ctx.reply(Views.error('فقط ادمین‌ها'));
    const v = await Views.panelSchedule(ctx);
    return ctx.send(v.text, { reply_markup: v.keyboard });
  }

  if (intent === 'unschedule') {
    if (!(await ctx.isAdmin())) return ctx.reply(Views.error('فقط ادمین‌ها'));
    const args = ctx.text.split(/\s+/).slice(1);
    const id = parseInt(args[0], 10);
    if (isNaN(id)) return ctx.reply(Views.error('شماره پیام رو بنویس'));
    await ctx.db.deleteScheduled(id, ctx.chat.id);
    return ctx.reply(Views.success(`پیام #${id} حذف شد`));
  }

  // ═══ Ghost ═══
  if (intent === 'ghost') {
    if (!ctx.isOwner() && !(await ctx.isAdmin())) return ctx.reply(Views.error('فقط ادمین‌ها'));
    const keys = [
      `settings:${ctx.chat.id}`,
      `admin:${ctx.chat.id}:${ctx.from.id}`,
      `trg:${ctx.chat.id}`,
      `bw:${ctx.chat.id}`,
      `wl:${ctx.chat.id}`,
      `al:${ctx.chat.id}`,
      `member_count:${ctx.chat.id}`,
    ];
    for (const k of keys) await ctx.cache.del(k);
    return ctx.send(`<b>کش پاک شد</b>\n<blockquote>${keys.length} کلید حذف شد</blockquote>`);
  }

  // ═══ Admin-only from here ═══
  if (!(await ctx.isAdmin())) return;

  const args = ctx.text.split(/\s+/).slice(1);
  const tu = ctx.message.reply_to_message?.from || null;
  let tid = tu?.id || null;
  if (!tid && args[0] && /^\d+$/.test(args[0])) tid = parseInt(args[0], 10);

  // ═══ Pin/Unpin ═══
  if (intent === 'pin') {
    if (!ctx.message.reply_to_message) return ctx.reply(Views.info('روی پیام مورد نظر ریپلای کن'));
    const r = await ctx.api.pinChatMessage(ctx.chat.id, ctx.message.reply_to_message.message_id);
    if (r.ok) return ctx.send(`<b>📌 پیام پین شد</b>`);
    return ctx.reply(Views.error(r.description || 'خطا در پین'));
  }

  if (intent === 'unpin') {
    const r = await ctx.api.unpinChatMessage(ctx.chat.id);
    if (r.ok) return ctx.send(`<b>📌 پیام آنپین شد</b>`);
    return ctx.reply(Views.error(r.description || 'خطا در آنپین'));
  }

  // ═══ Set title ═══
  if (intent === 'settitle') {
    const target = ctx.message.reply_to_message?.from;
    if (!target) return ctx.reply(Views.info('روی پیام کاربر ریپلای کن و بنویس: <code>لقب متن دلخواه</code>'));
    const newTitle = args.join(' ').trim();
    if (!newTitle) return ctx.reply(Views.info('متن لقب رو بعد از کلمه «لقب» بنویس'));
    if (newTitle.length > 16) return ctx.reply(Views.error('لقب حداکثر ۱۶ کاراکتر'));
    const r = await ctx.api.setChatAdministratorCustomTitle(ctx.chat.id, target.id, newTitle);
    if (r.ok) {
      ctx.ctx.waitUntil(ctx.db.logAction(ctx.chat.id, ctx.from.id, target.id, 'settitle', newTitle));
      return ctx.send(
        `<b>👑 لقب تنظیم شد</b>\n<blockquote>${Utils.mention(target)}\nعنوان: <b>${Utils.escapeHtml(newTitle)}</b></blockquote>`
      );
    }
    const desc = r.description || '';
    if (desc.includes('not an administrator')) return ctx.reply(Views.error('کاربر ادمین نیست — اول با «ارتقا» ادمینش کن'));
    if (desc.includes('not enough rights')) return ctx.reply(Views.error('ربات دسترسی کافی نداره\nاز تنظیمات گروه دسترسی «افزودن ادمین» رو بده'));
    return ctx.reply(Views.error(desc || 'خطا'));
  }

  // ═══ Promote ═══
  if (intent === 'promote') {
    const target = ctx.message.reply_to_message?.from;
    if (!target) return ctx.reply(Views.info('روی پیام کاربر ریپلای کن و بنویس: <code>ارتقا</code>'));
    if (target.is_bot) return ctx.reply(Views.error('ربات رو نمی‌شه ادمین کرد'));
    if (target.id === ctx.from.id) return ctx.reply(Views.error('خودت رو نمی‌تونی ارتقا بدی'));
    const r = await ctx.api.promoteMember(ctx.chat.id, target.id);
    if (r.ok) {
      ctx.ctx.waitUntil(ctx.db.logAction(ctx.chat.id, ctx.from.id, target.id, 'promote', null));
      return ctx.send(`<b>⬆️ ارتقا</b>\n<blockquote>${Utils.mention(target)} حالا مدیر گروهه</blockquote>`);
    }
    const desc = r.description || '';
    if (desc.includes('not enough rights')) return ctx.reply(Views.error('ربات دسترسی «افزودن ادمین» نداره'));
    return ctx.reply(Views.error(desc || 'خطا در ارتقا'));
  }

  // ═══ Demote ═══
  if (intent === 'demote') {
    const target = ctx.message.reply_to_message?.from;
    if (!target) return ctx.reply(Views.info('روی پیام ادمین ریپلای کن و بنویس: <code>تنزل</code>'));
    if (target.id === ctx.from.id) return ctx.reply(Views.error('خودت رو نمی‌تونی تنزل بدی'));
    const r = await ctx.api.demoteMember(ctx.chat.id, target.id);
    if (r.ok) {
      ctx.ctx.waitUntil(ctx.db.logAction(ctx.chat.id, ctx.from.id, target.id, 'demote', null));
      return ctx.send(`<b>⬇️ تنزل</b>\n<blockquote>${Utils.mention(target)} دیگه مدیر نیست</blockquote>`);
    }
    return ctx.reply(Views.error(r.description || 'خطا در تنزل'));
  }

  // ═══ Poll ═══
  if (intent === 'poll') {
    const raw = args.join(' ');
    const parts = raw.split('|').map(x => x.trim()).filter(Boolean);
    if (parts.length < 3) {
      return ctx.reply(Views.info(
        '<b>نحوه ساخت نظرسنجی</b>\n\n' +
        '<code>نظرسنجی سوال شما؟ گزینه۱ | گزینه۲ | گزینه۳</code>\n\n' +
        '<i>حداقل ۲ گزینه (با | جدا کن)</i>'
      ));
    }
    const question = parts[0];
    const options = parts.slice(1);
    if (options.length > 10) return ctx.reply(Views.error('حداکثر ۱۰ گزینه'));
    const r = await ctx.api.sendPoll(ctx.chat.id, question, options);
    if (r.ok) {
      ctx.ctx.waitUntil(ctx.db.logAction(ctx.chat.id, ctx.from.id, null, 'poll', question));
      return;
    }
    return ctx.reply(Views.error(r.description || 'خطا در ساخت نظرسنجی'));
  }

  // ═══ Target check ═══
  if (['ban', 'unban', 'mute', 'unmute', 'kick', 'warn', 'unwarn'].includes(intent) && !tid) {
    return ctx.reply(
      `<b>راهنما</b>\n<blockquote>ریپلای کن یا آیدی بده\nمثال: <code>بن 1d اسپم</code></blockquote>`
    );
  }

  if (['ban', 'mute', 'kick', 'warn'].includes(intent) && tid && await ctx.isAdmin(tid)) {
    return ctx.reply(Views.error('روی ادمین نمی‌توان اقدام کرد'));
  }

  const dur = Utils.parseDuration(args[0]) || Utils.parseDuration(args[1]) || 0;
  const reason = args.filter(a => !a.match(/^\d+(s|m|h|d|w)?$/i) && a !== String(tid)).join(' ') || 'بدون دلیل';
  const s = await ctx.getSettings();
  const silentMode = s.silentActions;

  if (intent === 'ban' || intent === 'dban' || intent === 'sban') {
    const until = dur > 0 ? Math.floor(Date.now() / 1000) + dur : 0;
    if (intent === 'dban' && ctx.message.reply_to_message) {
      await ctx.api.deleteMessage(ctx.chat.id, ctx.message.reply_to_message.message_id);
      await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);
    }
    const r = await ctx.api.banMember(ctx.chat.id, tid, until);
    if (r.ok) {
      ctx.ctx.waitUntil(ctx.db.incrementStat(ctx.chat.id, 'bans'));
      ctx.ctx.waitUntil(ctx.db.logAction(
        ctx.chat.id, ctx.from.id, tid, 'ban',
        `${dur ? Utils.formatDuration(dur) : 'دائمی'} · ${reason}`
      ));
      if (intent === 'sban' || silentMode) return;
      return ctx.send(Views.actionBan(tu || { id: tid }, ctx.from, dur, reason));
    }
    return ctx.reply(Views.error(r.description || 'خطا'));
  }

  if (intent === 'unban') {
    const r = await ctx.api.unbanMember(ctx.chat.id, tid);
    if (r.ok) {
      ctx.ctx.waitUntil(ctx.db.logAction(ctx.chat.id, ctx.from.id, tid, 'unban', null));
      return ctx.send(Views.success(`<code>${tid}</code> آزاد شد`));
    }
    return ctx.reply(Views.error(r.description || 'خطا'));
  }

  if (intent === 'mute' || intent === 'dmute' || intent === 'smute') {
    const until = dur > 0 ? Math.floor(Date.now() / 1000) + dur : 0;
    if (intent === 'dmute' && ctx.message.reply_to_message) {
      await ctx.api.deleteMessage(ctx.chat.id, ctx.message.reply_to_message.message_id);
      await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);
    }
    const r = await ctx.api.restrictMember(ctx.chat.id, tid, RESTRICT_ALL, until);
    if (r.ok) {
      ctx.ctx.waitUntil(ctx.db.incrementStat(ctx.chat.id, 'mutes'));
      ctx.ctx.waitUntil(ctx.db.logAction(
        ctx.chat.id, ctx.from.id, tid, 'mute',
        `${dur ? Utils.formatDuration(dur) : 'دائمی'} · ${reason}`
      ));
      if (intent === 'smute' || silentMode) return;
      return ctx.send(Views.actionMute(tu || { id: tid }, ctx.from, dur, reason));
    }
    return ctx.reply(Views.error(r.description || 'خطا'));
  }

  if (intent === 'unmute') {
    const r = await ctx.api.restrictMember(ctx.chat.id, tid, UNRESTRICT_ALL);
    if (r.ok) {
      ctx.ctx.waitUntil(ctx.db.logAction(ctx.chat.id, ctx.from.id, tid, 'unmute', null));
      return ctx.send(Views.success('آزاد شد'));
    }
    return ctx.reply(Views.error(r.description || 'خطا'));
  }

  if (intent === 'kick' || intent === 'dkick' || intent === 'skill') {
    if (intent === 'dkick' && ctx.message.reply_to_message) {
      await ctx.api.deleteMessage(ctx.chat.id, ctx.message.reply_to_message.message_id);
      await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);
    }
    const r = await ctx.api.banMember(ctx.chat.id, tid);
    if (r.ok) {
      await ctx.api.unbanMember(ctx.chat.id, tid);
      ctx.ctx.waitUntil(ctx.db.incrementStat(ctx.chat.id, 'kicks'));
      ctx.ctx.waitUntil(ctx.db.logAction(ctx.chat.id, ctx.from.id, tid, 'kick', null));
      if (intent === 'skill' || silentMode) return;
      return ctx.send(Views.actionKick(tu || { id: tid }, ctx.from));
    }
    return ctx.reply(Views.error(r.description || 'خطا'));
  }

  if (intent === 'warn' || intent === 'dwarn' || intent === 'swarn') {
    if (intent === 'dwarn' && ctx.message.reply_to_message) {
      await ctx.api.deleteMessage(ctx.chat.id, ctx.message.reply_to_message.message_id);
      await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);
    }
    const c = await ctx.db.addWarn(ctx.chat.id, tid, ctx.from.id, reason);
    ctx.ctx.waitUntil(ctx.db.incrementStat(ctx.chat.id, 'warns'));
    ctx.ctx.waitUntil(ctx.db.logAction(ctx.chat.id, ctx.from.id, tid, 'warn', reason));

    const chain = await ctx.db.getWarnChain(ctx.chat.id);
    let matched = null;
    if (chain.length) matched = chain.find(step => step.step === c);

    if (matched) {
      const until = matched.duration > 0 ? Math.floor(Date.now() / 1000) + matched.duration : 0;
      if (matched.action === 'ban') await ctx.api.banMember(ctx.chat.id, tid, until);
      else if (matched.action === 'kick') {
        await ctx.api.banMember(ctx.chat.id, tid);
        await ctx.api.unbanMember(ctx.chat.id, tid);
      } else {
        await ctx.api.restrictMember(ctx.chat.id, tid, RESTRICT_ALL, until);
      }
      ctx.ctx.waitUntil(ctx.db.logAction(
        ctx.chat.id, ctx.from.id, tid, `chain_${matched.action}`,
        `${c} اخطار`
      ));
      return ctx.send(
        `<b>⛓ زنجیره اخطار</b>\n<blockquote>${tu ? Utils.mention(tu) : `<code>${tid}</code>`}\nپله <b>${c}</b> → ${matched.action}</blockquote>`
      );
    }

    if (c >= s.warnLimit) {
      const action = s.warnAction || 'mute';
      const duration = s.warnDuration || 3600;
      const until = Math.floor(Date.now() / 1000) + duration;
      if (action === 'ban') await ctx.api.banMember(ctx.chat.id, tid, until);
      else if (action === 'kick') {
        await ctx.api.banMember(ctx.chat.id, tid);
        await ctx.api.unbanMember(ctx.chat.id, tid);
      } else {
        await ctx.api.restrictMember(ctx.chat.id, tid, RESTRICT_ALL, until);
      }
      await ctx.db.resetWarns(ctx.chat.id, tid);
      const labels = { ban: 'بن', mute: 'سکوت', kick: 'اخراج' };
      ctx.ctx.waitUntil(ctx.db.incrementStat(ctx.chat.id, 'bans'));
      ctx.ctx.waitUntil(ctx.db.logAction(ctx.chat.id, ctx.from.id, tid, 'ban_auto', `${c} اخطار`));
      return ctx.send(
        `<b>سقف اخطار</b>\n<blockquote>${tu ? Utils.mention(tu) : `<code>${tid}</code>`}\nبه دلیل <b>${c}</b> اخطار ${labels[action]} شد</blockquote>`
      );
    }

    if (intent === 'swarn' || silentMode) return;
    return ctx.send(Views.actionWarn(tu || { id: tid }, ctx.from, c, s.warnLimit, reason));
  }

  if (intent === 'unwarn') {
    await ctx.db.resetWarns(ctx.chat.id, tid);
    return ctx.send(Views.success('اخطارها پاک شد'));
  }

  if (intent === 'warns') {
    if (!tid) tid = ctx.from.id;
    const c = await ctx.db.getWarns(ctx.chat.id, tid);
    return ctx.reply(
      `<b>وضعیت اخطار</b>\n\n<pre>کاربر     ${tid}\nاخطار     ${c} از ${s.warnLimit}</pre>`
    );
  }

  if (intent === 'del') {
    if (!ctx.message.reply_to_message) return ctx.reply(Views.info('ریپلای کن'));
    await ctx.api.deleteMessage(ctx.chat.id, ctx.message.reply_to_message.message_id);
    await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);
    ctx.ctx.waitUntil(ctx.db.incrementStat(ctx.chat.id, 'deletions'));
    ctx.ctx.waitUntil(ctx.db.logAction(ctx.chat.id, ctx.from.id, null, 'del', null));
    return;
  }

  // ═══ Purge — Agentic two-step ═══
  if (intent === 'purge') {
    if (!ctx.message.reply_to_message) return ctx.reply(Views.info('روی پیام شروع ریپلای کن'));
    const sMid = ctx.message.reply_to_message.message_id;
    const eMid = ctx.message.message_id;
    if (eMid - sMid > 100) return ctx.reply(Views.error('حداکثر ۱۰۰ پیام پاک می‌شود'));
    const cnt = eMid - sMid + 1;
    const desc = `حذف <b>${cnt}</b> پیام از پیام شماره <code>${sMid}</code> تا <code>${eMid}</code>.`;
    const v = Views.confirmAction('purge', `${sMid}|${eMid}`, desc);
    return ctx.reply(v.text, { reply_markup: v.keyboard });
  }

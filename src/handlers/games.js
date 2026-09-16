// ═══════════════════════════════════════════════════════════
//  NEXUS — Games + XP Handler
//  از worker.js اصلی منتقل شده — بدون حذف
// ═══════════════════════════════════════════════════════════

import { Utils } from '../lib/utils.js';
import { Games } from '../lib/games.js';
import { Views } from '../views/index.js';
import { ACHIEVEMENTS } from '../config/constants.js';

// ── Process XP ──
export async function processXP(ctx) {
  const s = await ctx.getSettings();
  if (!s.xp.enabled || !ctx.isGroup() || !ctx.from || ctx.from.is_bot) return;
  if (s.shutup) return;
  const k = `xp_cd:${ctx.chat.id}:${ctx.from.id}`;
  if (await ctx.cache.get(k)) return;
  const r = await ctx.db.addXP(ctx.chat.id, ctx.from.id, s.xp.perMessage);
  await ctx.cache.set(k, true, s.xp.cooldown);

  const st = await ctx.db.getUserStats(ctx.chat.id, ctx.from.id);
  const newA = [];
  const checks = [
    [st.messages === 1, 'first_message'],
    [st.messages >= 100, 'msg_100'],
    [st.messages >= 1000, 'msg_1000'],
    [st.messages >= 10000, 'msg_10000'],
    [st.level >= 5, 'level_5'],
    [st.level >= 10, 'level_10'],
    [st.level >= 25, 'level_25'],
    [st.level >= 50, 'level_50'],
    [st.level >= 100, 'level_100'],
    [st.streak_days >= 7, 'streak_7'],
    [st.streak_days >= 30, 'streak_30'],
  ];
  for (const [c, a] of checks) {
    if (c && await ctx.db.unlockAchievement(ctx.chat.id, ctx.from.id, a)) newA.push(a);
  }
  if (r.leveledUp && s.xp.levelUpNotify) {
    ctx.ctx.waitUntil(ctx.send(Views.levelUp(ctx.from, r.oldLevel, r.newLevel)));
  }
  for (const a of newA) {
    ctx.ctx.waitUntil(ctx.send(Views.achievementUnlocked(ctx.from, a)));
  }
}

// ── Start game ──
export async function startGame(ctx, gt) {
  const gid = Games.generateId();

  if (gt === 'guess') {
    const d = Games.createGuess(1, 100);
    let text = `<b>🎯 حدس عدد</b>\n`;
    text += `<blockquote>عدد بین <b>1</b> تا <b>100</b>\nجایزه: <code>+50 XP</code></blockquote>\n\n`;
    text += `<i>عدد رو ریپلای این پیام بفرست</i>`;
    const msg = await ctx.send(text);
    if (msg?.ok) {
      await ctx.db.createGame(gid, ctx.chat.id, 'guess', ctx.from.id, {
        ...d, message_id: msg.result.message_id,
      });
    }
    return;
  }

  if (gt === 'rps') {
    let text = `<b>✂️ سنگ کاغذ قیچی</b>\n`;
    text += `<blockquote>${Utils.mention(ctx.from)} چالش می‌کند\nیک نفر بپذیرد</blockquote>`;
    const msg = await ctx.send(text, {
      reply_markup: {
        inline_keyboard: [[{ text: '⚔️  پذیرش', callback_data: `g:rps:accept:${gid}` }]],
      },
    });
    if (msg?.ok) {
      await ctx.db.createGame(gid, ctx.chat.id, 'rps', ctx.from.id, {
        p1_id: ctx.from.id,
        p1_name: ctx.from.first_name,
        p2_id: null, p2_name: null,
        p1_move: null, p2_move: null,
        message_id: msg.result.message_id,
      });
    }
    return;
  }

  if (gt === 'slot') {
    const sp = Games.spinSlot();
    const xp = sp.multiplier * 10;
    let text = `<b>🎰 اسلات</b>\n<blockquote>${Utils.mention(ctx.from)}</blockquote>\n\n`;
    text += `<pre>┌───────────┐\n│  ${sp.result.join('  ')}  │\n└───────────┘</pre>\n\n`;
    if (sp.multiplier > 0) {
      text += `<b>برنده</b> ${'✦'}  ضریب <code>x${sp.multiplier}</code>  ·  <code>+${xp} XP</code>`;
      await ctx.db.addXP(ctx.chat.id, ctx.from.id, xp);
      await ctx.db.recordGameResult(ctx.chat.id, ctx.from.id, 'slot', 'win', xp);
      if (await ctx.db.unlockAchievement(ctx.chat.id, ctx.from.id, 'first_win')) {
        ctx.ctx.waitUntil(ctx.send(Views.achievementUnlocked(ctx.from, 'first_win')));
      }
    } else {
      text += `<i>باختی — دوباره تلاش کن</i>`;
      await ctx.db.recordGameResult(ctx.chat.id, ctx.from.id, 'slot', 'loss', 0);
    }
    await ctx.send(text);
    return;
  }

  if (gt === 'dice') {
    const r = Math.floor(Math.random() * 6) + 1;
    let text = `<b>🎲 تاس شانس</b>\n<blockquote>${Utils.mention(ctx.from)}</blockquote>\n\n`;
    text += `<pre>نتیجه  ${'🎲'.repeat(r)}  (${r})</pre>\n\n`;
    let xp = 0, res = 'loss';
    if (r === 6) { xp = 60; res = 'win'; text += `<b>شش!</b>  <code>+${xp} XP</code>`; }
    else if (r >= 4) { xp = 20; res = 'win'; text += `خوب بود  <code>+${xp} XP</code>`; }
    else if (r >= 2) { xp = 5; text += `متوسط  <code>+${xp} XP</code>`; }
    else text += `<i>شانس نداشتی</i>`;
    if (xp > 0) await ctx.db.addXP(ctx.chat.id, ctx.from.id, xp);
    await ctx.db.recordGameResult(ctx.chat.id, ctx.from.id, 'dice', res, xp);
    if (r === 6 && await ctx.db.unlockAchievement(ctx.chat.id, ctx.from.id, 'lucky')) {
      ctx.ctx.waitUntil(ctx.send(Views.achievementUnlocked(ctx.from, 'lucky')));
    }
    await ctx.send(text);
    return;
  }

  if (gt === 'quiz') {
    const q = Games.getRandomQuiz();
    await ctx.db.createGame(gid, ctx.chat.id, 'quiz', ctx.from.id, { ...q, answered: [] });
    let text = `<b>🧠 مسابقه</b>\n<blockquote>${Utils.escapeHtml(q.q)}</blockquote>\n\nجایزه: <code>+30 XP</code>`;
    const b = q.options.map((o, i) => ({
      text: `${['🇦', '🇧', '🇨', '🇩'][i]}  ${o}`,
      callback_data: `g:quiz:${gid}:${i}`,
    }));
    await ctx.send(text, { reply_markup: { inline_keyboard: [[b[0], b[1]], [b[2], b[3]]] } });
    return;
  }

  if (gt === 'type') {
    const ch = Games.getRandomType();
    let text = `<b>⚡ سریع تایپ</b>\n`;
    text += `<blockquote>عبارت زیر رو کپی کن و بفرست</blockquote>\n\n`;
    text += `<pre>${Utils.escapeHtml(ch)}</pre>\n\n`;
    text += `جایزه: <code>+40 XP</code>  ·  مهلت: <code>60s</code>`;
    const msg = await ctx.send(text);
    if (msg?.ok) {
      await ctx.db.createGame(gid, ctx.chat.id, 'type', ctx.from.id, {
        text: ch, start: Date.now(), message_id: msg.result.message_id,
      });
    }
    return;
  }
}

// ── Check guess game ──
export async function checkGuessGame(ctx) {
  if (!ctx.message.reply_to_message) return false;
  const n = parseInt(ctx.text, 10);
  if (isNaN(n)) return false;
  const g = await ctx.db.getActiveGame(ctx.chat.id, 'guess');
  if (!g) return false;
  const d = g.data;
  if (!d.message_id || d.message_id !== ctx.message.reply_to_message.message_id) return false;
  d.attempts = (d.attempts || 0) + 1;

  if (n === d.number) {
    await ctx.db.deleteGame(g.id);
    await ctx.db.addXP(ctx.chat.id, ctx.from.id, 50);
    await ctx.db.recordGameResult(ctx.chat.id, ctx.from.id, 'guess', 'win', 50);
    let t = `<b>🎯 درست بود!</b>\n`;
    t += `<blockquote>${Utils.mention(ctx.from)}\nعدد: <b>${d.number}</b>  ·  تلاش: <b>${d.attempts}</b></blockquote>\n\n<code>+50 XP</code>`;
    await ctx.reply(t);
    return true;
  }

  await ctx.db.updateGame(g.id, d);
  await ctx.reply(`${n > d.number ? '⬇️ کوچک‌تر' : '⬆️ بزرگ‌تر'}  <i>(تلاش ${d.attempts})</i>`);
  return true;
}

// ── Check type game ──
export async function checkTypeGame(ctx) {
  const g = await ctx.db.getActiveGame(ctx.chat.id, 'type');
  if (!g) return false;
  const d = g.data;
  if (!d.text) return false;
  if (Date.now() - d.start > 60000) {
    await ctx.db.deleteGame(g.id);
    return false;
  }
  if (ctx.text.trim() === d.text.trim()) {
    const time = ((Date.now() - d.start) / 1000).toFixed(2);
    await ctx.db.deleteGame(g.id);
    await ctx.db.addXP(ctx.chat.id, ctx.from.id, 40);
    await ctx.db.recordGameResult(ctx.chat.id, ctx.from.id, 'type', 'win', 40);
    let t = `<b>⚡ سریع‌ترین!</b>\n`;
    t += `<blockquote>${Utils.mention(ctx.from)}\nزمان: <b>${time}s</b></blockquote>\n\n<code>+40 XP</code>`;
    await ctx.reply(t);
    return true;
  }
  return false;
}

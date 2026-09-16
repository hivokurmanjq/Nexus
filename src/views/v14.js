// ═══════════════════════════════════════════════════════════
//  NEXUS — v14 Premium Views
//  از worker.js اصلی منتقل شده — بدون حذف
// ═══════════════════════════════════════════════════════════

import { Utils } from '../lib/utils.js';
import { V14_DEFAULTS } from '../config/defaults.js';

// ── Default merger ──
export function nexusV14Defaults(settings) {
  return Utils.deepMerge(Utils.deepMerge({}, V14_DEFAULTS), settings || {});
}

export const V14_PREMIUM_VIEWS = {
  overview(chat, settings, stats = {}) {
    const shield = settings.smartShield?.enabled ? (settings.smartShield.mode === 'active' ? 'ACTIVE' : 'OBSERVE') : 'STANDBY';
    const title = Utils.escapeHtml(chat?.title || 'Community');
    return {
      text: `<b>✦ NEXUS</b>  <code>PREMIUM</code>\n<i>${title}</i>\n\n<blockquote><b>● ${shield === 'ACTIVE' ? 'Protected' : 'System ready'}</b>\n${Number(stats.messages || 0).toLocaleString('fa-IR')} پیام امروز · ${Number(stats.deletions || 0).toLocaleString('fa-IR')} اقدام محافظتی</blockquote>\n\n<b>Command Center</b>\n<i>مدیریت ساده در سطح اول؛ کنترل کامل در لایه‌های پیشرفته.</i>`,
      keyboard: { inline_keyboard: [
        [{ text: '🛡 محافظت', callback_data: 'v14:protect' }, { text: '⚡ اتوماسیون', callback_data: 'v14:automate' }],
        [{ text: '👥 جامعه', callback_data: 'v14:community' }, { text: '◈ تحلیل', callback_data: 'v14:insights' }],
        [{ text: '⚠ اقدام سریع', callback_data: 'v14:quick' }, { text: '⚙ پیشرفته', callback_data: 'v14:advanced' }],
      ] },
    };
  },
  protect(settings) {
    const ss = settings.smartShield || V14_DEFAULTS.smartShield;
    return {
      text: `<b>Protect</b>\n<blockquote>محافظت هوشمند و کنترل‌شده</blockquote>\n\n<b>Smart Shield</b>\n<code>${ss.enabled ? (ss.mode || 'observe').toUpperCase() : 'OFF'}</code>\n\n<i>Observe فقط تحلیل و ثبت می‌کند؛ Active می‌تواند اقدام خودکار انجام دهد.</i>`,
      keyboard: { inline_keyboard: [
        [{ text: `${ss.enabled ? '◉' : '◯'} Smart Shield`, callback_data: 'v14:toggle:smartShield.enabled' }, { text: `Mode: ${ss.mode || 'observe'}`, callback_data: 'v14:shieldmode' }],
        [{ text: `${ss.newcomerProbation ? '◉' : '◯'} Newcomer probation`, callback_data: 'v14:toggle:smartShield.newcomerProbation' }],
        [{ text: 'فیلترهای کلاسیک', callback_data: 'p:security' }, { text: 'قفل محتوا', callback_data: 'p:locks' }],
        [{ text: 'کپچا', callback_data: 'p:captcha' }, { text: 'بازگشت', callback_data: 'v14:home' }],
      ] },
    };
  },
};

// ── Callback Handler ──
export async function nexusV14HandleCallback(ctx) {
  const data = ctx.callback?.data || '';
  if (!data.startsWith('v14:')) return false;
  const settings = nexusV14Defaults(await ctx.getSettings());
  const action = data.slice(4);
  if (action === 'home') {
    const stats = await ctx.db.getTodayStats(ctx.chat.id);
    const v = V14_PREMIUM_VIEWS.overview(ctx.chat, settings, stats);
    await ctx.editText(v.text, { reply_markup: v.keyboard });
    return true;
  }
  if (action === 'protect') {
    const v = V14_PREMIUM_VIEWS.protect(settings);
    await ctx.editText(v.text, { reply_markup: v.keyboard });
    return true;
  }
  if (action === 'shieldmode') {
    await ctx.updateSettings(s => {
      const x = nexusV14Defaults(s);
      x.smartShield.mode = x.smartShield.mode === 'observe' ? 'active' : 'observe';
      return x;
    });
    const fresh = nexusV14Defaults(await ctx.getSettings());
    const v = V14_PREMIUM_VIEWS.protect(fresh);
    await ctx.editText(v.text, { reply_markup: v.keyboard });
    return true;
  }
  if (action.startsWith('toggle:')) {
    const path = action.slice(7).split('.');
    await ctx.updateSettings(s => {
      const x = nexusV14Defaults(s);
      let obj = x;
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
      obj[path[path.length - 1]] = !obj[path[path.length - 1]];
      if (path.join('.') === 'smartShield.enabled') x.featureFlags.smartShield = obj[path[path.length - 1]];
      return x;
    });
    const fresh = nexusV14Defaults(await ctx.getSettings());
    const v = V14_PREMIUM_VIEWS.protect(fresh);
    await ctx.editText(v.text, { reply_markup: v.keyboard });
    return true;
  }
  await ctx.answer('این بخش در نسخه Premium آمادهٔ اتصال است.');
  return true;
}

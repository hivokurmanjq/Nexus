// ═══════════════════════════════════════════════════════════
//  NEXUS — Views (Part 1/3)
//  تمام UI panels و پیام‌های ربات
// ═══════════════════════════════════════════════════════════

import { BOT, D, LANG, ACHIEVEMENTS } from '../config/constants.js';
import { DEFAULT_SETTINGS } from '../config/defaults.js';
import { Utils, Levels } from '../lib/utils.js';
import { Games } from '../lib/games.js';

export const Views = {
  // ═══════════════════════════════════════════════════════════
  //  START & HELP
  // ═══════════════════════════════════════════════════════════
  start(ctx) {
    const name = Utils.escapeHtml(ctx.from?.first_name || 'دوست');
    const mini = ctx.env.MINI_APP_URL;
    let text = `<b>✦ NEXUS</b>  <code>13.0</code>\n`;
    text += `<i>${BOT.tagline}</i>\n\n`;
    text += `<blockquote><b>${name}</b>، خوش اومدی.\n`;
    text += `اینجا فقط یک ربات نمی‌بینی؛ NEXUS مرکز فرماندهی، محافظ و هوش گروهته.</blockquote>\n\n`;
    text += `<b>● SYSTEM STATUS</b>\n`;
    text += `<code>DEFENSE      ONLINE\nINTELLIGENCE ONLINE\nAUTOMATION   ONLINE\nCOMMUNITY    ONLINE</code>\n\n`;
    text += `<i>هر چیزی که لازم باشه، از همین‌جا شروع می‌شه.</i>`;
    const rows = [];
    if (mini) rows.push([{ text: '◈  OPEN NEXUS', web_app: { url: mini } }]);
    rows.push([{ text: '＋  افزودن به گروه', url: `https://t.me/${BOT.username || 'NexusBot'}?startgroup=true` }]);
    rows.push([{ text: '🛡  محافظت', callback_data: 'v:help_security' }, { text: '🧠  هوش مصنوعی', callback_data: 'v:help_ai' }]);
    rows.push([{ text: '⚡  امکانات', callback_data: 'v:help' }, { text: '✦  درباره NEXUS', callback_data: 'v:about' }]);
    if (mini) rows.push([{ text: '🌐  مرکز فرماندهی', web_app: { url: mini } }]);
    return { text, keyboard: { inline_keyboard: rows } };
  },

  help() {
    let text = `<b>راهنمای ${BOT.name}</b>\n`;
    text += `<blockquote>همه دستورات در ۷ دسته سازمان‌دهی شده‌ن</blockquote>\n\n`;
    text += `${D.b} مدیریت و انضباط\n`;
    text += `${D.b} امنیت و ضداسپم\n`;
    text += `${D.b} سرگرمی و XP\n`;
    text += `${D.b} اتوماسیون\n`;
    text += `${D.b} فدراسیون و سراسری\n`;
    text += `${D.b} هوش مصنوعی\n`;
    text += `${D.b} ابزارهای پیشرفته`;
    return {
      text,
      keyboard: {
        inline_keyboard: [
          [
            { text: '👮‍♂️  مدیریت', callback_data: 'v:help_admin' },
            { text: '🛡  امنیت', callback_data: 'v:help_security' },
          ],
          [
            { text: '🏆  سرگرمی', callback_data: 'v:help_fun' },
            { text: '⚙️  اتوماسیون', callback_data: 'v:help_auto' },
          ],
          [
            { text: '🌐  فدراسیون', callback_data: 'v:help_fed' },
            { text: '🧠  AI', callback_data: 'v:help_ai' },
          ],
          [{ text: '🔧  ابزار پیشرفته', callback_data: 'v:help_advanced' }],
          [{ text: '← بازگشت', callback_data: 'v:start' }],
        ],
      },
    };
  },

  helpAdmin() {
    let text = `<b>مدیریت و انضباط</b>\n<blockquote>ابزارهای ادمین</blockquote>\n\n`;
    text += `<b>اقدام روی کاربر</b>\n\n`;
    text += `${D.b} <code>بن [مدت] [دلیل]</code>\n`;
    text += `${D.b} <code>آنبن</code> · <code>کیک</code>\n`;
    text += `${D.b} <code>میوت [مدت]</code> · <code>آزاد</code>\n`;
    text += `${D.b} <code>اخطار [دلیل]</code> · <code>حذف اخطارها</code>\n\n`;
    text += `<b>اقدام ترکیبی (D-Actions)</b>\n\n`;
    text += `${D.b} <code>dبن</code> — حذف + بن\n`;
    text += `${D.b} <code>dکیک</code> — حذف + کیک\n`;
    text += `${D.b} <code>dمیوت</code> — حذف + میوت\n`;
    text += `${D.b} <code>dاخطار</code> — حذف + اخطار\n\n`;
    text += `<b>اقدام بی‌صدا (S-Actions)</b>\n\n`;
    text += `${D.b} <code>sبن</code> · <code>sکیک</code> · <code>sمیوت</code> · <code>sاخطار</code>\n\n`;
    text += `<b>مدیریت ادمین</b>\n\n`;
    text += `${D.b} <code>ارتقا</code> · <code>تنزل</code> · <code>لقب متن</code>\n`;
    text += `${D.b} <code>دسترسی‌ها</code> — کنترل مجوز ادمین\n\n`;
    text += `<b>روی پیام</b>\n\n`;
    text += `${D.b} <code>حذف</code> · <code>پاکسازی</code>\n`;
    text += `${D.b} <code>پین کن</code> · <code>آنپین</code>\n\n`;
    text += `<b>زنجیره اخطار</b>\n\n`;
    text += `${D.b} <code>زنجیره اخطار</code> — تنظیم اکشن پله‌ای`;
    return {
      text,
      keyboard: { inline_keyboard: [[{ text: '← بازگشت', callback_data: 'v:help' }]] },
    };
  },

  helpSecurity() {
    let text = `<b>امنیت و ضداسپم</b>\n<blockquote>حفاظت خودکار از گروه</blockquote>\n\n`;
    text += `<b>فیلترها</b>\n\n`;
    text += `${D.b} ضد لینک (با وایت‌لیست)\n`;
    text += `${D.b} ضد کلمه ممنوع\n`;
    text += `${D.b} ضد فلود\n`;
    text += `${D.b} ضد رید خودکار\n`;
    text += `${D.b} ضد کانال (فوروارد)\n`;
    text += `${D.b} فیلتر زبان\n\n`;
    text += `<b>قفل محتوا (۱۲ نوع)</b>\n\n`;
    text += `${D.b} استیکر، گیف، عکس، ویدیو\n`;
    text += `${D.b} ویس، موزیک، فایل، فوروارد\n`;
    text += `${D.b} لینک، ربات، اینلاین، بازی\n\n`;
    text += `<b>کپچا</b>\n\n`;
    text += `${D.b} دکمه، ریاضی، ایموجی\n\n`;
    text += `<b>گزارش‌گیری</b>\n\n`;
    text += `${D.b} <code>گزارش</code> روی پیام\n\n`;
    text += `<blockquote expandable>🔐 <b>برای امنیت حداکثری</b>\n`;
    text += `از پنل > امنیت، همه فیلترها رو روشن کن.\n`;
    text += `نوع کپچا رو «ریاضی» بذار.\n`;
    text += `از پنل > ضد رید، آستانه ۵ عضو در ۱۰ ثانیه.\n`;
    text += `از پنل > تنظیمات اضافی، ضد کانال و حالت تأیید رو روشن کن.</blockquote>`;
    return {
      text,
      keyboard: { inline_keyboard: [[{ text: '← بازگشت', callback_data: 'v:help' }]] },
    };
  },

  helpFun() {
    let text = `<b>سرگرمی و XP</b>\n<blockquote>سیستم پیشرفت و بازی</blockquote>\n\n`;
    text += `<b>پیشرفت کاربر</b>\n\n`;
    text += `${D.b} <code>پروفایل</code> · <code>برترین‌ها</code>\n`;
    text += `${D.b} <code>دستاوردها</code> — ۱۸ دستاورد\n\n`;
    text += `<b>اعتبار (Rep)</b>\n\n`;
    text += `${D.b} <code>+rep</code> · <code>-rep</code> (روی پیام)\n`;
    text += `${D.b} <code>اعتبارات</code> — تاپ اعتبار\n\n`;
    text += `<b>۶ بازی گروهی</b>\n\n`;
    text += `${D.b} 🎯 حدس عدد · ✂️ سنگ کاغذ\n`;
    text += `${D.b} 🎰 اسلات · 🧠 مسابقه\n`;
    text += `${D.b} 🎲 تاس · ⚡ سریع تایپ\n\n`;
    text += `<b>دعوت دوستان</b>\n\n`;
    text += `${D.b} <code>دعوت‌ها</code> — آمار دعوت`;
    return {
      text,
      keyboard: { inline_keyboard: [[{ text: '← بازگشت', callback_data: 'v:help' }]] },
    };
  },

  helpAuto() {
    let text = `<b>اتوماسیون</b>\n<blockquote>خودکارسازی گروه</blockquote>\n\n`;
    text += `<b>خوش‌آمد</b>\n\n`;
    text += `${D.b} متن، مدیا، حذف خودکار قبلی\n\n`;
    text += `<b>پاسخ خودکار (Triggers)</b>\n\n`;
    text += `${D.b} پاسخ به کلمات کلیدی\n`;
    text += `${D.b} با متغیرها: {name} {mention} {group}\n\n`;
    text += `<b>یادداشت‌ها</b>\n\n`;
    text += `${D.b} <code>#نام</code> — فراخوانی سریع\n\n`;
    text += `<b>زمان‌بندی</b>\n\n`;
    text += `${D.b} <code>زمان‌بندی</code> — یک‌باره\n`;
    text += `${D.b} <code>زمان‌بندی روزانه</code> — تکرارشونده`;
    return {
      text,
      keyboard: { inline_keyboard: [[{ text: '← بازگشت', callback_data: 'v:help' }]] },
    };
  },

  helpFed() {
    let text = `<b>فدراسیون گروه‌ها</b>\n<blockquote>اتحاد چند گروه</blockquote>\n\n`;
    text += `<b>ساخت و مدیریت</b>\n\n`;
    text += `${D.b} <code>فدراسیون جدید [نام]</code>\n`;
    text += `${D.b} <code>ورود فدراسیون [نام]</code>\n`;
    text += `${D.b} <code>خروج فدراسیون</code>\n`;
    text += `${D.b} <code>فدراسیون</code> — اطلاعات\n\n`;
    text += `<b>بن فدرال</b>\n\n`;
    text += `${D.b} <code>بن فدرال [دلیل]</code>\n`;
    text += `${D.b} <code>آنبن فدرال</code>\n`;
    text += `${D.b} <code>لیست بن فدرال</code>\n\n`;
    text += `<b>بن سراسری (مالک)</b>\n\n`;
    text += `${D.b} <code>بن سراسری</code> — همه گروه‌ها`;
    return {
      text,
      keyboard: { inline_keyboard: [[{ text: '← بازگشت', callback_data: 'v:help' }]] },
    };
  },

  helpAI() {
    let text = `<b>هوش مصنوعی</b>\n<blockquote>دستیار هوشمند</blockquote>\n\n`;
    text += `<b>سه روش استفاده</b>\n\n`;
    text += `${D.b} منشن: <code>@${BOT.name}Bot سلام</code>\n`;
    text += `${D.b} ریپلای روی پیام ربات\n`;
    text += `${D.b} <code>/ai سوال</code>\n\n`;
    text += `<b>پشتیبانی چند مدل</b>\n\n`;
    text += `${D.b} Llama 3.1 8B\n`;
    text += `${D.b} Llama 3.3 70B\n`;
    text += `${D.b} Mistral 7B`;
    return {
      text,
      keyboard: { inline_keyboard: [[{ text: '← بازگشت', callback_data: 'v:help' }]] },
    };
  },

  helpAdvanced() {
    let text = `<b>ابزارهای پیشرفته</b>\n<blockquote>قابلیت‌های حرفه‌ای</blockquote>\n\n`;
    text += `<b>گروه‌بندی کاربران (Alias)</b>\n\n`;
    text += `${D.b} <code>نام‌گذاری [نام]</code> — روی پیام\n`;
    text += `${D.b} <code>@نام</code> — منشن گروهی\n`;
    text += `${D.b} <code>لیست نام‌ها</code> · <code>حذف نام</code>\n\n`;
    text += `<b>حالت بی‌صدا</b>\n\n`;
    text += `${D.b} <code>بی‌صدا</code> — بدون پیام تأیید\n\n`;
    text += `<b>جستجو در پیام‌ها</b>\n\n`;
    text += `${D.b} <code>جستجو [کلمه]</code> — حالت رکورد\n\n`;
    text += `<b>نرخ ارز و انیمه</b>\n\n`;
    text += `${D.b} <code>قیمت دلار</code> · <code>انیمه [نام]</code>\n\n`;
    text += `<b>پشتیبان و بازیابی</b>\n\n`;
    text += `${D.b} <code>پشتیبان</code> — فایل JSON\n`;
    text += `${D.b} <code>بازیابی</code> — با ارسال فایل JSON\n\n`;
    text += `<b>دیگر</b>\n\n`;
    text += `${D.b} <code>همگام</code> · <code>پاکسازی کش</code>\n`;
    text += `${D.b} <code>وضعیت</code> — پیام وضعیت زنده`;
    return {
      text,
      keyboard: { inline_keyboard: [[{ text: '← بازگشت', callback_data: 'v:help' }]] },
    };
  },

  about() {
    let text = `<b>درباره ${BOT.name}</b>\n`;
    text += `<blockquote>نسل جدید محافظ گروه\n${BOT.year} Edition</blockquote>\n\n`;
    text += `<pre>نسخه        ${BOT.version}\n`;
    text += `زیرساخت      Cloudflare Edge\n`;
    text += `دیتابیس      D1 SQL\n`;
    text += `حافظه        KV Storage\n`;
    text += `هوش         Llama 3.1\n`;
    text += `ظاهر        Aurora Luxe</pre>\n\n`;
    text += `<blockquote expandable>${D.diamond} <b>معماری</b>\n`;
    text += `Nexus روی زیرساخت Cloudflare اجرا می‌شه.\n`;
    text += `بدون setTimeout — با Lazy Expiration و Cron Triggers.\n`;
    text += `بیش از ۴۰ قابلیت حرفه‌ای.\n`;
    text += `امن، سریع، مقیاس‌پذیر.</blockquote>\n\n`;
    text += `<i>ساخته شده با ${D.star}</i>`;
    return {
      text,
      keyboard: { inline_keyboard: [[{ text: '← بازگشت', callback_data: 'v:start' }]] },
    };
  },

  // ═══════════════════════════════════════════════════════════
  //  MAIN PANEL
  // ═══════════════════════════════════════════════════════════
  panelMain(chat, s) {
    const title = Utils.escapeHtml(chat?.title || 'گروه');
    const security = s.antiLink && s.antiWord && s.antiFlood && s.antiRaid;
    const active = [s.antiLink,s.antiWord,s.antiFlood,s.antiRaid,s.captcha?.enabled,s.ai?.enabled,s.xp?.enabled,s.games?.enabled].filter(Boolean).length;
    let text = `<b>✦ NEXUS COMMAND</b>\n`;
    text += `<i>${title}</i>\n\n`;
    text += `<blockquote><b>${security ? '🟢 سیستم پایدار' : '🟡 نیاز به توجه'}</b>\n`;
    text += `${active} ماژول فعال · محافظت ${security ? 'کامل' : 'ناقص'}\n`;
    text += `تغییرات اینجا فوراً ذخیره می‌شن.</blockquote>\n\n`;
    text += `<b>CORE</b>\n`;
    text += `<code>🛡 ${security ? 'DEFENSE ONLINE' : 'DEFENSE CHECK'}\n`;
    text += `🧠 AI ${s.ai?.enabled ? 'ONLINE' : 'STANDBY'}\n`;
    text += `👥 COMMUNITY ${s.xp?.enabled ? 'ONLINE' : 'STANDBY'}\n`;
    text += `⚡ AUTOMATION ${s.smartTriggers ? 'ONLINE' : 'STANDBY'}</code>`;
    return { text, keyboard: { inline_keyboard: [
      [{ text:'🛡  محافظت', callback_data:'p:security' }, { text:'👮  مدیریت', callback_data:'p:locks' }],
      [{ text:'🧠  هوش و AI', callback_data:'p:ai' }, { text:'⚡  اتوماسیون', callback_data:'p:triggers' }],
      [{ text:'👥  جامعه', callback_data:'p:xp' }, { text:'📊  تحلیل و آمار', callback_data:'p:stats' }],
      [{ text:'🚨  فیلتر و ضدرید', callback_data:'p:filters' }, { text:'🔐  کپچا', callback_data:'p:captcha' }],
      [{ text:'📋  لاگ‌ها', callback_data:'p:logs' }, { text:'⚙  تنظیمات', callback_data:'p:ext' }],
      [{ text:'🌐  NEXUS Dashboard', callback_data:'p:dashboard' }],
      [{ text:'✕  بستن', callback_data:'p:close' }],
    ] } };
  },

  panelSecurity(s) {
    let text = `<b>امنیت</b>\n<blockquote>محافظت چندلایه</blockquote>\n\n`;
    text += `<b>فیلترها</b>\n\n`;
    text += `${D.b} ضد لینک  ·  <code>${D.status(s.antiLink)}</code>\n`;
    text += `${D.b} ضد کلمه  ·  <code>${D.status(s.antiWord)}</code>\n`;
    text += `${D.b} ضد فلود  ·  <code>${D.status(s.antiFlood)}</code>\n`;
    text += `${D.b} ضد رید   ·  <code>${D.status(s.antiRaid)}</code>\n`;
    text += `${D.b} ضد کانال  ·  <code>${D.status(s.antiChannel)}</code>\n`;
    text += `${D.b} ضد زبان   ·  <code>${D.status(s.antiLanguage)}</code>\n\n`;
    text += `<b>آستانه‌ها</b>\n\n`;
    text += `${D.b} سقف اخطار  ·  <code>${s.warnLimit}</code>\n`;
    text += `${D.b} پیام فلود  ·  <code>${s.floodMax}</code>\n`;
    text += `${D.b} اقدام اخطار ·  <code>${s.warnAction}</code>`;
    return {
      text,
      keyboard: {
        inline_keyboard: [
          [
            { text: D.toggleBtn(s.antiLink, 'ضد لینک'), callback_data: 't:antiLink' },
            { text: D.toggleBtn(s.antiWord, 'ضد کلمه'), callback_data: 't:antiWord' },
          ],
          [
            { text: D.toggleBtn(s.antiFlood, 'ضد فلود'), callback_data: 't:antiFlood' },
            { text: D.toggleBtn(s.antiRaid, 'ضد رید'), callback_data: 't:antiRaid' },
          ],
          [
            { text: D.toggleBtn(s.antiChannel, 'ضد کانال'), callback_data: 't:antiChannel' },
            { text: D.toggleBtn(s.antiLanguage, 'ضد زبان'), callback_data: 't:antiLanguage' },
          ],
          [
            { text: D.toggleBtn(s.silentActions, 'بی‌صدا'), callback_data: 't:silentActions' },
            { text: D.toggleBtn(s.warnEscalation, 'زنجیره‌ای'), callback_data: 't:warnEscalation' },
          ],
          [
            { text: '−', callback_data: 'n:warnLimit:-1' },
            { text: `سقف اخطار ${s.warnLimit}`, callback_data: 'noop' },
            { text: '+', callback_data: 'n:warnLimit:1' },
          ],
          [
            { text: '−', callback_data: 'n:floodMax:-1' },
            { text: `پیام فلود ${s.floodMax}`, callback_data: 'noop' },
            { text: '+', callback_data: 'n:floodMax:1' },
          ],
          [{ text: `اکشن اخطار: ${s.warnAction}`, callback_data: 'x:warnact' }],
          [{ text: '← بازگشت', callback_data: 'p:main' }],
        ],
      },
    };
  },

  panelLocks(s) {
    let text = `<b>قفل‌های محتوا</b>\n<blockquote>کنترل نوع پیام‌های مجاز</blockquote>\n\n`;
    text += `<i>هر قفل که روشن باشه، اون نوع پیام خودکار حذف می‌شه.</i>`;
    return {
      text,
      keyboard: {
        inline_keyboard: [
          [
            { text: D.toggleBtn(s.locks.sticker, 'استیکر'), callback_data: 't:lock:sticker' },
            { text: D.toggleBtn(s.locks.gif, 'گیف'), callback_data: 't:lock:gif' },
          ],
          [
            { text: D.toggleBtn(s.locks.photo, 'عکس'), callback_data: 't:lock:photo' },
            { text: D.toggleBtn(s.locks.video, 'ویدیو'), callback_data: 't:lock:video' },
          ],
          [
            { text: D.toggleBtn(s.locks.voice, 'ویس'), callback_data: 't:lock:voice' },
            { text: D.toggleBtn(s.locks.audio, 'موزیک'), callback_data: 't:lock:audio' },
          ],
          [
            { text: D.toggleBtn(s.locks.document, 'فایل'), callback_data: 't:lock:document' },
            { text: D.toggleBtn(s.locks.forward, 'فوروارد'), callback_data: 't:lock:forward' },
          ],
          [
            { text: D.toggleBtn(s.locks.url, 'لینک'), callback_data: 't:lock:url' },
            { text: D.toggleBtn(s.locks.bot, 'ربات‌ها'), callback_data: 't:lock:bot' },
          ],
          [
            { text: D.toggleBtn(s.locks.inline, 'اینلاین'), callback_data: 't:lock:inline' },
            { text: D.toggleBtn(s.locks.game, 'بازی'), callback_data: 't:lock:game' },
          ],
          [{ text: `${s.locks.lockdown ? '◉' : '◯'}  قفل کامل گروه`, callback_data: 't:lock:lockdown' }],
          [{ text: '← بازگشت', callback_data: 'p:main' }],
        ],
      },
    };
  },

  async panelFilters(ctx) {
    const w = await ctx.db.getBlacklistWords(ctx.chat.id);
    const l = await ctx.db.getWhitelistLinks(ctx.chat.id);
    let text = `<b>فیلترها</b>\n<blockquote>کلمات ممنوع و لینک‌های مجاز</blockquote>\n\n`;
    text += `<pre>کلمات ممنوع     ${w.length}\nلینک‌های مجاز    ${l.length}</pre>`;
    return {
      text,
      keyboard: {
        inline_keyboard: [
          [
            { text: '➕  افزودن کلمه', callback_data: 'a:addword' },
            { text: '📋  لیست', callback_data: 'l:words' },
          ],
          [
            { text: '➕  افزودن لینک', callback_data: 'a:addlink' },
            { text: '📋  لیست', callback_data: 'l:links' },
          ],
          [
            { text: '🗑  پاک کلمات', callback_data: 'c:words' },
            { text: '🗑  پاک لینک‌ها', callback_data: 'c:links' },
          ],
          [{ text: '← بازگشت', callback_data: 'p:main' }],
        ],
      },
    };
  },

  panelWelcome(s) {
    const preview = s.welcome.text
      ? Utils.escapeHtml(s.welcome.text.slice(0, 60)) + (s.welcome.text.length > 60 ? '…' : '')
      : 'پیش‌فرض (فلسفی)';
    let text = `<b>خوش‌آمد و خداحافظی</b>\n<blockquote>پیام‌های خوش‌آمدگویی اعضا</blockquote>\n\n`;
    text += `<pre>خوش‌آمد      ${D.status(s.welcome.enabled)}\n`;
    text += `خداحافظی     ${D.status(s.goodbye.enabled)}\n`;
    text += `حذف قبلی      ${D.status(s.welcome.cleanPrevious)}\n`;
    text += `مدیا         ${s.welcome.media ? 'دارد' : 'ندارد'}</pre>\n\n`;
    text += `<b>متن فعلی</b>\n<i>${preview}</i>\n\n`;
    text += `<blockquote expandable>📝 <b>متغیرهای قابل استفاده</b>\n`;
    text += `<code>{name}</code> — نام کاربر\n`;
    text += `<code>{mention}</code> — منشن کاربر\n`;
    text += `<code>{group}</code> — نام گروه\n`;
    text += `<code>{count}</code> — شماره عضو\n`;
    text += `<code>{id}</code> — آیدی عددی\n\n`;
    text += `می‌تونی از HTML هم استفاده کنی:\n`;
    text += `<code>&lt;b&gt;bold&lt;/b&gt;</code>, <code>&lt;i&gt;italic&lt;/i&gt;</code>, <code>&lt;code&gt;mono&lt;/code&gt;</code></blockquote>`;
    return {
      text,
      keyboard: {
        inline_keyboard: [
          [{ text: D.toggleBtn(s.welcome.enabled, 'خوش‌آمد'), callback_data: 't:welcome:enabled' }],
          [{ text: D.toggleBtn(s.goodbye.enabled, 'خداحافظی'), callback_data: 't:goodbye:enabled' }],
          [{ text: D.toggleBtn(s.welcome.cleanPrevious, 'حذف پیام قبلی'), callback_data: 't:welcome:cleanPrevious' }],
          [
            { text: '✏️  ویرایش خوش‌آمد', callback_data: 'a:setwelcome' },
            { text: '✏️  ویرایش خداحافظی', callback_data: 'a:setgoodbye' },
          ],
          [{ text: '🖼  تنظیم مدیا', callback_data: 'x:welcomemedia' }],
          [
            { text: '👁  پیش‌نمایش', callback_data: 'x:previewwelcome' },
            { text: '🗑  حذف متن', callback_data: 'x:resetwelcome' },
          ],
          [{ text: '← بازگشت', callback_data: 'p:main' }],
        ],
      },
    };
  },

  panelCaptcha(s) {
    const types = { button: 'دکمه', math: 'ریاضی', emoji: 'ایموجی' };
    let text = `<b>کپچا</b>\n<blockquote>تأیید اعضای جدید قبل از ورود</blockquote>\n\n`;
    text += `<pre>وضعیت      ${D.status(s.captcha.enabled)}\n`;
    text += `نوع         ${types[s.captcha.type]}\n`;
    text += `مهلت        ${Utils.formatDuration(s.captcha.timeout)}\n`;
    text += `کیک خودکار  ${D.status(s.captcha.kickOnFail)}\n`;
    text += `حداکثر تلاش ${s.captcha.maxAttempts}</pre>\n\n`;
    text += `<blockquote expandable>🔐 <b>سه نوع کپچا</b>\n`;
    text += `<b>دکمه</b> — ساده‌ترین، کاربر روی دکمه می‌زنه\n`;
    text += `<b>ریاضی</b> — یه معادله ساده که کاربر حل می‌کنه\n`;
    text += `<b>ایموجی</b> — کاربر باید ایموجی درست رو انتخاب کنه\n\n`;
    text += `اگه کاربر تو مهلت مشخص پاسخ نده، خودکار اخراج می‌شه.</blockquote>`;
    return {
      text,
      keyboard: {
        inline_keyboard: [
          [{ text: D.toggleBtn(s.captcha.enabled, 'فعال بودن'), callback_data: 't:captcha:enabled' }],
          [
            { text: `${s.captcha.type === 'button' ? '◉' : '◯'} دکمه`, callback_data: 'x:captype:button' },
            { text: `${s.captcha.type === 'math' ? '◉' : '◯'} ریاضی`, callback_data: 'x:captype:math' },
            { text: `${s.captcha.type === 'emoji' ? '◉' : '◯'} ایموجی`, callback_data: 'x:captype:emoji' },
          ],
          [{ text: D.toggleBtn(s.captcha.kickOnFail, 'کیک خودکار'), callback_data: 't:captcha:kickOnFail' }],
          [
            { text: '−', callback_data: 'n:captchaTimeout:-30' },
            { text: `مهلت ${s.captcha.timeout}s`, callback_data: 'noop' },
            { text: '+', callback_data: 'n:captchaTimeout:30' },
          ],
          [{ text: '← بازگشت', callback_data: 'p:main' }],
        ],
      },
    };
  },

  panelRaid(s) {
    let text = `<b>ضد رید</b>\n<blockquote>شناسایی ورود انبوه اعضا</blockquote>\n\n`;
    text += `<pre>وضعیت      ${D.status(s.antiRaid)}\n`;
    text += `آستانه      ${s.raid.threshold} عضو\n`;
    text += `بازه        ${s.raid.window} ثانیه\n`;
    text += `مدت قفل     ${Utils.formatDuration(s.raid.lockDuration)}</pre>\n\n`;
    text += `<i>وقتی تعداد اعضای جدید در بازه مشخص از آستانه بگذره، گروه خودکار قفل می‌شه.</i>`;
    return {
      text,
      keyboard: {
        inline_keyboard: [
          [{ text: D.toggleBtn(s.antiRaid, 'ضد رید'), callback_data: 't:antiRaid' }],
          [
            { text: '−', callback_data: 'n:raidThreshold:-1' },
            { text: `آستانه ${s.raid.threshold}`, callback_data: 'noop' },
            { text: '+', callback_data: 'n:raidThreshold:1' },
          ],
          [
            { text: '−', callback_data: 'n:raidWindow:-5' },
            { text: `بازه ${s.raid.window}s`, callback_data: 'noop' },
            { text: '+', callback_data: 'n:raidWindow:5' },
          ],
          [{ text: '← بازگشت', callback_data: 'p:main' }],
        ],
      },
    };
  },

  panelAI(s) {
    let text = `<b>هوش مصنوعی</b>\n<blockquote>دستیار هوشمند گروه</blockquote>\n\n`;
    text += `<pre>وضعیت           ${D.status(s.ai.enabled)}\n`;
    text += `پاسخ به ادمین    ${D.status(s.ai.replyToAdmins)}\n`;
    text += `پاسخ به منشن    ${D.status(s.ai.replyOnMention)}\n`;
    text += `پاسخ به ریپلای  ${D.status(s.ai.replyOnReply)}\n`;
    text += `محدودیت نرخ     ${s.ai.rateLimit}/min</pre>\n\n`;
    text += `<b>سه روش استفاده</b>\n\n`;
    text += `${D.b} ادمین‌ها: هر پیام (۱۲+ کاراکتر)\n`;
    text += `${D.b} اعضا: با منشن یا ریپلای\n`;
    text += `${D.b} یا <code>/ai سوال</code>`;
    return {
      text,
      keyboard: {
        inline_keyboard: [
          [{ text: D.toggleBtn(s.ai.enabled, 'فعال بودن AI'), callback_data: 't:ai:enabled' }],
          [{ text: D.toggleBtn(s.ai.replyToAdmins, 'پاسخ به ادمین‌ها'), callback_data: 't:ai:replyToAdmins' }],
          [{ text: D.toggleBtn(s.ai.replyOnMention, 'پاسخ به منشن'), callback_data: 't:ai:replyOnMention' }],
          [{ text: D.toggleBtn(s.ai.replyOnReply, 'پاسخ به ریپلای'), callback_data: 't:ai:replyOnReply' }],
          [{ text: '← بازگشت', callback_data: 'p:main' }],
        ],
      },
    };
  },

  // ─── ادامه در پیام بعدی ───
};
  async panelTriggers(ctx) {
    const t = await ctx.db.getTriggers(ctx.chat.id);
    let text = `<b>پاسخ خودکار</b>\n<blockquote>پاسخ خودکار به کلمات کلیدی</blockquote>\n\n`;
    text += `<blockquote>تعداد: <code>${t.length}</code></blockquote>\n\n`;
    if (t.length > 0) {
      text += `<b>لیست</b>\n\n`;
      t.slice(0, 8).forEach(tr => {
        text += `${D.b} <code>${Utils.escapeHtml(tr.keyword)}</code>\n`;
      });
      if (t.length > 8) text += `\n<i>و ${t.length - 8} مورد دیگر…</i>`;
    } else {
      text += `<i>هنوز چیزی اضافه نشده</i>`;
    }
    return {
      text,
      keyboard: {
        inline_keyboard: [
          [{ text: '➕  افزودن جدید', callback_data: 'a:addtrigger' }],
          [
            { text: '📋  لیست کامل', callback_data: 'l:triggers' },
            { text: '🗑  پاک همه', callback_data: 'c:triggers' },
          ],
          [{ text: '← بازگشت', callback_data: 'p:main' }],
        ],
      },
    };
  },

  panelXP(s) {
    let text = `<b>XP و بازی‌ها</b>\n<blockquote>سیستم پیشرفت کاربران</blockquote>\n\n`;
    text += `<pre>XP فعال        ${D.status(s.xp.enabled)}\n`;
    text += `XP هر پیام     ${s.xp.perMessage}\n`;
    text += `کول‌داون        ${s.xp.cooldown} ثانیه\n`;
    text += `اعلان سطح       ${D.status(s.xp.levelUpNotify)}\n`;
    text += `بازی‌ها          ${D.status(s.games.enabled)}</pre>`;
    return {
      text,
      keyboard: {
        inline_keyboard: [
          [{ text: D.toggleBtn(s.xp.enabled, 'XP'), callback_data: 't:xp:enabled' }],
          [{ text: D.toggleBtn(s.xp.levelUpNotify, 'اعلان سطح'), callback_data: 't:xp:levelUpNotify' }],
          [{ text: D.toggleBtn(s.games.enabled, 'بازی‌ها'), callback_data: 't:games:enabled' }],
          [
            { text: '−', callback_data: 'n:xpPerMsg:-1' },
            { text: `XP ${s.xp.perMessage}`, callback_data: 'noop' },
            { text: '+', callback_data: 'n:xpPerMsg:1' },
          ],
          [
            { text: '−', callback_data: 'n:xpCooldown:-10' },
            { text: `کول‌داون ${s.xp.cooldown}s`, callback_data: 'noop' },
            { text: '+', callback_data: 'n:xpCooldown:10' },
          ],
          [{ text: '← بازگشت', callback_data: 'p:main' }],
        ],
      },
    };
  },

  async panelNotes(ctx) {
    const n = await ctx.db.listNotes(ctx.chat.id);
    let text = `<b>یادداشت‌ها</b>\n<blockquote>متن‌های ذخیره‌شده گروه</blockquote>\n\n`;
    text += `<blockquote>تعداد: <code>${n.length}</code></blockquote>\n\n`;
    if (n.length > 0) {
      n.slice(0, 12).forEach(x => {
        text += `${D.b} <code>#${Utils.escapeHtml(x.name)}</code>\n`;
      });
    } else {
      text += `<i>هنوز یادداشتی نیست</i>`;
    }
    return {
      text,
      keyboard: {
        inline_keyboard: [
          [{ text: '➕  افزودن یادداشت', callback_data: 'a:addnote' }],
          [{ text: '🗑  پاک همه', callback_data: 'c:notes' }],
          [{ text: '← بازگشت', callback_data: 'p:main' }],
        ],
      },
    };
  },

  async panelAdmins(ctx) {
    const r = await ctx.api.getChatAdministrators(ctx.chat.id);
    let text = `<b>مدیران گروه</b>\n<blockquote>لیست کامل ادمین‌ها</blockquote>\n\n`;
    if (r.ok && r.result.length > 0) {
      const c = r.result.filter(a => a.status === 'creator');
      const a = r.result.filter(a => a.status === 'administrator' && !a.user.is_bot);
      const bots = r.result.filter(a => a.status === 'administrator' && a.user.is_bot);
      if (c.length) {
        text += `<b>👑 مالک</b>\n\n`;
        c.forEach(x => {
          text += `${D.b} ${Utils.mention(x.user)}\n`;
        });
        text += `\n`;
      }
      if (a.length) {
        text += `<b>⭐ ادمین‌ها (${a.length})</b>\n\n`;
        a.slice(0, 25).forEach(x => {
          text += `${D.b} ${Utils.mention(x.user)}\n`;
        });
        if (a.length > 25) text += `\n<i>و ${a.length - 25} ادمین دیگر…</i>\n`;
        text += `\n`;
      }
      if (bots.length) {
        text += `<b>🤖 ربات‌ها (${bots.length})</b>\n\n`;
        bots.slice(0, 5).forEach(x => {
          text += `${D.b} ${Utils.mention(x.user)}\n`;
        });
      }
    }
    return {
      text,
      keyboard: {
        inline_keyboard: [
          [
            { text: '🔄', callback_data: 'p:admins' },
            { text: '← بازگشت', callback_data: 'p:main' },
          ],
        ],
      },
    };
  },

  async panelStats(ctx) {
    const st = await ctx.db.getTodayStats(ctx.chat.id);
    const wk = await ctx.db.getWeekStats(ctx.chat.id);
    const title = Utils.escapeHtml(ctx.chat?.title || 'گروه');
    let text = `<b>آمار زنده</b>\n<blockquote>${title}</blockquote>\n\n`;
    text += `<b>امروز</b>\n\n`;
    text += `<pre>پیام      ${(st.messages || 0).toLocaleString('fa-IR')}\n`;
    text += `حذف       ${(st.deletions || 0).toLocaleString('fa-IR')}\n`;
    text += `بن        ${(st.bans || 0).toLocaleString('fa-IR')}\n`;
    text += `میوت      ${(st.mutes || 0).toLocaleString('fa-IR')}\n`;
    text += `اخطار     ${(st.warns || 0).toLocaleString('fa-IR')}</pre>\n\n`;
    text += `<b>هفت روز گذشته</b>\n\n<pre>`;
    const max = Math.max(...wk.map(w => w.messages), 1);
    const days = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش'];
    for (const w of wk) {
      const b = Math.round((w.messages / max) * 10);
      text += `\n${days[w.day]}  ${'█'.repeat(b)}${'░'.repeat(10 - b)}  ${w.messages}`;
    }
    text += `</pre>`;
    return {
      text,
      keyboard: {
        inline_keyboard: [
          [
            { text: '🔄', callback_data: 'p:stats' },
            { text: '← بازگشت', callback_data: 'p:main' },
          ],
        ],
      },
    };
  },

  async panelDashboard(ctx) {
    const token = await ctx.db.createDashboardToken(ctx.from.id);
    const workerUrl = ctx.env.WORKER_URL || '';
    const dashUrl = workerUrl
      ? `${workerUrl}/dashboard?token=${token}`
      : `https://your-worker.workers.dev/dashboard?token=${token}`;
    let text = `<b>داشبورد وب</b>\n<blockquote>لینک اختصاصی شما ${D.star}</blockquote>\n\n`;
    text += `${D.b} معتبر برای ۷ روز\n`;
    text += `${D.b} فقط شما دسترسی دارید\n`;
    text += `${D.b} آمار Real-time + نمودار\n\n`;
    text += `<i>${D.dot} لینک رو در جای امن نگه دار</i>`;
    return {
      text,
      keyboard: {
        inline_keyboard: [
          [{ text: '🌐  باز کردن داشبورد', url: dashUrl }],
          [{ text: '← بازگشت', callback_data: 'p:main' }],
        ],
      },
    };
  },

  async panelLogs(ctx) {
    const logs = await ctx.db.getLogs(ctx.chat.id, 20);
    let text = `<b>لاگ اقدامات</b>\n<blockquote>۲۰ اقدام آخر مدیریتی</blockquote>\n\n`;
    if (!logs.length) {
      text += `<i>هنوز اقداماتی ثبت نشده</i>`;
    } else {
      const actions = {
        ban: '⛔ بن', unban: '✓ آنبن', mute: '🔇 میوت', unmute: '🔊 آزاد',
        kick: '👋 کیک', warn: '⚠️ اخطار', del: '🗑 حذف', purge: '🧹 پاکسازی',
        settitle: '👑 لقب', ban_auto: '⛔ بن خودکار', poll: '📊 نظرسنجی',
        anti_channel: '🛡 ضد کانال', promote: '⬆️ ارتقا', demote: '⬇️ تنزل',
        fedban: '🌐 بن فدرال', gban: '🌐 بن سراسری', approve: '✓ تأیید', reject: '✗ رد',
        chain_ban: '⛓ بن زنجیره', chain_mute: '⛓ میوت زنجیره', chain_kick: '⛓ اخراج زنجیره',
      };
      text += `<pre>`;
      for (const l of logs.slice(0, 12)) {
        const act = actions[l.action] || l.action;
        const name = Utils.escapeHtml((l.target_name || 'کاربر').slice(0, 12));
        const when = Utils.formatTimestamp(l.created_at);
        text += `\n${act}\n${D.b} ${name} ${D.dot} ${when}`;
        if (l.details) text += `\n${D.b} ${Utils.escapeHtml(l.details.slice(0, 30))}`;
        text += `\n`;
      }
      text += `</pre>`;
    }
    return {
      text,
      keyboard: {
        inline_keyboard: [
          [
            { text: '🔄', callback_data: 'p:logs' },
            { text: '← بازگشت', callback_data: 'p:main' },
          ],
        ],
      },
    };
  },

  async panelReports(ctx) {
    const reports = await ctx.db.getReports(ctx.chat.id);
    let text = `<b>گزارش‌ها</b>\n<blockquote>در انتظار بررسی: <code>${reports.length}</code></blockquote>\n\n`;
    if (!reports.length) {
      text += `<i>گزارشی نیست</i>`;
    } else {
      text += `<pre>`;
      for (const r of reports.slice(0, 8)) {
        const rep = Utils.escapeHtml((r.reporter || 'کاربر').slice(0, 12));
        const reason = Utils.escapeHtml((r.reason || '').slice(0, 30));
        text += `\n#${r.id}  از ${rep}\n${D.b} ${reason}\n`;
      }
      text += `</pre>`;
      if (reports.length > 8) text += `\n<i>و ${reports.length - 8} گزارش دیگر…</i>`;
    }
    return {
      text,
      keyboard: {
        inline_keyboard: [
          [
            { text: '🔄', callback_data: 'p:reports' },
            { text: '← بازگشت', callback_data: 'p:main' },
          ],
        ],
      },
    };
  },

  async panelSchedule(ctx) {
    const list = await ctx.db.listScheduled(ctx.chat.id);
    let text = `<b>پیام‌های زمان‌بندی</b>\n<blockquote>${list.length} مورد فعال</blockquote>\n\n`;
    if (!list.length) {
      text += `<i>هیچ پیامی زمان‌بندی نشده</i>`;
    } else {
      text += `<pre>`;
      for (const s of list.slice(0, 8)) {
        text += `\n#${s.id}  ${Utils.formatTimestamp(s.send_at)}\n${D.b} ${Utils.escapeHtml(s.text.slice(0, 35))}`;
        if (s.repeat_interval) text += `\n${D.b} تکرار: هر ${Utils.formatDuration(s.repeat_interval)}`;
        text += `\n`;
      }
      text += `</pre>`;
    }
    text += `\n\n<i>برای افزودن بزن <code>زمان‌بندی</code></i>`;
    return {
      text,
      keyboard: {
        inline_keyboard: [
          [
            { text: '🔄', callback_data: 'p:schedule' },
            { text: '← بازگشت', callback_data: 'p:main' },
          ],
        ],
      },
    };
  },

  async panelExt(ctx) {
    const ext = await ctx.db.getChatExt(ctx.chat.id);
    let text = `<b>تنظیمات اضافی</b>\n<blockquote>قابلیت‌های ویژه</blockquote>\n\n`;
    text += `<pre>ضد کانال       ${D.status(ext.anti_channel)}\n`;
    text += `گزارش‌گیری      ${D.status(ext.reports_enabled)}\n`;
    text += `حالت تأیید      ${D.status(ext.approval_mode)}</pre>\n\n`;
    text += `<blockquote expandable>💡 <b>توضیحات</b>\n`;
    text += `<b>ضد کانال</b> — پیام‌های فوروارد از کانال خودکار حذف می‌شن\n`;
    text += `<b>گزارش‌گیری</b> — کاربران می‌تونن پیام‌های خاطی رو گزارش بدن\n`;
    text += `<b>حالت تأیید</b> — اعضای جدید باید توسط ادمین تأیید بشن (به‌جای کپچا)</blockquote>`;
    return {
      text,
      keyboard: {
        inline_keyboard: [
          [{ text: D.toggleBtn(ext.anti_channel, 'ضد کانال'), callback_data: 't:ext:anti_channel' }],
          [{ text: D.toggleBtn(ext.reports_enabled, 'گزارش‌گیری'), callback_data: 't:ext:reports_enabled' }],
          [{ text: D.toggleBtn(ext.approval_mode, 'حالت تأیید'), callback_data: 't:ext:approval_mode' }],
          [{ text: '← بازگشت', callback_data: 'p:main' }],
        ],
      },
    };
  },

  panelNight(s) {
    const n = s.nightMode;
    let text = `<b>حالت شب</b>\n<blockquote>سکوت خودکار در ساعات مشخص</blockquote>\n\n`;
    text += `<pre>وضعیت      ${D.status(n.enabled)}\n`;
    text += `از ساعت     ${n.from}:00\n`;
    text += `تا ساعت     ${n.to}:00\n`;
    text += `اقدام       ${n.action}</pre>\n\n`;
    text += `<i>در ساعات شب، کاربران عادی نمی‌تونن پیام بفرستن.</i>`;
    return {
      text,
      keyboard: {
        inline_keyboard: [
          [{ text: D.toggleBtn(n.enabled, 'فعال'), callback_data: 't:night:enabled' }],
          [
            { text: '−', callback_data: 'n:nightFrom:-1' },
            { text: `از ${n.from}:00`, callback_data: 'noop' },
            { text: '+', callback_data: 'n:nightFrom:1' },
          ],
          [
            { text: '−', callback_data: 'n:nightTo:-1' },
            { text: `تا ${n.to}:00`, callback_data: 'noop' },
            { text: '+', callback_data: 'n:nightTo:1' },
          ],
          [{ text: '← بازگشت', callback_data: 'p:main' }],
        ],
      },
    };
  },

  async panelRep(ctx) {
    const top = await ctx.db.getRepTop(ctx.chat.id, 5);
    let text = `<b>سیستم اعتبار</b>\n<blockquote>امتیازدهی به کاربران مفید</blockquote>\n\n`;
    text += `<i>با <code>+rep</code> و <code>-rep</code> روی پیام کاربر ریپلای کن</i>\n\n`;
    if (top.length) {
      text += `<b>پنج نفر برتر</b>\n\n`;
      const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
      top.forEach((u, i) => {
        text += `${medals[i]} <b>${Utils.escapeHtml(u.first_name || 'کاربر')}</b>  ${D.dot}  <code>${u.score}</code>\n`;
      });
    } else {
      text += `<i>هنوز کسی اعتبار نگرفته</i>`;
    }
    return {
      text,
      keyboard: { inline_keyboard: [[{ text: '← بازگشت', callback_data: 'p:main' }]] },
    };
  },

  async panelWarnChain(ctx) {
    const chain = await ctx.db.getWarnChain(ctx.chat.id);
    let text = `<b>زنجیره اخطار</b>\n<blockquote>اقدامات پله‌ای بر اساس تعداد اخطار</blockquote>\n\n`;
    if (chain.length) {
      text += `<pre>`;
      for (const c of chain) {
        text += `\n${c.step} اخطار → ${c.action}`;
        if (c.duration) text += ` (${Utils.formatDuration(c.duration)})`;
        text += `\n`;
      }
      text += `</pre>`;
    } else {
      text += `<i>هنوز زنجیره‌ای تنظیم نشده</i>\n\n`;
      text += `${D.b} پیش‌فرض: <code>${DEFAULT_SETTINGS.warnLimit}</code> اخطار → <code>${DEFAULT_SETTINGS.warnAction}</code>`;
    }
    return {
      text,
      keyboard: {
        inline_keyboard: [
          [{ text: '➕ افزودن پله', callback_data: 'a:addchain' }],
          [{ text: '🗑 پاک همه', callback_data: 'c:chain' }],
          [{ text: '← بازگشت', callback_data: 'p:main' }],
        ],
      },
    };
  },

  async panelAliases(ctx) {
    const list = await ctx.db.getAliases(ctx.chat.id);
    let text = `<b>گروه‌های نام‌گذاری</b>\n<blockquote>منشن گروهی کاربران</blockquote>\n\n`;
    if (list.length) {
      text += `<pre>`;
      for (const a of list) {
        text += `\n@${Utils.escapeHtml(a.name)}  ${D.dot}  ${a.count} عضو\n`;
      }
      text += `</pre>`;
    } else {
      text += `<i>هنوز نام‌گذاری‌ای ساخته نشده</i>\n\n`;
      text += `${D.b} برای ساخت: روی پیام کاربر ریپلای کن و بنویس <code>نام‌گذاری [نام]</code>`;
    }
    return {
      text,
      keyboard: { inline_keyboard: [[{ text: '← بازگشت', callback_data: 'p:main' }]] },
    };
  },

  // ═══════════════════════════════════════════════════════════
  //  INPUT PROMPTS & CAPTCHA
  // ═══════════════════════════════════════════════════════════
  inputPrompt(title, desc) {
    return `<b>${title}</b>\n<blockquote>${desc}</blockquote>\n\n<i>برای لغو: /cancel</i>`;
  },

  captchaButton(user, chat) {
    let text = `<b>تأیید انسانی</b>\n`;
    text += `<blockquote>${Utils.mention(user)}\n`;
    text += `به <b>${Utils.escapeHtml(chat.title)}</b> خوش آمدی!</blockquote>\n\n`;
    text += `برای تأیید انسان بودن، روی دکمه زیر بزن ${D.star}`;
    return {
      text,
      keyboard: { inline_keyboard: [[{ text: '✓  تأیید می‌کنم', callback_data: `cap:v:${user.id}` }]] },
    };
  },

  captchaMath(user, chat, cap) {
    let text = `<b>تأیید انسانی</b>\n`;
    text += `<blockquote>${Utils.mention(user)}\n`;
    text += `به <b>${Utils.escapeHtml(chat.title)}</b> خوش آمدی!</blockquote>\n\n`;
    text += `<b>پاسخ معادله زیر:</b>\n\n<pre>${cap.question} = ?</pre>`;
    const correct = parseInt(cap.answer);
    const opts = new Set([correct]);
    while (opts.size < 4) opts.add(correct + Math.floor(Math.random() * 10) - 5);
    const arr = [...opts].sort(() => Math.random() - 0.5);
    return {
      text,
      keyboard: {
        inline_keyboard: [
          arr.slice(0, 2).map(n => ({ text: String(n), callback_data: `cap:m:${user.id}:${n}` })),
          arr.slice(2, 4).map(n => ({ text: String(n), callback_data: `cap:m:${user.id}:${n}` })),
        ],
      },
    };
  },

  captchaEmoji(user, chat, cap) {
    let text = `<b>تأیید انسانی</b>\n`;
    text += `<blockquote>${Utils.mention(user)}\n`;
    text += `به <b>${Utils.escapeHtml(chat.title)}</b> خوش آمدی!</blockquote>\n\n`;
    text += `<b>کدام یک <code>${cap.question}</code> است؟</b>`;
    return {
      text,
      keyboard: { inline_keyboard: [cap.options.map(e => ({ text: e, callback_data: `cap:e:${user.id}:${e}` }))] },
    };
  },

  // ═══════════════════════════════════════════════════════════
  //  ACTION RESULTS
  // ═══════════════════════════════════════════════════════════
  actionBan(t, a, d, r) {
    const un = t?.first_name ? Utils.mention(t) : `<code>${t?.id || t}</code>`;
    let text = `<b>⛔ بن</b>\n`;
    text += `<blockquote>${un}\nاز گروه مسدود شد</blockquote>\n\n`;
    text += `<pre>مدت      ${Utils.formatDuration(d)}`;
    if (r && r !== 'بدون دلیل') text += `\nدلیل      ${Utils.escapeHtml(r)}`;
    text += `\nمجری     ${Utils.escapeHtml(a.first_name || 'ادمین')}</pre>`;
    return text;
  },
  actionMute(t, a, d, r) {
    const un = t?.first_name ? Utils.mention(t) : `<code>${t?.id || t}</code>`;
    let text = `<b>🔇 سکوت</b>\n`;
    text += `<blockquote>${un}\nساکت شد</blockquote>\n\n`;
    text += `<pre>مدت      ${Utils.formatDuration(d)}`;
    if (r && r !== 'بدون دلیل') text += `\nدلیل      ${Utils.escapeHtml(r)}`;
    text += `\nمجری     ${Utils.escapeHtml(a.first_name || 'ادمین')}</pre>`;
    return text;
  },
  actionKick(t, a) {
    const un = t?.first_name ? Utils.mention(t) : `<code>${t?.id || t}</code>`;
    return `<b>👋 اخراج</b>\n<blockquote>${un}\nاز گروه خارج شد</blockquote>\n\n<pre>مجری     ${Utils.escapeHtml(a.first_name || 'ادمین')}</pre>`;
  },
  actionWarn(t, a, c, l, r) {
    const un = t?.first_name ? Utils.mention(t) : `<code>${t?.id || t}</code>`;
    let text = `<b>⚠️ اخطار</b>\n`;
    text += `<blockquote>${un}\nاخطار گرفت</blockquote>\n\n`;
    text += `<pre>وضعیت    ${c} از ${l}`;
    if (r && r !== 'بدون دلیل') text += `\nدلیل      ${Utils.escapeHtml(r)}`;
    text += `\nمجری     ${Utils.escapeHtml(a.first_name || 'ادمین')}</pre>`;
    return text;
  },
  raidAlert(c, d) {
    let text = `<b>🚨 هشدار رید</b>\n`;
    text += `<blockquote><b>${c} عضو</b> در بازه کوتاه وارد شدند\nگروه خودکار قفل شد</blockquote>\n\n`;
    text += `<pre>مدت قفل   ${Utils.formatDuration(d)}\nوضعیت     حفاظت خودکار فعال</pre>`;
    return text;
  },
  success(m) { return `<b>${m}</b>`; },
  error(m) { return `<b>${m}</b>`; },
  info(m) { return `<i>${m}</i>`; },
  filterAlert(type) {
    const m = { link: 'لینک غیرمجاز', word: 'کلمه ممنوع', flood: 'فلود' };
    return `<b>${m[type] || 'پیام حذف شد'}</b>`;
  },

  // ═══════════════════════════════════════════════════════════
  //  PROFILE & LEADERBOARD
  // ═══════════════════════════════════════════════════════════
  async profile(ctx, targetUser = null) {
    const user = targetUser || ctx.from;
    const stats = await ctx.db.getUserStats(ctx.chat.id, user.id);
    const rank = await ctx.db.getUserRank(ctx.chat.id, user.id);
    const achs = await ctx.db.getUserAchievements(ctx.chat.id, user.id);
    const rep = await ctx.db.getRep(ctx.chat.id, user.id);
    const inv = await ctx.db.getInviteCount(ctx.chat.id, user.id);
    const t = Levels.getTitle(stats.level);
    const p = Levels.progressPercent(stats.xp);
    let text = `<b>کارت پروفایل</b>\n`;
    text += `<blockquote>${Utils.mention(user)}  ${t.icon}\n${t.name}</blockquote>\n\n`;
    text += `<pre>سطح        ${String(stats.level).padStart(2, '0')}\n`;
    text += `XP         ${stats.xp.toLocaleString('fa-IR')}\n`;
    text += `رتبه       #${rank || '—'}\n`;
    text += `پیام       ${stats.messages.toLocaleString('fa-IR')}\n`;
    text += `روز پیوسته  ${stats.streak_days}\n`;
    text += `اعتبار      ${rep || 0}\n`;
    text += `دعوت        ${inv?.count || 0}</pre>\n\n`;
    text += `<blockquote>پیشرفت تا سطح ${stats.level + 1}\n`;
    text += `<code>${Levels.progressBar(p)}</code>  ${Math.round(p)}%</blockquote>`;
    if (stats.games_played > 0) {
      text += `\n\n<b>بازی</b>\n<pre>کل    ${stats.games_played}\nبرد   ${stats.wins}\nباخت  ${stats.losses}</pre>`;
    }
    if (achs.length > 0) {
      text += `\n\n<b>دستاوردها</b>  ${D.dot}  <code>${achs.length} از ${Object.keys(ACHIEVEMENTS).length}</code>\n`;
      text += achs.slice(0, 12).map(a => ACHIEVEMENTS[a]?.icon || '🎖').join(' ');
    }
    return {
      text,
      keyboard: {
        inline_keyboard: [
          [
            { text: '🏆  برترین‌ها', callback_data: 'g:leaderboard' },
            { text: '🎖  دستاوردها', callback_data: `g:ach:${user.id}` },
          ],
          [{ text: '🎮  بازی‌ها', callback_data: 'g:games' }],
        ],
      },
    };
  },

  async leaderboard(ctx) {
    const top = await ctx.db.getLeaderboard(ctx.chat.id, 10);
    const title = Utils.escapeHtml(ctx.chat?.title || 'گروه');
    let text = `<b>برترین‌های گروه</b>\n<blockquote>${title}</blockquote>\n\n`;
    if (top.length === 0) {
      text += `<i>هنوز کسی XP نگرفته</i>`;
    } else {
      const m = ['🥇', '🥈', '🥉'];
      top.forEach((u, i) => {
        const md = m[i] || `${String(i + 1).padStart(2, ' ')}`;
        const n = Utils.escapeHtml(u.first_name || 'کاربر');
        const ti = Levels.getTitle(u.level);
        text += `${md}  <b>${n}</b>  ${ti.icon}\n`;
        text += `      <code>Lv.${u.level}</code> ${D.dot} <code>${u.xp.toLocaleString('fa-IR')} XP</code>\n\n`;
      });
    }
    return {
      text,
      keyboard: {
        inline_keyboard: [
          [
            { text: '🔄', callback_data: 'g:leaderboard' },
            { text: '← بازگشت', callback_data: 'g:profile' },
          ],
        ],
      },
    };
  },

  async achievements(ctx, uid) {
    const un = await ctx.db.getUserAchievements(ctx.chat.id, uid);
    let text = `<b>دستاوردها</b>\n\n`;
    text += `<blockquote>پیشرفت: <code>${un.length}</code> از <code>${Object.keys(ACHIEVEMENTS).length}</code></blockquote>\n\n`;
    for (const [k, a] of Object.entries(ACHIEVEMENTS)) {
      const h = un.includes(k);
      text += `${h ? a.icon : '🔒'}  <b>${a.name}</b>\n   <i>${a.desc}</i>\n\n`;
    }
    return {
      text,
      keyboard: { inline_keyboard: [[{ text: '← بازگشت', callback_data: 'g:profile' }]] },
    };
  },

  gamesMenu() {
    let text = `<b>بازی‌ها</b>\n<blockquote>یک بازی انتخاب کن</blockquote>`;
    return {
      text,
      keyboard: {
        inline_keyboard: [
          [
            { text: '🎯  حدس عدد', callback_data: 'g:play:guess' },
            { text: '✂️  سنگ کاغذ', callback_data: 'g:play:rps' },
          ],
          [
            { text: '🎰  اسلات', callback_data: 'g:play:slot' },
            { text: '🧠  مسابقه', callback_data: 'g:play:quiz' },
          ],
          [
            { text: '🎲  تاس', callback_data: 'g:play:dice' },
            { text: '⚡  سریع تایپ', callback_data: 'g:play:type' },
          ],
          [{ text: '← بازگشت', callback_data: 'g:profile' }],
        ],
      },
    };
  },

  levelUp(user, ol, nl) {
    const t = Levels.getTitle(nl);
    return `<b>${D.star} سطح جدید</b>\n<blockquote>${Utils.mention(user)}\n${t.icon}  <code>Lv.${ol}</code> ${D.arr} <code>Lv.${nl}</code></blockquote>\n\n<i>عنوان جدید: <b>${t.name}</b></i>`;
  },

  achievementUnlocked(user, a) {
    const ach = ACHIEVEMENTS[a];
    if (!ach) return '';
    return `<b>🎖 دستاورد جدید</b>\n<blockquote>${Utils.mention(user)}\n${ach.icon}  <b>${ach.name}</b>\n<i>${ach.desc}</i></blockquote>`;
  },

  // ═══════════════════════════════════════════════════════════
  //  FEDERATION
  // ═══════════════════════════════════════════════════════════
  async fedInfo(ctx, fed, chats, bans) {
    let text = `<b>🌐 فدراسیون ${Utils.escapeHtml(fed.name)}</b>\n`;
    text += `<blockquote>اطلاعات کامل فدراسیون</blockquote>\n\n`;
    text += `<pre>شناسه     ${fed.id}\n`;
    text += `مالک      ${fed.owner_id}\n`;
    text += `گروه‌ها   ${chats.length}\n`;
    text += `بن‌ها     ${bans.length}</pre>\n\n`;
    const chatIds = chats.slice(0, 10).map(c => `  ${D.b} <code>${c.chat_id}</code>`).join('\n');
    if (chatIds) {
      text += `<b>گروه‌های عضو</b>\n${chatIds}`;
    }
    return {
      text,
      keyboard: { inline_keyboard: [[{ text: '← بازگشت', callback_data: 'v:help_fed' }]] },
    };
  },

  async fedBanList(ctx, bans) {
    let text = `<b>لیست بن فدرال</b>\n<blockquote>${bans.length} کاربر مسدود</blockquote>\n\n`;
    if (!bans.length) {
      text += `<i>لیست خالیه</i>`;
    } else {
      text += `<pre>`;
      for (const b of bans.slice(0, 20)) {
        text += `\n${D.b} ${b.user_id}\n  ${Utils.escapeHtml((b.reason || 'بدون دلیل').slice(0, 30))}`;
      }
      text += `</pre>`;
    }
    return { text };
  },

  async gbanList(ctx, bans) {
    let text = `<b>لیست بن سراسری</b>\n<blockquote>${bans.length} کاربر مسدود در همه گروه‌ها</blockquote>\n\n`;
    if (!bans.length) {
      text += `<i>لیست خالیه</i>`;
    } else {
      text += `<pre>`;
      for (const b of bans.slice(0, 30)) {
        text += `\n${D.b} ${b.user_id}\n  ${Utils.escapeHtml((b.reason || 'بدون دلیل').slice(0, 30))}`;
      }
      text += `</pre>`;
    }
    return { text };
  },

  // ═══════════════════════════════════════════════════════════
  //  AGENTIC — Status Panel
  // ═══════════════════════════════════════════════════════════
  async statusPanel(ctx) {
    const title = Utils.escapeHtml(ctx.chat?.title || 'گروه');
    const s = await ctx.getSettings();
    const stats = await ctx.db.getTodayStats(ctx.chat.id);
    const count = await ctx.api.getChatMemberCount(ctx.chat.id);
    const members = count.ok ? count.result : 0;
    const now = new Date();
    const tehran = new Date(now.getTime() + (3.5 * 60 * 60 * 1000));
    const time = tehran.toISOString().slice(11, 16);
    const date = tehran.toISOString().slice(0, 10);

    let text = `<b>📡 وضعیت زنده</b>\n`;
    text += `<blockquote>${title}</blockquote>\n\n`;
    text += `<pre>🕐 زمان       ${time} (${date})\n`;
    text += `👥 اعضا       ${members.toLocaleString('fa-IR')}\n`;
    text += `💬 پیام امروز  ${(stats.messages || 0).toLocaleString('fa-IR')}\n`;
    text += `🗑 حذف        ${(stats.deletions || 0).toLocaleString('fa-IR')}\n`;
    text += `⛔ بن         ${(stats.bans || 0).toLocaleString('fa-IR')}\n`;
    text += `🔇 میوت       ${(stats.mutes || 0).toLocaleString('fa-IR')}</pre>\n\n`;
    text += `<b>وضعیت حفاظت</b>\n\n`;
    text += `${D.b} امنیت   ${s.antiLink && s.antiWord && s.antiFlood ? '🟢 فعال' : '🟡 جزئی'}\n`;
    text += `${D.b} کپچا    ${s.captcha.enabled ? '🟢 فعال' : '⚪ خاموش'}\n`;
    text += `${D.b} ضد رید  ${s.antiRaid ? '🟢 فعال' : '⚪ خاموش'}\n`;
    text += `${D.b} سکوت    ${s.shutup ? '🔴 فعال' : '⚪ خاموش'}\n\n`;
    text += `<blockquote expandable>${D.diamond} <b>پیام زنده</b>\n`;
    text += `این پیام هر ساعت به‌صورت خودکار به‌روزرسانی می‌شود.\n`;
    text += `برای خاموش کردن: <code>وضعیت خاموش</code>\n`;
    text += `آخرین به‌روزرسانی: ${Utils.formatTimestamp(Math.floor(Date.now() / 1000))}</blockquote>`;

    return {
      text,
      keyboard: {
        inline_keyboard: [
          [
            { text: '🔄  به‌روزرسانی', callback_data: 'p:status_refresh' },
            { text: '📊  آمار کامل', callback_data: 'p:stats' },
          ],
          [{ text: '← بازگشت', callback_data: 'p:main' }],
        ],
      },
    };
  },

  // ═══════════════════════════════════════════════════════════
  //  AGENTIC — Confirm Dangerous Action
  // ═══════════════════════════════════════════════════════════
  confirmAction(action, params, description) {
    const map = {
      purge: { icon: '🧹', title: 'پاکسازی گروهی', danger: 'high' },
      ban: { icon: '⛔', title: 'بن کاربر', danger: 'high' },
      kick: { icon: '👋', title: 'اخراج کاربر', danger: 'medium' },
      mute: { icon: '🔇', title: 'سکوت کاربر', danger: 'medium' },
      gban: { icon: '🌐', title: 'بن سراسری', danger: 'critical' },
      fedban: { icon: '🌐', title: 'بن فدرال', danger: 'critical' },
      shutdown: { icon: '💤', title: 'خاموشی ربات', danger: 'high' },
      lockdown: { icon: '🔒', title: 'قفل کامل گروه', danger: 'high' },
    };
    const info = map[action] || { icon: '⚠️', title: 'تأیید اقدام', danger: 'medium' };
    const dangerIcons = { low: '🟢', medium: '🟡', high: '🟠', critical: '🔴' };

    let text = `<b>${info.icon} ${info.title}</b>\n`;
    text += `<blockquote>${description}</blockquote>\n\n`;
    text += `<pre>سطح خطر    ${dangerIcons[info.danger]} ${info.danger.toUpperCase()}\n`;
    text += `اقدام      ${action}</pre>\n\n`;
    text += `<i>آیا مطمئنی؟ این اقدام فوراً اجرا می‌شود.</i>`;
    return {
      text,
      keyboard: {
        inline_keyboard: [
          [
            { text: '✓  تأیید و اجرا', callback_data: `confirm:${action}:yes:${params}` },
            { text: '✗  لغو', callback_data: 'confirm:cancel' },
          ],
        ],
      },
    };
  },
};

// ═══════════════════════════════════════════════════════════
//  NEXUS — Premium Views (v14.3 layer)
//  از worker.js اصلی منتقل شده — بدون حذف
// ═══════════════════════════════════════════════════════════

import { Utils } from '../lib/utils.js';
import { ACHIEVEMENTS } from '../config/constants.js';

export const NX_PREMIUM = {
  title(section) { return `<b>◈ NEXUS</b> <code>/ ${Utils.escapeHtml(section)}</code>`; },
  quote(text) { return `<blockquote>${text}</blockquote>`; },
  status(kind, text) {
    const icon = { ok:'●', live:'●', notice:'○', warn:'▲', danger:'◆', ai:'✦' }[kind] || '○';
    return `<b>${icon} ${Utils.escapeHtml(text)}</b>`;
  },
  card(section, title, subtitle='', rows=[], footer='') {
    const head = `${this.title(section)}\n\n<b>${Utils.escapeHtml(title)}</b>`;
    const sub = subtitle ? `\n${this.quote(Utils.escapeHtml(subtitle))}` : '';
    const body = rows.length ? `\n\n${rows.map(([k,v]) => `• <i>${Utils.escapeHtml(String(k))}</i>  <code>${Utils.escapeHtml(String(v))}</code>`).join('\n')}` : '';
    return `${head}${sub}${body}${footer ? `\n\n<i>${Utils.escapeHtml(footer)}</i>` : ''}`;
  },
  success(title='انجام شد', detail='تغییرات ذخیره و اعمال شد.') { return this.card('SUCCESS',title,detail); },
  notice(title, detail='') { return this.card('NOTICE',title,detail); },
  warning(title, detail='') { return this.card('WARNING',title,detail); },
  error(title='انجام نشد', detail='دسترسی ربات و تنظیمات گروه را بررسی کنید.') { return this.card('ERROR',title,detail); },
  back(to='nx:home') { return { text:'← بازگشت', callback_data:to }; },
  primary(text, data) { return { text:`${text}`, callback_data:data }; },
};

export const NX_PREMIUM_VIEWS = {
  async home(ctx) {
    const stats = await ctx.db.getTodayStats(ctx.chat.id);
    const title = Utils.escapeHtml(ctx.chat?.title || 'گروه');
    const s = await ctx.getSettings();
    const shield = s.defense?.enabled === false ? 'Standby' : 'Active';
    const cases = await ctx.db.first(`SELECT COUNT(*) AS c FROM moderation_cases WHERE chat_id=? AND status IN ('open','reviewing','appealed')`,[ctx.chat.id]).catch(()=>null);
    const open = Number(cases?.c || 0);
    const text = `${NX_PREMIUM.title('OVERVIEW')}\n\n<b>${title}</b>\n${NX_PREMIUM.quote(`${NX_PREMIUM.status(shield==='Active'?'ok':'notice',shield==='Active'?'محافظت فعال است':'محافظت نیاز به بررسی دارد')}\n${open ? `${open} مورد نیازمند بررسی` : 'اقدام فوری لازم نیست'}`)}\n\n<b>امروز</b>\n• <i>پیام‌ها</i>  <code>${Number(stats.messages||0).toLocaleString('fa-IR')}</code>\n• <i>اقدام‌های محافظتی</i>  <code>${Number(stats.deletions||0).toLocaleString('fa-IR')}</code>\n• <i>پرونده‌های باز</i>  <code>${open}</code>`;
    return { text, keyboard:{inline_keyboard:[
      [{text:'🛡 محافظت',callback_data:'nxa:protect'},{text:'⚡ اتوماسیون',callback_data:'nxa:automate'}],
      [{text:'👥 جامعه',callback_data:'nxa:community'},{text:'◈ تحلیل',callback_data:'nxa:insights'}],
      [{text:'اقدام سریع',callback_data:'nxa:quick'},{text:'تنظیمات پیشرفته',callback_data:'nxa:advanced'}],
    ]} };
  },
  protect() {
    const text=NX_PREMIUM.card('PROTECT','امنیت گروه','کنترل‌های اصلی در یک نگاه.',[
      ['Shield','Smart protection'],['Content','Media · links · forwards'],['Verification','Captcha & newcomer flow'],['Emergency','Incident Center'],
    ]);
    return {text,keyboard:{inline_keyboard:[
      [{text:'مدیریت Shield',callback_data:'nx:defense'},{text:'Incident Center',callback_data:'v14i:panel'}],
      [{text:'فیلترها',callback_data:'p:security'},{text:'قفل محتوا',callback_data:'p:locks'}],
      [{text:'کپچا',callback_data:'p:captcha'},{text:'ضد رید',callback_data:'p:raid'}],
      [{text:'← بازگشت',callback_data:'nxa:home'}]
    ]}};
  },
  automate() {
    const text=NX_PREMIUM.card('AUTOMATE','اتوماسیون','پیام‌ها و جریان‌های تکراری را بدون شلوغی مدیریت کن.',[
      ['Welcome','Onboarding'],['Smart replies','Triggers'],['Scheduled posts','Delivery queue'],['Night mode','Quiet hours'],
    ]);
    return {text,keyboard:{inline_keyboard:[
      [{text:'خوش‌آمد',callback_data:'p:welcome'},{text:'پاسخ‌های هوشمند',callback_data:'p:triggers'}],
      [{text:'زمان‌بندی',callback_data:'p:schedule'},{text:'حالت شب',callback_data:'p:night'}],
      [{text:'یادداشت‌ها',callback_data:'p:notes'},{text:'AI',callback_data:'p:ai'}],
      [{text:'← بازگشت',callback_data:'nxa:home'}]
    ]}};
  },
  community() {
    const text=NX_PREMIUM.card('COMMUNITY','جامعه','تعامل، شناخت اعضا و رشد گروه.',[
      ['Progress','XP · level · ranks'],['Recognition','Reputation & achievements'],['Engagement','Games & events'],['Members','Aliases & invites'],
    ]);
    return {text,keyboard:{inline_keyboard:[
      [{text:'XP و رتبه',callback_data:'p:xp'},{text:'اعتبار',callback_data:'p:rep'}],
      [{text:'بازی‌ها',callback_data:'g:games'},{text:'دعوت‌ها',callback_data:'v:help_fun'}],
      [{text:'نام‌ها',callback_data:'p:aliases'},{text:'مدیران',callback_data:'p:admins'}],
      [{text:'← بازگشت',callback_data:'nxa:home'}]
    ]}};
  },
  insights() {
    const text=NX_PREMIUM.card('INSIGHTS','بینش و نظارت','داده‌های لازم برای تصمیم سریع و دقیق.',[
      ['Live status','Health & activity'],['Analytics','Growth & moderation'],['Review','Reports & cases'],['Audit','System activity'],
    ]);
    return {text,keyboard:{inline_keyboard:[
      [{text:'وضعیت زنده',callback_data:'p:statusrefresh'},{text:'تحلیل',callback_data:'nx:analytics'}],
      [{text:'پرونده‌ها',callback_data:'v14c:queue:open'},{text:'گزارش‌ها',callback_data:'p:reports'}],
      [{text:'لاگ‌ها',callback_data:'p:logs'},{text:'داشبورد',callback_data:'v:dashboard'}],
      [{text:'← بازگشت',callback_data:'nxa:home'}]
    ]}};
  },
  quick() {
    const text=NX_PREMIUM.card('QUICK ACTIONS','اقدام سریع','برای وضعیت‌های فوری؛ اقدامات حساس از مسیر تأیید انجام می‌شوند.');
    return {text,keyboard:{inline_keyboard:[
      [{text:'Incident Center',callback_data:'v14i:panel'},{text:'پرونده‌های باز',callback_data:'v14c:queue:open'}],
      [{text:'وضعیت گروه',callback_data:'p:statusrefresh'},{text:'حفاظت',callback_data:'nx:defense'}],
      [{text:'پیام زمان‌بندی‌شده',callback_data:'p:schedule'},{text:'بازگشت',callback_data:'nxa:home'}]
    ]}};
  },
  advanced() {
    const text=NX_PREMIUM.card('ADVANCED','تنظیمات پیشرفته','قابلیت‌های کامل NEXUS بدون شلوغ‌کردن صفحهٔ اصلی.',[
      ['Admin control','Roles & permissions'],['Data','Backup & records'],['Network','Federation'],['System','Language & extensions'],
    ]);
    return {text,keyboard:{inline_keyboard:[
      [{text:'دسترسی‌ها',callback_data:'p:admins'},{text:'زنجیره اخطار',callback_data:'p:warnchain'}],
      [{text:'بکاپ',callback_data:'p:ext'},{text:'فدراسیون',callback_data:'v:help_fed'}],
      [{text:'تنظیمات',callback_data:'p:ext'},{text:'پنل قدیمی',callback_data:'p:main'}],
      [{text:'← بازگشت',callback_data:'nxa:home'}]
    ]}};
  },
};

// ── Callback Handler ──
export async function nxPremiumCallback(ctx) {
  const d=ctx.text||'';
  if(!d.startsWith('nxa:')) return false;
  if(!ctx.isGroup()) { await ctx.answer('این بخش فقط در گروه در دسترس است.',true); return true; }
  if(!(await ctx.isAdmin())) { await ctx.answer('فقط ادمین‌ها به این بخش دسترسی دارند.',true); return true; }
  const area=d.slice(4);
  const factory={home:'home',protect:'protect',automate:'automate',community:'community',insights:'insights',quick:'quick',advanced:'advanced'}[area];
  if(!factory) { await ctx.answer('این بخش در دسترس نیست.',true); return true; }
  const v=await NX_PREMIUM_VIEWS[factory](ctx);
  await ctx.editText(v.text,{reply_markup:v.keyboard});
  await ctx.answer();
  return true;
}

// ── Command Handler ──
export async function nxPremiumCommand(ctx) {
  if(!ctx.text||!ctx.isGroup()) return false;
  const cmd=ctx.text.trim().toLowerCase().split(/\s+/)[0].split('@')[0];
  if(!['/nexus','/panel','/command','/commandcenter','پنل','نکسوس'].includes(cmd)) return false;
  if(!(await ctx.isAdmin())) { await ctx.reply(NX_PREMIUM.error('دسترسی کافی ندارید','این پنل برای مدیران گروه است.')); return true; }
  const v=await NX_PREMIUM_VIEWS.home(ctx);
  await ctx.send(v.text,{reply_markup:v.keyboard});
  return true;
}

// ── Premium message wrappers ──
export function nxMessageSuccess(title, detail) { return NX_PREMIUM.success(title,detail); }
export function nxMessageWarning(title, detail) { return NX_PREMIUM.warning(title,detail); }
export function nxMessageError(title, detail) { return NX_PREMIUM.error(title,detail); }
export function nxMessageNotice(title, detail) { return NX_PREMIUM.notice(title,detail); }

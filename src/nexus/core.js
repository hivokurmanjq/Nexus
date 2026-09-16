// ═══════════════════════════════════════════════════════════
//  NEXUS CORE — Final Product Layer
//  از worker.js اصلی منتقل شده — بدون حذف
// ═══════════════════════════════════════════════════════════

import { Utils } from '../lib/utils.js';
import { Log } from '../lib/log.js';
import { NEXUS_CORE, NEXUS_LABELS } from '../config/constants.js';
import { Views } from '../views/index.js';

// ─── Helpers ───
function nxNow() { return Math.floor(Date.now() / 1000); }
function nxClamp(n, a=0, b=100) { return Math.max(a, Math.min(b, Number(n) || 0)); }
function nxStatus(score) {
  score = nxClamp(score);
  if (score >= 85) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 30) return 'watch';
  return 'normal';
}
function nxStatusFa(score) { return NEXUS_LABELS.fa[nxStatus(score)] || 'عادی'; }
function nxBadge(score) {
  const st = nxStatus(score);
  return st === 'critical' ? '◆ بحرانی' : st === 'high' ? '▲ پرریسک' : st === 'watch' ? '● تحت نظر' : '○ عادی';
}
function nxHash(value) {
  const str = String(value || '');
  let h = 2166136261;
  for (let i=0;i<str.length;i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
}

// ─── Risk patterns ───
export const NEXUS_RISK = {
  suspiciousDomains: new Set([
    'bit.ly','tinyurl.com','t.co','cutt.ly','is.gd','rb.gy','goo.gl',
    'grabify.link','iplogger.org','2no.co','yip.su','web.telegram.org',
  ]),
  scamWords: [
    'free crypto','double your','claim now','airdrop','giveaway','investment profit',
    'seed phrase','private key','wallet connect','verify account','urgent verify',
    'برداشت جایزه','سود تضمینی','سرمایه گذاری تضمینی','کیف پول','عبارت بازیابی',
    'رمز ارز رایگان','جایزه رایگان','تأیید حساب','فوری تأیید کن',
  ],
  threatWords: ['bomb','kill','murder','terror','بمب','کشتن','قتل','تروریست'],
  spamWords: ['buy followers','cheap followers','promo','advertise here','تبلیغ','فالوور ارزان','فروش اکانت'],
  obfuscation: /[\u200b-\u200f\u202a-\u202e\ufeff]/g,
  repeated: /(.)\1{7,}/u,
  url: /(https?:\/\/[^\s]+|www\.[^\s]+|t\.me\/[^\s]+)/gi,
};

// ─── Signal extraction ───
export function nxSignals(ctx) {
  const text = String(ctx.text || ctx.message?.caption || '');
  const normalized = Utils.normalize(text);
  const urls = Utils.extractUrls(text);
  const domains = urls.map(u => Utils.extractDomain(u)).filter(Boolean);
  const letters = (text.match(/[\p{L}]/gu) || []).length;
  const upper = (text.match(/[A-Z]/g) || []).length;
  const exclam = (text.match(/!/g) || []).length;
  const repeated = NEXUS_RISK.repeated.test(text);
  const scam = NEXUS_RISK.scamWords.filter(w => normalized.includes(Utils.normalize(w)));
  const spam = NEXUS_RISK.spamWords.filter(w => normalized.includes(Utils.normalize(w)));
  const threats = NEXUS_RISK.threatWords.filter(w => normalized.includes(Utils.normalize(w)));
  const riskyDomains = domains.filter(d => NEXUS_RISK.suspiciousDomains.has(d));
  let score = 0;
  const reasons = [];
  if (urls.length) { score += Math.min(22, urls.length * 9); reasons.push('link'); }
  if (riskyDomains.length) { score += 28; reasons.push('suspicious-domain'); }
  if (scam.length) { score += 42; reasons.push('scam-language'); }
  if (spam.length) { score += 26; reasons.push('spam-language'); }
  if (threats.length) { score += 34; reasons.push('threat-language'); }
  if (repeated) { score += 18; reasons.push('repeat-pattern'); }
  if (letters > 25 && upper / Math.max(1, letters) > .75) { score += 10; reasons.push('caps'); }
  if (exclam >= 8) { score += 8; reasons.push('excess-punctuation'); }
  if (text.length > 1500) { score += 6; reasons.push('long-message'); }
  if ((text.match(/@/g) || []).length >= 6) { score += 18; reasons.push('mention-burst'); }
  if (NEXUS_RISK.obfuscation.test(text)) { score += 10; reasons.push('obfuscation'); }
  if (ctx.from?.is_bot) { score += 12; reasons.push('bot-account'); }
  return { score: nxClamp(score), status: nxStatus(score), reasons, urls, domains, scam, spam, threats };
}

// ─── Defense Layer ───
export const NEXUS_DEFENSE = {
  async analyze(ctx, settings) {
    const base = nxSignals(ctx);
    const out = { ...base, ai: null, action: 'allow', confidence: 0.55 };
    if (!ctx.isGroup() || !ctx.from || !ctx.text) return out;
    const admin = await ctx.isAdmin().catch(() => false);
    if (admin) { out.score = 0; out.status = 'normal'; out.reasons = ['trusted-admin']; out.action = 'allow'; return out; }
    const gs = settings?.defense || {};
    if (gs.enabled === false) return out;
    if (base.status === 'critical') out.action = gs.criticalAction || 'ban';
    else if (base.status === 'high') out.action = gs.highAction || 'delete_warn';
    else if (base.status === 'watch') out.action = gs.watchAction || 'delete';
    out.confidence = base.score >= 60 ? 0.88 : base.score >= 30 ? 0.72 : 0.58;
    return out;
  },
  async apply(ctx, result, settings) {
    if (!ctx.isGroup() || !ctx.from || result.action === 'allow') return false;
    const cid = ctx.chat.id, uid = ctx.from.id, mid = ctx.message?.message_id;
    if (result.action === 'delete' || result.action === 'delete_warn') {
      if (mid) await ctx.api.deleteMessage(cid, mid);
      ctx.ctx.waitUntil(ctx.db.incrementStat(cid, 'deletions'));
    }
    if (result.action === 'delete_warn' || (result.action === 'warn' && result.score >= 70)) {
      const count = await ctx.db.addWarn(cid, uid, ctx.from.id, `NEXUS: ${result.reasons.join(', ')}`);
      const lim = settings.warnLimit || 3;
      if (count >= lim) {
        await ctx.api.restrictMember(cid, uid, { can_send_messages: false });
        ctx.ctx.waitUntil(ctx.db.incrementStat(cid, 'mutes'));
      }
      ctx.ctx.waitUntil(ctx.db.incrementStat(cid, 'warns'));
    }
    if (result.action === 'ban' && result.score >= 85) {
      await ctx.api.banMember(cid, uid);
      ctx.ctx.waitUntil(ctx.db.incrementStat(cid, 'bans'));
    }
    ctx.ctx.waitUntil(ctx.db.logAction(cid, ctx.from.id, uid, 'nexus_defense', JSON.stringify({score:result.score,reasons:result.reasons,action:result.action})));
    return true;
  },
};

// ─── AI Classifier ───
export const NEXUS_AI = {
  async classify(env, payload) {
    if (!env?.AI || !payload?.text) return null;
    try {
      const model = env.NEXUS_AI_MODEL || NEXUS_CORE.aiModel;
      const prompt = [
        'You are the NEXUS Telegram community security classifier.',
        'Return JSON only: {"label":"safe|spam|scam|phishing|harassment|threat|nsfw|unknown","score":0-100,"reason":"short"}.',
        'Do not invent facts. Analyze only the supplied message.',
        `Message: ${String(payload.text).slice(0, 1800)}`,
      ].join('\n');
      const r = await env.AI.run(model, { prompt, max_tokens: 180 });
      const raw = typeof r === 'string' ? r : (r?.response || r?.output_text || JSON.stringify(r));
      const m = String(raw).match(/\{[\s\S]*\}/);
      return m ? Utils.safeJson(m[0], null) : null;
    } catch (e) {
      Log.warn('nexus_ai_classify', { err: e.message });
      return null;
    }
  },
  async enrich(ctx, base) {
    if (!ctx.isGroup() || !ctx.text || base.score < 25) return base;
    const ai = await this.classify(ctx.env, { text: ctx.text });
    if (!ai) return base;
    const n = nxClamp(Number(ai.score));
    const boost = Math.round(n * 0.45);
    const score = nxClamp(Math.max(base.score, base.score + boost));
    return { ...base, ai: { label: ai.label || 'unknown', score: n, reason: ai.reason || '' }, score, status: nxStatus(score), confidence: Math.max(base.confidence || .5, .8) };
  },
};

// ─── Observability ───
export const NEXUS_OBSERVABILITY = {
  async event(ctx, type, data={}) {
    if (!ctx?.db || !ctx.chat?.id) return;
    const payload = JSON.stringify(data).slice(0, 1800);
    try {
      await ctx.db.execute(
        `INSERT INTO nexus_events (chat_id,user_id,event_type,score,payload,created_at) VALUES (?,?,?,?,?,unixepoch())`,
        [ctx.chat.id, ctx.from?.id || null, type, Number(data.score || 0), payload]
      );
    } catch {}
  },
  async threat(ctx, result) {
    return this.event(ctx, 'threat', { score: result.score, status: result.status, reasons: result.reasons, ai: result.ai });
  },
};

// ─── Analytics ───
export const NEXUS_ANALYTICS = {
  async overview(db, cid) {
    const today = await db.getTodayStats(cid);
    const week = await db.getWeekStats(cid);
    let threats = 0, high = 0, critical = 0;
    try {
      const r = await db.first(`SELECT COUNT(*) c, SUM(CASE WHEN score>=60 THEN 1 ELSE 0 END) high, SUM(CASE WHEN score>=85 THEN 1 ELSE 0 END) critical FROM nexus_events WHERE chat_id=? AND created_at>=unixepoch()-86400`, [cid]);
      threats = r?.c || 0; high = r?.high || 0; critical = r?.critical || 0;
    } catch {}
    return { today, week, threats, high, critical };
  },
};

// ─── UI ───
export const NEXUS_UI = {
  esc: Utils.escapeHtml,
  line(label, value, width=14) { return `<code>${String(label).padEnd(width, ' ')} ${value}</code>`; },
  state(score) { return `${nxBadge(score)}  <code>${Math.round(score)}/100</code>`; },
  divider: '<code>────────────────────────</code>',
  home(ctx, metrics={}) {
    const score = Number(metrics.score || 0);
    const group = ctx?.chat?.title || 'NEXUS';
    let text = `<b>◈ NEXUS</b>  <i>Community Intelligence OS</i>\n`;
    text += `${this.divider}\n`;
    text += `<b>${this.esc(group)}</b>\n`;
    text += `${this.state(score)}\n\n`;
    text += this.line('DEFENSE', metrics.defense ?? 'ACTIVE') + '\n';
    text += this.line('INTELLIGENCE', metrics.ai ?? 'READY') + '\n';
    text += this.line('THREATS 24H', metrics.threats ?? 0) + '\n';
    text += this.line('MESSAGES', metrics.messages ?? 0) + '\n\n';
    text += `<i>یک مرکز فرماندهی. تمام جامعه، از یک نقطه.</i>`;
    return {
      text,
      keyboard: { inline_keyboard: [
        [{text:'🛡  دفاع',callback_data:'nx:defense'},{text:'🧠  هوش',callback_data:'nx:intel'}],
        [{text:'👮  مدیریت',callback_data:'nx:moderation'},{text:'⚡  اتوماسیون',callback_data:'nx:automation'}],
        [{text:'👥  جامعه',callback_data:'nx:community'},{text:'📊  تحلیل',callback_data:'nx:analytics'}],
        [{text:'⚙  سیستم',callback_data:'nx:system'},{text:'↻  بروزرسانی',callback_data:'nx:home'}],
      ]}
    };
  },
  card(title, subtitle, rows, keyboard=[]) {
    let text = `<b>◈ ${title}</b>\n<i>${subtitle}</i>\n${this.divider}\n`;
    for (const r of rows) text += `${this.line(r[0], r[1])}\n`;
    return { text, keyboard:{inline_keyboard: [...keyboard, [{text:'‹ NEXUS',callback_data:'nx:home'}]]} };
  },
};

// ─── Metrics helper ───
export async function nxMetrics(ctx) {
  if (!ctx?.chat?.id) return {};
  const stats = await NEXUS_ANALYTICS.overview(ctx.db, ctx.chat.id);
  let score = 0;
  try {
    const r = await ctx.db.first(`SELECT MAX(score) score FROM nexus_events WHERE chat_id=? AND created_at>=unixepoch()-86400`, [ctx.chat.id]);
    score = r?.score || 0;
  } catch {}
  return { score, threats: stats.threats, messages: stats.today.messages || 0, defense: score >= 60 ? 'WATCH' : 'ACTIVE', ai: ctx.env.AI ? 'READY' : 'RULES' };
}

// ─── Panel router ───
export async function nxPanel(ctx, area) {
  const cid = ctx.chat.id;
  if (area === 'home') return NEXUS_UI.home(ctx, await nxMetrics(ctx));
  if (area === 'defense') {
    const s = await ctx.getSettings();
    const a = s.defense || {};
    return NEXUS_UI.card('DEFENSE GRID','امنیت چندلایه و واکنش تطبیقی',[
      ['ENGINE', a.enabled === false ? 'OFF' : 'ACTIVE'],['MODE', a.mode || 'ADAPTIVE'],
      ['WATCH', a.watchAction || 'DELETE'],['HIGH', a.highAction || 'DELETE + WARN'],['CRITICAL', a.criticalAction || 'BAN'],
      ['RAID', s.antiRaid ? 'ACTIVE' : 'OFF'],['CAPTCHA', s.captcha?.enabled ? 'ACTIVE' : 'OFF'],['ANTI-LINK', s.antiLink ? 'ACTIVE' : 'OFF'],
    ], [[{text:'◉ فعال/خاموش',callback_data:'nx:toggle_defense'},{text:'⚡ وضعیت زنده',callback_data:'nx:risk'}]]);
  }
  if (area === 'intel') {
    return NEXUS_UI.card('INTELLIGENCE','AI + rules + signal fusion',[
      ['AI', ctx.env.AI ? 'READY' : 'RULE ENGINE'],['CLASSIFIER','SPAM / SCAM / PHISHING'],['SIGNALS','LINK · FLOOD · BEHAVIOR'],['CONFIDENCE','ADAPTIVE'],['STREAM','DRAFT READY'],
    ], [[{text:'🧠 تست هوش',callback_data:'nx:ai_test'},{text:'◈ تهدیدها',callback_data:'nx:analytics'}]]);
  }
  if (area === 'moderation') {
    return NEXUS_UI.card('MODERATION','کنترل سریع و کم‌اصطکاک',[
      ['WARN', 'CHAIN'],['MUTE','TEMPORARY / CUSTOM'],['BAN','INSTANT / CONFIRMED'],['PURGE','BULK'],['REPORTS','REVIEW QUEUE'],['LOGS','AUDIT TRAIL'],
    ], [[{text:'📥 گزارش‌ها',callback_data:'p:reports'},{text:'📜 لاگ',callback_data:'p:logs'}],[{text:'🧹 پاکسازی',callback_data:'nx:purge_help'}]]);
  }
  if (area === 'automation') {
    return NEXUS_UI.card('AUTOMATION','اتوماسیون بدون گم‌شدن در منو',[
      ['TRIGGERS','SMART'],['SCHEDULE','ACTIVE'],['NOTES','READY'],['NIGHT MODE','READY'],['WELCOME','READY'],['PIN STATUS','READY'],
    ], [[{text:'⚡ تریگرها',callback_data:'p:triggers'},{text:'🗓 زمان‌بندی',callback_data:'p:schedule'}]]);
  }
  if (area === 'community') {
    return NEXUS_UI.card('COMMUNITY','انگیزه، هویت و مشارکت',[
      ['XP','ENABLED'],['LEVELS','1 → 100'],['ACHIEVEMENTS','18'],['GAMES','ENABLED'],['REPUTATION','ENABLED'],['FEDERATION','READY'],
    ], [[{text:'🏆 رتبه‌بندی',callback_data:'p:xp'},{text:'💎 اعتبار',callback_data:'p:rep'}]]);
  }
  if (area === 'analytics') {
    const a = await NEXUS_ANALYTICS.overview(ctx.db, cid);
    return NEXUS_UI.card('ANALYTICS','تصمیم‌گیری بر اساس سیگنال واقعی',[
      ['MESSAGES TODAY',a.today.messages||0],['DELETIONS',a.today.deletions||0],['BANS',a.today.bans||0],['THREATS 24H',a.threats],['HIGH RISK',a.high],['CRITICAL',a.critical],
    ], [[{text:'↻ بروزرسانی',callback_data:'nx:analytics'}]]);
  }
  if (area === 'system') {
    return NEXUS_UI.card('SYSTEM','هسته و اتصال‌ها',[
      ['WORKER','ONLINE'],['D1',ctx.env.DB?'CONNECTED':'MISSING'],['KV',ctx.env.CACHE?'CONNECTED':'MISSING'],['AI',ctx.env.AI?'CONNECTED':'OPTIONAL'],['WEBHOOK','ACTIVE'],['BUILD','FINAL'],
    ], [[{text:'🌐 داشبورد',callback_data:'v:dashboard'},{text:'⚙ تنظیمات',callback_data:'p:main'}]]);
  }
  if (area === 'risk') {
    const m = await nxMetrics(ctx);
    return NEXUS_UI.card('LIVE RISK','تصویر لحظه‌ای از وضعیت تهدید',[
      ['RISK',nxBadge(m.score)],['THREATS 24H',m.threats],['DEFENSE',m.defense],['AI',m.ai],['LAST SCORE',m.score],
    ], [[{text:'🛡 دفاع',callback_data:'nx:defense'}]]);
  }
  return NEXUS_UI.home(ctx, await nxMetrics(ctx));
}

// ─── Callback Handler ───
export async function nxHandleCallback(ctx, d) {
  if (!d.startsWith('nx:')) return false;
  if (!ctx.isGroup()) { await ctx.answer('فقط در گروه', true); return true; }
  if (!(await ctx.isAdmin())) { await ctx.answer('فقط ادمین‌ها', true); return true; }
  const area = d.slice(3);
  if (area === 'toggle_defense') {
    const s = await ctx.updateSettings(x => { x.defense = x.defense || {}; x.defense.enabled = x.defense.enabled === false; return x; });
    const v = await nxPanel(ctx, 'defense'); await ctx.editText(v.text,{reply_markup:v.keyboard}); await ctx.answer('✓ ذخیره شد'); return true;
  }
  if (area === 'ai_test') {
    const r = await NEXUS_AI.classify(ctx.env,{text:'NEXUS AI security test'});
    await ctx.answer(r ? `AI: ${r.label || 'ready'}` : 'AI در دسترس نیست', !r); return true;
  }
  if (area === 'purge_help') { await ctx.answer('برای پاکسازی از /purge یا قابلیت پاکسازی پنل استفاده کن'); return true; }
  const v = await nxPanel(ctx, area); await ctx.editText(v.text,{reply_markup:v.keyboard}); await ctx.answer(); return true;
}

// ─── Command Handler ───
export async function nxHandleCommand(ctx) {
  if (!ctx.text || !ctx.text.startsWith('/')) return false;
  const cmd = ctx.text.trim().split(/\s+/)[0].split('@')[0].toLowerCase();
  const map = {
    '/nexus':'home','/panel':'home','/status':'risk','/defense':'defense','/security':'defense',
    '/intelligence':'intel','/intel':'intel','/moderation':'moderation','/automation':'automation',
    '/community':'community','/analytics':'analytics','/system':'system','/app':'system',
  };
  if (!map[cmd]) return false;
  if (ctx.isGroup() && !(await ctx.isAdmin())) { await ctx.send('<i>فقط ادمین‌ها</i>'); return true; }
  if (map[cmd] === 'home') { const v=await nxPanel(ctx,'home'); await ctx.send(v.text,{reply_markup:v.keyboard}); return true; }
  const v=await nxPanel(ctx,map[cmd]); await ctx.send(v.text,{reply_markup:v.keyboard}); return true;
}

// ─── Security Pipeline ───
export async function nexusSecurityPipeline(ctx) {
  if (!ctx.isGroup() || !ctx.from || !ctx.text) return false;
  if (await ctx.db.nexusTrusted(ctx.chat.id, ctx.from.id).catch(()=>null)) return false;
  const s = await ctx.getSettings();
  let result = await NEXUS_DEFENSE.analyze(ctx, s);
  // AI enrichment never the sole reason for ban
  if (result.score >= 25 && ctx.env.AI) result = await NEXUS_AI.enrich(ctx, result);
  ctx.nexusRisk = result;
  if (result.score >= 25) {
    ctx.ctx.waitUntil(NEXUS_OBSERVABILITY.threat(ctx,result));
    ctx.ctx.waitUntil(ctx.db.nexusEvent(ctx.chat.id,ctx.from.id,'message',result.score,{status:result.status,reasons:result.reasons,ai:result.ai}));
  }
  // Legacy filters remain authoritative for configured explicit rules.
  if (result.score >= 85 && result.ai?.label === 'phishing') {
    await NEXUS_DEFENSE.apply(ctx,{...result,action:'delete_warn'},s);
    return true;
  }
  if (result.score >= 90 && result.reasons.includes('suspicious-domain')) {
    await NEXUS_DEFENSE.apply(ctx,{...result,action:'delete_warn'},s);
    return true;
  }
  return false;
}

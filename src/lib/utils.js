// ═══════════════════════════════════════════════════════════
//  NEXUS — Utils + Levels
// ═══════════════════════════════════════════════════════════

import { D } from '../config/constants.js';

export const Utils = {
  escapeHtml(t) {
    if (t == null) return '';
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },
  mention(user) {
    if (!user) return 'ناشناس';
    const name = this.escapeHtml(user.first_name || 'کاربر');
    return `<a href="tg://user?id=${user.id}">${name}</a>`;
  },
  parseDuration(str) {
    if (!str) return 0;
    const m = String(str).trim().toLowerCase().match(/^(\d+)\s*(s|m|h|d|w)?$/);
    if (!m) return 0;
    const mult = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 };
    return parseInt(m[1], 10) * (mult[m[2] || 'm'] || 60);
  },
  formatDuration(s) {
    if (!s || s <= 0) return 'دائمی';
    if (s < 60) return `${s} ثانیه`;
    if (s < 3600) return `${Math.round(s / 60)} دقیقه`;
    if (s < 86400) return `${Math.round(s / 3600)} ساعت`;
    return `${Math.round(s / 86400)} روز`;
  },
  formatDurationShort(s) {
    if (!s || s <= 0) return '—';
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.round(s / 60)}m`;
    if (s < 86400) return `${Math.round(s / 3600)}h`;
    return `${Math.round(s / 86400)}d`;
  },
  normalize(text) {
    if (!text) return '';
    return String(text)
      .replace(/[يﻱ]/g, 'ی')
      .replace(/[كﻙ]/g, 'ک')
      .replace(/‌/g, ' ')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  },
  extractDomain(url) {
    try {
      let u = url;
      if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
      return new URL(u).hostname.replace(/^www\./, '').toLowerCase();
    } catch { return ''; }
  },
  extractUrls(text) {
    if (!text) return [];
    const re = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(t\.me\/[^\s]+)/gi;
    return (text.match(re) || []);
  },
  renderTemplate(tpl, vars) {
    let out = String(tpl || '');
    for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(v);
    return out;
  },
  deepMerge(target, source) {
    const out = { ...target };
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(k => {
        if (this.isObject(source[k])) {
          if (!(k in target)) out[k] = source[k];
          else out[k] = this.deepMerge(target[k], source[k]);
        } else out[k] = source[k];
      });
    }
    return out;
  },
  isObject(i) { return i && typeof i === 'object' && !Array.isArray(i); },
  safeJson(s, fb = null) { try { return JSON.parse(s); } catch { return fb; } },
  randomToken(len = 32) {
    const bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let r = '';
    for (let i = 0; i < len; i++) r += chars[bytes[i] % chars.length];
    return r;
  },
  generateMathCaptcha() {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    const op = ['+', '-'][Math.floor(Math.random() * 2)];
    return { question: `${a} ${op} ${b}`, answer: String(op === '+' ? a + b : a - b) };
  },
  generateEmojiCaptcha() {
    const em = ['🍎','🍌','🍇','🍊','🍉','🍓','🥝','🍒','🥭','🍑'];
    const nm = ['سیب','موز','انگور','پرتقال','هندوانه','توت‌فرنگی','کیوی','گیلاس','انبه','هلو'];
    const i = Math.floor(Math.random() * em.length);
    const opts = [em[i]];
    while (opts.length < 4) {
      const r = em[Math.floor(Math.random() * em.length)];
      if (!opts.includes(r)) opts.push(r);
    }
    opts.sort(() => Math.random() - 0.5);
    return { question: nm[i], answer: em[i], options: opts };
  },
  greeting() {
    const h = new Date().getHours();
    if (h < 5) return 'شب بخیر';
    if (h < 12) return 'صبح بخیر';
    if (h < 17) return 'ظهر بخیر';
    if (h < 21) return 'عصر بخیر';
    return 'شب بخیر';
  },
  formatTimestamp(ts) {
    const now = Date.now() / 1000;
    const diff = now - ts;
    if (diff < 60) return 'همین حالا';
    if (diff < 3600) return `${Math.round(diff / 60)} دقیقه پیش`;
    if (diff < 86400) return `${Math.round(diff / 3600)} ساعت پیش`;
    const d = new Date(ts * 1000);
    return d.toISOString().slice(0, 16).replace('T', ' ');
  },
  isNightTime(from, to) {
    const h = new Date().getHours();
    if (from <= to) return h >= from && h < to;
    return h >= from || h < to;
  },
  detectLanguage(text) {
    if (!text) return 'unknown';
    const fa = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const en = (text.match(/[a-zA-Z]/g) || []).length;
    const ar = (text.match(/[\u0750-\u077F]/g) || []).length;
    const cyr = (text.match(/[\u0400-\u04FF]/g) || []).length;
    const zh = (text.match(/[\u4E00-\u9FFF]/g) || []).length;
    const total = fa + en + ar + cyr + zh;
    if (total === 0) return 'unknown';
    const scores = { fa, en, ar, cyr, zh };
    const max = Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b);
    return max[1] / total > 0.6 ? max[0] : 'mixed';
  },
  renderAdvancedTemplate(tpl, ctx) {
    if (!tpl) return '';
    const now = new Date();
    const tehran = new Date(now.getTime() + (3.5 * 60 * 60 * 1000));
    const vars = {
      name: ctx.from?.first_name || 'کاربر',
      mention: ctx.from ? `<a href="tg://user?id=${ctx.from.id}">${ctx.from.first_name}</a>` : '',
      id: String(ctx.from?.id || ''),
      group: ctx.chat?.title || '',
      chat_id: String(ctx.chat?.id || ''),
      date: tehran.toISOString().slice(0, 10),
      time: tehran.toISOString().slice(11, 16),
      greeting: this.greeting(),
    };
    let out = String(tpl);
    for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(v);
    return out;
  },
  formatPrice(n) {
    if (typeof n !== 'number' || isNaN(n)) return '—';
    return n.toLocaleString('fa-IR');
  },
  parseExchangeQuery(query) {
    const q = String(query || '').trim().toLowerCase();
    const map = {
      'دلار': 'USD', 'dollar': 'USD', 'usd': 'USD', '$': 'USD',
      'یورو': 'EUR', 'euro': 'EUR', 'eur': 'EUR', '€': 'EUR',
      'پوند': 'GBP', 'pound': 'GBP', 'gbp': 'GBP', '£': 'GBP',
      'درهم': 'AED', 'aed': 'AED',
      'لیر': 'TRY', 'try': 'TRY',
      'روبل': 'RUB', 'rub': 'RUB',
      'ین': 'JPY', 'jpy': 'JPY', '¥': 'JPY',
      'یوان': 'CNY', 'cny': 'CNY',
      'تومان': 'IRR', 'ریال': 'IRR', 'irr': 'IRR',
      'بیتکوین': 'BTC', 'bitcoin': 'BTC', 'btc': 'BTC',
      'اتریوم': 'ETH', 'ethereum': 'ETH', 'eth': 'ETH',
      'تتر': 'USDT', 'tether': 'USDT', 'usdt': 'USDT',
    };
    return { code: map[q] || 'USD', label: query || 'دلار' };
  },
};

export const Levels = {
  xpForLevel: (l) => Math.floor(100 * Math.pow(l, 1.5)),
  levelFromXP(xp) {
    let l = 1;
    while (this.xpForLevel(l + 1) <= xp && l < 100) l++;
    return Math.min(l, 100);
  },
  progressPercent(xp) {
    const cl = this.levelFromXP(xp);
    const cxp = this.xpForLevel(cl);
    const nxp = this.xpForLevel(cl + 1);
    return Math.max(0, Math.min(100, ((xp - cxp) / (nxp - cxp)) * 100));
  },
  getTitle(l) {
    if (l >= 90) return { name: 'افسانه', icon: '👑' };
    if (l >= 70) return { name: 'اسطوره', icon: '💎' };
    if (l >= 50) return { name: 'استاد', icon: '⭐' };
    if (l >= 30) return { name: 'حرفه‌ای', icon: '🏆' };
    if (l >= 15) return { name: 'باتجربه', icon: '🥇' };
    if (l >= 5) return { name: 'پیشرفته', icon: '🥈' };
    return { name: 'تازه‌کار', icon: '🥉' };
  },
  progressBar(p, len = 14) {
    const f = Math.round((p / 100) * len);
    return D.bar.full.repeat(f) + D.bar.empty.repeat(len - f);
  },
};

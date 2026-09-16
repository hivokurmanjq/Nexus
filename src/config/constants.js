// ═══════════════════════════════════════════════════════════
//  NEXUS — Constants
//  ثابت‌های اصلی پروژه — همه از worker.js اصلی منتقل شده
// ═══════════════════════════════════════════════════════════

export const BOT = {
  name: 'Nexus',
  tagline: 'سیستم‌عامل هوشمند مدیریت جامعه در تلگرام',
  version: '13.0',
  year: '2026',
};

export const LANG = {
  fa: {
    ban: 'بن', unban: 'آنبن', mute: 'سکوت', unmute: 'آزاد',
    kick: 'اخراج', warn: 'اخطار', warnLimit: 'به سقف اخطار رسید',
    welcome: 'خوش آمدی', goodbye: 'خداحافظ',
    captcha: 'تأیید انسانی', verified: 'تأیید شد',
    kicked: 'اخراج شد', saved: 'ذخیره شد', deleted: 'حذف شد',
    notAdmin: 'فقط ادمین‌ها', notGroup: 'فقط در گروه',
    error: 'خطا', success: 'موفق',
  },
  en: {
    ban: 'Banned', unban: 'Unbanned', mute: 'Muted', unmute: 'Unmuted',
    kick: 'Kicked', warn: 'Warned', warnLimit: 'Warn limit reached',
    welcome: 'Welcome', goodbye: 'Goodbye',
    captcha: 'Human verification', verified: 'Verified',
    kicked: 'Kicked out', saved: 'Saved', deleted: 'Deleted',
    notAdmin: 'Admins only', notGroup: 'Groups only',
    error: 'Error', success: 'Success',
  },
};

export const D = {
  b: '◆',
  s: '‣',
  arr: '→',
  dot: '·',
  sep: '─',
  star: '✦',
  diamond: '◈',
  arrow: '▸',
  bar: { full: '▓', empty: '░' },
  toggle: (v) => v ? '◉' : '◯',
  toggleBtn: (v, label) => `${v ? '◉' : '◯'}  ${label}`,
  status: (v) => v ? 'ON' : 'OFF',
};

export const DEFAULT_WELCOME = `<b>دروازه گشوده شد</b>

<blockquote>{mention}

هر آمدنی، آغازی‌ست بر روایتی تازه.
تو اکنون بخشی از حلقه‌ی <b>{group}</b> شده‌ای —
جایی که کلمات، ردّ پای آدم‌هاست.

تو <b>عضو شماره {count}</b> این حکایتی.</blockquote>

<i>خوش آمدی ✦</i>`;

export const ACHIEVEMENTS = {
  first_message: { name: 'اولین قدم', icon: '👋', desc: 'اولین پیام' },
  msg_100: { name: 'پرحرف', icon: '💬', desc: '۱۰۰ پیام' },
  msg_1000: { name: 'سخنور', icon: '🎤', desc: '۱۰۰۰ پیام' },
  msg_10000: { name: 'استاد کلمه', icon: '📚', desc: '۱۰,۰۰۰ پیام' },
  level_5: { name: 'شروع خوب', icon: '🥉', desc: 'سطح ۵' },
  level_10: { name: 'ده‌گانه', icon: '🥈', desc: 'سطح ۱۰' },
  level_25: { name: 'کهنه‌کار', icon: '🥇', desc: 'سطح ۲۵' },
  level_50: { name: 'استاد بزرگ', icon: '🏆', desc: 'سطح ۵۰' },
  level_100: { name: 'افسانه زنده', icon: '👑', desc: 'سطح ۱۰۰' },
  streak_7: { name: 'هفته‌ای', icon: '🔥', desc: '۷ روز پیوسته' },
  streak_30: { name: 'ماه‌گیر', icon: '💫', desc: '۳۰ روز پیوسته' },
  first_win: { name: 'اولین برد', icon: '🎯', desc: 'برد اول بازی' },
  win_10: { name: 'قهرمان', icon: '🏅', desc: '۱۰ برد' },
  lucky: { name: 'خوش‌شانس', icon: '🍀', desc: 'تاس ۶' },
  rep_10: { name: 'محبوب', icon: '💝', desc: '۱۰ اعتبار' },
  rep_50: { name: 'اشراف', icon: '👑', desc: '۵۰ اعتبار' },
  inviter_5: { name: 'دعوت‌کننده', icon: '🔗', desc: '۵ دعوت' },
  inviter_20: { name: 'سفیر', icon: '🎖', desc: '۲۰ دعوت' },
};

export const RESTRICT_ALL = {
  can_send_messages: false,
  can_send_audios: false,
  can_send_documents: false,
  can_send_photos: false,
  can_send_videos: false,
  can_send_video_notes: false,
  can_send_voice_notes: false,
  can_send_polls: false,
  can_send_other_messages: false,
  can_add_web_page_previews: false,
};

export const UNRESTRICT_ALL = {
  can_send_messages: true,
  can_send_audios: true,
  can_send_documents: true,
  can_send_photos: true,
  can_send_videos: true,
  can_send_video_notes: true,
  can_send_voice_notes: true,
  can_send_polls: true,
  can_send_other_messages: true,
  can_add_web_page_previews: true,
};

export const NEXUS_CORE = {
  product: 'NEXUS',
  edition: 'Community Intelligence OS',
  build: 'FINAL',
  visual: 'NEXUS / Obsidian Command',
  risk: { low: 0, watch: 30, high: 60, critical: 85 },
  maxAuditText: 800,
  aiModel: '@cf/meta/llama-3.1-8b-instruct',
};

export const NEXUS_PERMISSIONS = {
  view: 'view',
  security: 'security',
  moderation: 'moderation',
  automation: 'automation',
  community: 'community',
  analytics: 'analytics',
  system: 'system',
};

export const NEXUS_LABELS = {
  fa: {
    normal: 'عادی', watch: 'تحت نظر', high: 'پرریسک', critical: 'بحرانی',
    defense: 'دفاع', intelligence: 'هوش', moderation: 'مدیریت',
    automation: 'اتوماسیون', community: 'جامعه', analytics: 'تحلیل',
  },
  en: {
    normal: 'NORMAL', watch: 'WATCH', high: 'HIGH', critical: 'CRITICAL',
    defense: 'DEFENSE', intelligence: 'INTELLIGENCE', moderation: 'MODERATION',
    automation: 'AUTOMATION', community: 'COMMUNITY', analytics: 'ANALYTICS',
  },
};

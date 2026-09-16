// ═══════════════════════════════════════════════════════════
//  NEXUS — Home Page Renderer
//  از worker.js اصلی منتقل شده — بدون حذف
// ═══════════════════════════════════════════════════════════

import { BOT } from '../config/constants.js';
import { TelegramAPI } from '../lib/telegram.js';
import { HTML_CSS } from './css.js';

export async function renderHome(env) {
  const checks = {
    token: !!env.BOT_TOKEN,
    db: !!env.DB,
    cache: !!env.CACHE,
    secret: !!env.WEBHOOK_SECRET,
    ai: !!env.AI,
  };
  let bot = { username: null, name: null, ok: false };
  if (env.BOT_TOKEN) {
    try {
      const api = new TelegramAPI(env);
      const me = await api.getMe();
      if (me.ok) bot = { username: me.result.username, name: me.result.first_name, ok: true };
    } catch {}
  }
  const allOk = Object.values(checks).every(v => v) && bot.ok;

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta name="referrer" content="no-referrer">
<title>${BOT.name}</title>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>${HTML_CSS}
.hero{text-align:center;padding:44px 0 24px;animation:fadeUp .7s cubic-bezier(.16,1,.3,1) both}
.logo{
  width:80px;height:80px;margin:0 auto 24px;
  background:linear-gradient(135deg,var(--accent) 0%,var(--accent-2) 100%);
  border-radius:24px;
  display:flex;align-items:center;justify-content:center;
  font-size:34px;color:#0a0a0f;font-weight:800;
  animation:glow 3s ease-in-out infinite;
  position:relative;
}
.logo::after{
  content:'';
  position:absolute;inset:-3px;
  border-radius:27px;
  background:linear-gradient(135deg,var(--accent),var(--accent-2));
  z-index:-1;
  filter:blur(24px);opacity:.6;
}
.title{font-size:40px;font-weight:800;letter-spacing:-.035em;margin-bottom:10px}
.subtitle{color:var(--text-2);font-size:14px;letter-spacing:.01em}
.badge-wrap{margin-top:24px}
.bot-card{text-align:center;padding:6px 0}
.bot-ava{
  width:64px;height:64px;margin:0 auto 14px;
  background:var(--accent-soft);
  border:1px solid var(--accent);
  border-radius:20px;
  display:flex;align-items:center;justify-content:center;
  font-size:26px;font-weight:700;color:var(--accent);
  box-shadow:0 0 30px var(--accent-glow);
}
.bot-name{font-size:20px;font-weight:700;margin-bottom:4px}
.bot-user{font-size:12px;color:var(--text-3);font-family:ui-monospace,monospace}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.feat{
  padding:18px 8px;
  background:var(--surface-2);
  backdrop-filter:blur(20px);
  border:1px solid var(--border);
  border-radius:14px;
  text-align:center;
  font-size:11px;
  color:var(--text-2);
  transition:all .25s cubic-bezier(.16,1,.3,1);
}
.feat:hover{
  border-color:var(--accent);
  background:var(--accent-soft);
  transform:translateY(-3px);
  box-shadow:0 10px 30px -10px var(--accent-glow);
}
.feat-icon{font-size:22px;display:block;margin-bottom:8px}
.footer{text-align:center;padding:36px 0 0;color:var(--text-3);font-size:12px}
.footer b{color:var(--text-2);font-weight:600}
</style></head><body>
<div class="wrap">
<div class="hero">
<div class="logo">◆</div>
<h1 class="title">${BOT.name}</h1>
<p class="subtitle">${BOT.tagline}</p>
<div class="badge-wrap">
<span class="badge ${allOk ? 'ok' : 'warn'}"><span class="dot live"></span>${allOk ? 'همه سیستم‌ها عملیاتی' : 'نیاز به پیکربندی'}</span>
</div></div>
${bot.ok ? `<div class="card"><div class="bot-card"><div class="bot-ava">${(bot.name || 'N').charAt(0).toUpperCase()}</div><div class="bot-name">${bot.name}</div><div class="bot-user">@${bot.username}</div></div></div>` : ''}
<div class="card"><div class="card-title">وضعیت سیستم</div>
<div class="row"><div class="row-label"><div class="row-icon">🔑</div>توکن ربات</div><span class="badge ${checks.token ? 'ok' : 'err'}">${checks.token ? '✓' : '✕'}</span></div>
<div class="row"><div class="row-label"><div class="row-icon">💾</div>دیتابیس D1</div><span class="badge ${checks.db ? 'ok' : 'err'}">${checks.db ? '✓' : '✕'}</span></div>
<div class="row"><div class="row-label"><div class="row-icon">⚡</div>حافظه KV</div><span class="badge ${checks.cache ? 'ok' : 'err'}">${checks.cache ? '✓' : '✕'}</span></div>
<div class="row"><div class="row-label"><div class="row-icon">🔐</div>رمز وبهوک</div><span class="badge ${checks.secret ? 'ok' : 'err'}">${checks.secret ? '✓' : '✕'}</span></div>
<div class="row"><div class="row-label"><div class="row-icon">🧠</div>هوش مصنوعی</div><span class="badge ${checks.ai ? 'ok' : 'warn'}">${checks.ai ? '✓' : '!'}</span></div>
</div>
<div class="card"><div class="card-title">ویژگی‌ها</div><div class="grid">
<div class="feat"><span class="feat-icon">🛡</span>امنیت</div>
<div class="feat"><span class="feat-icon">🔐</span>کپچا</div>
<div class="feat"><span class="feat-icon">🚨</span>ضد رید</div>
<div class="feat"><span class="feat-icon">🧠</span>AI</div>
<div class="feat"><span class="feat-icon">⚡</span>پاسخ خودکار</div>
<div class="feat"><span class="feat-icon">👋</span>خوش‌آمد</div>
<div class="feat"><span class="feat-icon">🏆</span>XP</div>
<div class="feat"><span class="feat-icon">🎮</span>بازی</div>
<div class="feat"><span class="feat-icon">🌐</span>فدراسیون</div>
</div></div>
<div class="card"><div class="card-title">اقدامات</div>
${bot.ok ? `<a href="https://t.me/${bot.username}" class="btn primary">◆  باز کردن در تلگرام</a>` : ''}
<a href="/healthz" class="btn">❤  بررسی سلامت</a>
</div>
<div class="footer">v${BOT.version}  ·  <b>Cloudflare Edge</b>  ·  ${new Date().getFullYear()}</div>
</div></body></html>`;
}

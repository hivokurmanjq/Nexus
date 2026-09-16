// ═══════════════════════════════════════════════════════════
//  NEXUS — Dashboard Renderer
//  از worker.js اصلی منتقل شده — بدون حذف
// ═══════════════════════════════════════════════════════════

import { BOT, D, Utils } from '../config/constants.js';
import { Database } from '../lib/database.js';
import { HTML_CSS } from './css.js';

// ─── Chart renderer ───
export function renderChart(chatData) {
  const data = chatData.data;
  const max = Math.max(...data.map(d => d.messages), 1);
  const days = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش'];
  const w = 100 / data.length;
  const points = data.map((d, i) => {
    const x = i * w + w / 2;
    const y = 100 - (d.messages / max) * 80;
    return `${x},${y}`;
  }).join(' ');
  const dots = data.map((d, i) => {
    const x = i * w + w / 2;
    const y = 100 - (d.messages / max) * 80;
    return `<circle cx="${x}%" cy="${y}%" r="4" fill="#a78bfa" style="filter:drop-shadow(0 0 6px #a78bfa)"/>`;
  }).join(' ');
  const labels = data.map((d, i) => {
    const x = i * w + w / 2;
    return `<text x="${x}%" y="99%" text-anchor="middle" fill="rgba(245,245,247,.34)" font-size="10" font-family="Vazirmatn">${days[d.day]}</text>`;
  }).join(' ');
  return `<div class="chart"><svg preserveAspectRatio="none" viewBox="0 0 100 100">
<defs>
<linearGradient id="ln" x1="0%" y1="0%" x2="100%" y2="0%">
<stop offset="0%" stop-color="#a78bfa" stop-opacity=".15"/>
<stop offset="50%" stop-color="#a78bfa" stop-opacity="1"/>
<stop offset="100%" stop-color="#a78bfa" stop-opacity=".15"/>
</linearGradient>
<linearGradient id="fill" x1="0%" y1="0%" x2="0%" y2="100%">
<stop offset="0%" stop-color="#a78bfa" stop-opacity=".25"/>
<stop offset="100%" stop-color="#a78bfa" stop-opacity="0"/>
</linearGradient>
</defs>
<polyline points="${points} 100,100 0,100" fill="url(#fill)" stroke="none" vector-effect="non-scaling-stroke"/>
<polyline points="${points}" fill="none" stroke="url(#ln)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
${dots} ${labels}</svg></div>`;
}

// ─── Main dashboard ───
export async function renderDashboard(env, userId) {
  const db = new Database(env);
  const g = await db.getGlobalStats();
  const chats = await db.getAllChats();
  let chartData = null;
  if (chats.length > 0) {
    const wk = await db.getWeekStats(chats[0].id);
    chartData = { title: chats[0].title || 'گروه', data: wk };
  }

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta name="referrer" content="no-referrer">
<title>${BOT.name} · Dashboard</title>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>${HTML_CSS}
.wrap{max-width:1200px}
.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:34px;flex-wrap:wrap;gap:16px}
.brand{display:flex;align-items:center;gap:14px}
.brand-logo{
  width:52px;height:52px;
  background:linear-gradient(135deg,var(--accent) 0%,var(--accent-2) 100%);
  border-radius:15px;
  display:flex;align-items:center;justify-content:center;
  color:#0a0a0f;font-size:26px;font-weight:800;
  box-shadow:0 10px 30px -10px var(--accent-glow),0 1px 0 rgba(255,255,255,.3) inset;
}
.brand-name{font-size:20px;font-weight:700;letter-spacing:-.02em}
.brand-tag{font-size:12px;color:var(--text-3);margin-top:3px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:28px}
.kpi{
  background:var(--surface);
  backdrop-filter:blur(28px) saturate(160%);
  -webkit-backdrop-filter:blur(28px) saturate(160%);
  border:1px solid var(--border);
  border-radius:20px;
  padding:26px;
  animation:fadeUp .6s cubic-bezier(.16,1,.3,1) both;
  position:relative;
  overflow:hidden;
  box-shadow:0 1px 0 rgba(255,255,255,.05) inset,0 20px 40px -20px rgba(0,0,0,.6);
}
.kpi::before{
  content:'';
  position:absolute;top:0;right:0;
  width:100px;height:100px;
  background:radial-gradient(circle,var(--accent) 0%,transparent 70%);
  opacity:.12;filter:blur(24px);
  pointer-events:none;
}
.kpi-label{
  font-size:11px;color:var(--text-3);
  text-transform:uppercase;letter-spacing:.09em;
  margin-bottom:12px;font-weight:600;
}
.kpi-value{font-size:34px;font-weight:800;letter-spacing:-.035em;color:var(--text)}
.grid-2{display:grid;grid-template-columns:1fr;gap:18px}
@media(min-width:900px){.grid-2{grid-template-columns:1.5fr 1fr}}
.chart{height:280px;padding:10px 0}
.chart svg{width:100%;height:100%}
.chat-list{display:flex;flex-direction:column;gap:10px;max-height:380px;overflow-y:auto;padding-left:4px}
.chat-list::-webkit-scrollbar{width:5px}
.chat-list::-webkit-scrollbar-thumb{background:var(--border-2);border-radius:3px}
.chat-item{
  padding:14px 16px;
  background:var(--surface-2);
  backdrop-filter:blur(20px);
  border:1px solid var(--border);
  border-radius:13px;
  display:flex;align-items:center;gap:12px;
  transition:all .22s cubic-bezier(.16,1,.3,1);
}
.chat-item:hover{
  border-color:var(--accent);
  background:var(--surface-3);
  transform:translateX(-3px);
  box-shadow:0 10px 30px -10px var(--accent-glow);
}
.chat-ava{
  width:40px;height:40px;
  background:var(--accent-soft);
  border:1px solid var(--accent);
  border-radius:12px;
  display:flex;align-items:center;justify-content:center;
  font-size:15px;font-weight:700;color:var(--accent);
  flex-shrink:0;
  box-shadow:0 0 20px -5px var(--accent-glow);
}
.chat-info{flex:1;min-width:0}
.chat-title{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chat-meta{font-size:11px;color:var(--text-3);margin-top:3px}
.empty{text-align:center;padding:48px;color:var(--text-3);font-size:13px}
</style></head><body>
<div class="wrap">
<div class="top">
<div class="brand"><div class="brand-logo">◆</div><div><div class="brand-name">${BOT.name} Dashboard</div><div class="brand-tag">پنل مدیریت پیشرفته</div></div></div>
<span class="badge ok"><span class="dot live"></span>Live</span>
</div>
<div class="kpis">
<div class="kpi"><div class="kpi-label">پیام امروز</div><div class="kpi-value">${(g.messages_today || 0).toLocaleString('fa-IR')}</div></div>
<div class="kpi"><div class="kpi-label">کل کاربران</div><div class="kpi-value">${(g.users || 0).toLocaleString('fa-IR')}</div></div>
<div class="kpi"><div class="kpi-label">گروه‌ها</div><div class="kpi-value">${(g.chats || 0).toLocaleString('fa-IR')}</div></div>
<div class="kpi"><div class="kpi-label">اقدامات امروز</div><div class="kpi-value">${((g.bans_today || 0) + (g.deletions_today || 0)).toLocaleString('fa-IR')}</div></div>
</div>
<div class="grid-2">
<div class="card" style="animation-delay:.1s">
<div class="card-title">فعالیت ۷ روز گذشته</div>
${chartData ? renderChart(chartData) : '<div class="empty">داده‌ای موجود نیست</div>'}
</div>
<div class="card" style="animation-delay:.2s">
<div class="card-title">گروه‌های فعال</div>
<div class="chat-list">
${chats.length > 0 ? chats.slice(0, 20).map(c => `
<div class="chat-item"><div class="chat-ava">${(c.title || 'G').charAt(0).toUpperCase()}</div>
<div class="chat-info"><div class="chat-title">${Utils.escapeHtml(c.title || 'بدون نام')}</div><div class="chat-meta">${c.type}  ·  ${c.id}</div></div></div>
`).join('') : '<div class="empty">هنوز گروهی ثبت نشده</div>'}
</div>
</div>
</div>
<div class="footer">${BOT.name} v${BOT.version}  ·  <b>Cloudflare Workers</b>  ·  D1 + AI</div>
</div></body></html>`;
}

// ═══════════════════════════════════════════════════════════
//  NEXUS — HTML CSS (Aurora Luxe + Glassmorphism)
//  از worker.js اصلی منتقل شده — بدون حذف
// ═══════════════════════════════════════════════════════════

export const HTML_CSS = `
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#08080c;
  --bg-2:#0d0d14;
  --surface:rgba(255,255,255,.035);
  --surface-2:rgba(255,255,255,.06);
  --surface-3:rgba(255,255,255,.09);
  --border:rgba(255,255,255,.07);
  --border-2:rgba(255,255,255,.12);
  --text:#f5f5f7;
  --text-2:rgba(245,245,247,.62);
  --text-3:rgba(245,245,247,.34);
  --accent:#a78bfa;
  --accent-2:#8b5cf6;
  --accent-soft:rgba(167,139,250,.12);
  --accent-glow:rgba(167,139,250,.35);
  --ok:#4ade80;
  --err:#f87171;
  --warn:#fbbf24;
}
html,body{
  background:var(--bg);
  color:var(--text);
  font-family:'Vazirmatn',-apple-system,sans-serif;
  min-height:100vh;
  overflow-x:hidden;
  -webkit-font-smoothing:antialiased;
  font-feature-settings:'ss01';
}
body::before{
  content:'';
  position:fixed;
  inset:0;
  background:
    radial-gradient(ellipse 60% 50% at 15% 0%,rgba(167,139,250,.14),transparent 60%),
    radial-gradient(ellipse 50% 50% at 85% 100%,rgba(236,72,153,.10),transparent 60%),
    radial-gradient(ellipse 70% 60% at 50% 50%,rgba(59,130,246,.06),transparent 70%);
  pointer-events:none;
  z-index:0;
}
body::after{
  content:'';
  position:fixed;
  inset:0;
  background-image:radial-gradient(circle at 1px 1px,rgba(255,255,255,.025) 1px,transparent 0);
  background-size:32px 32px;
  pointer-events:none;
  z-index:0;
  opacity:.6;
}
.wrap{
  max-width:920px;
  margin:0 auto;
  padding:32px 20px 80px;
  position:relative;
  z-index:1;
}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes live{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.85)}}
@keyframes glow{0%,100%{box-shadow:0 0 40px var(--accent-glow),0 20px 40px rgba(0,0,0,.4)}50%{box-shadow:0 0 60px var(--accent-glow),0 20px 50px rgba(0,0,0,.5)}}

/* ── Card — glassmorphism ── */
.card{
  background:var(--surface);
  backdrop-filter:blur(28px) saturate(160%);
  -webkit-backdrop-filter:blur(28px) saturate(160%);
  border:1px solid var(--border);
  border-radius:22px;
  padding:26px;
  margin-bottom:16px;
  animation:fadeUp .6s cubic-bezier(.16,1,.3,1) both;
  position:relative;
  overflow:hidden;
  box-shadow:
    0 1px 0 rgba(255,255,255,.05) inset,
    0 20px 40px -20px rgba(0,0,0,.6);
}
.card::before{
  content:'';
  position:absolute;
  top:0;left:0;right:0;
  height:1px;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.16),transparent);
}
.card-title{
  font-size:13px;
  font-weight:600;
  color:var(--text-2);
  text-transform:uppercase;
  letter-spacing:.10em;
  margin-bottom:22px;
  display:flex;
  align-items:center;
  gap:10px;
}
.card-title::before{
  content:'';
  width:3px;
  height:14px;
  background:linear-gradient(180deg,var(--accent),var(--accent-2));
  border-radius:2px;
  box-shadow:0 0 10px var(--accent-glow);
}

/* ── Row ── */
.row{
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:14px 0;
  border-bottom:1px solid var(--border);
}
.row:last-child{border:none}
.row-label{
  color:var(--text-2);
  font-size:14px;
  display:flex;
  align-items:center;
  gap:12px;
}
.row-icon{
  width:36px;
  height:36px;
  background:var(--surface-2);
  border:1px solid var(--border);
  border-radius:11px;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:15px;
  backdrop-filter:blur(10px);
}

/* ── Badge ── */
.badge{
  display:inline-flex;
  align-items:center;
  gap:7px;
  padding:5px 12px;
  border-radius:100px;
  font-size:11px;
  font-weight:600;
  letter-spacing:.02em;
  backdrop-filter:blur(10px);
}
.badge.ok{background:rgba(74,222,128,.10);color:var(--ok);border:1px solid rgba(74,222,128,.25)}
.badge.err{background:rgba(248,113,113,.10);color:var(--err);border:1px solid rgba(248,113,113,.25)}
.badge.warn{background:rgba(251,191,36,.10);color:var(--warn);border:1px solid rgba(251,191,36,.25)}
.dot{width:6px;height:6px;border-radius:50%;background:currentColor}
.dot.live{animation:live 2s ease-in-out infinite;box-shadow:0 0 10px currentColor}

/* ── Button ── */
.btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:10px;
  padding:15px 22px;
  background:var(--surface-2);
  backdrop-filter:blur(20px) saturate(160%);
  -webkit-backdrop-filter:blur(20px) saturate(160%);
  border:1px solid var(--border-2);
  border-radius:14px;
  color:var(--text);
  text-decoration:none;
  font-family:inherit;
  font-size:14px;
  font-weight:500;
  cursor:pointer;
  transition:all .25s cubic-bezier(.16,1,.3,1);
  width:100%;
  margin-bottom:10px;
  position:relative;
  overflow:hidden;
  box-shadow:0 1px 0 rgba(255,255,255,.06) inset;
}
.btn::before{
  content:'';
  position:absolute;
  top:0;left:0;right:0;
  height:50%;
  background:linear-gradient(180deg,rgba(255,255,255,.05),transparent);
  pointer-events:none;
}
.btn:hover{
  background:var(--surface-3);
  border-color:var(--accent);
  transform:translateY(-2px);
  box-shadow:0 10px 30px rgba(167,139,250,.15),0 1px 0 rgba(255,255,255,.08) inset;
}
.btn.primary{
  background:linear-gradient(135deg,var(--accent) 0%,var(--accent-2) 100%);
  color:#0a0a0f;
  border:none;
  font-weight:700;
  box-shadow:0 15px 40px -10px var(--accent-glow),0 1px 0 rgba(255,255,255,.3) inset;
}
.btn.primary:hover{
  box-shadow:0 20px 50px -10px var(--accent-glow),0 1px 0 rgba(255,255,255,.4) inset;
}
`;

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

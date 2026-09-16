// ═══════════════════════════════════════════════════════════
//  ✦ NEXUS GUARD ✦ — Aurora Luxe v14
//  Version: 14.0.0 — Community Intelligence OS
//  Entry Point
// ═══════════════════════════════════════════════════════════

import { route } from './router.js';
import { Database } from './lib/database.js';
import { TelegramAPI } from './lib/telegram.js';
import { Log } from './lib/log.js';
import { nexusRunDueJobs } from './nexus/jobs.js';

export default {
  async fetch(request, env, ctx) {
    return route(request, env, ctx);
  },

  async scheduled(event, env, ctx) {
    const db = new Database(env);
    const api = new TelegramAPI(env);

    // ── Light cleanup every run ──
    ctx.waitUntil(db.cleanExpiredCaptcha());
    ctx.waitUntil(db.cleanExpiredSessions());

    // ── Heavy cleanup during the first 10 minutes of each hour ──
    const minute = new Date().getUTCMinutes();
    if (minute < 10) {
      ctx.waitUntil(Promise.all([
        db.cleanExpiredGames(),
        db.cleanExpiredTokens(),
        db.cleanOldRaidEvents(),
        db.cleanStaleRateLimits(),
        db.cleanExpiredWarnings(),
        db.cleanOldRecords(7),
        db.cleanOldLogs(30),
        db.cleanOldGameHistory(30),
        db.cleanOldRepHistory(60),
        db.cleanOldBackups(30),
        db.cleanOldExchangeCache(),
      ]));
      const hour = new Date().getUTCHours();
      if (hour === 3) ctx.waitUntil(db.cleanOldStats(60));
    }

    // ── Scheduled messages ──
    ctx.waitUntil((async () => {
      try {
        const pending = await db.getPendingScheduled();
        for (const s of pending) {
          await api.sendMessage(s.chat_id, s.text);
          await db.markScheduledSent(s.id, s.repeat_interval);
        }
      } catch (e) {
        Log.error('scheduled_msg', { err: e.message });
      }
    })());

    // ── Job queue (v14) ──
    ctx.waitUntil(nexusRunDueJobs(env, ctx));

    // ── Pinned status update (Agentic) ──
    ctx.waitUntil((async () => {
      try {
        const chats = await db.all(`SELECT id FROM chats WHERE is_active=1 LIMIT 50`);
        for (const c of chats) {
          const s = await db.getSettings(c.id);
          if (!s.pinnedStatus?.enabled || !s.pinnedStatus?.messageId) continue;
          const stats = await db.getTodayStats(c.id);
          const count = await api.getChatMemberCount(c.id);
          const members = count.ok ? count.result : 0;
          const now = new Date();
          const tehran = new Date(now.getTime() + (3.5 * 60 * 60 * 1000));
          const time = tehran.toISOString().slice(11, 16);
          const date = tehran.toISOString().slice(0, 10);
          let text = `<b>📡 وضعیت زنده</b>\n`;
          text += `<pre>🕐 زمان       ${time} (${date})\n`;
          text += `👥 اعضا       ${members.toLocaleString('fa-IR')}\n`;
          text += `💬 پیام امروز  ${(stats.messages || 0).toLocaleString('fa-IR')}\n`;
          text += `🗑 حذف        ${(stats.deletions || 0).toLocaleString('fa-IR')}\n`;
          text += `⛔ بن         ${(stats.bans || 0).toLocaleString('fa-IR')}\n`;
          text += `🔇 میوت       ${(stats.mutes || 0).toLocaleString('fa-IR')}</pre>\n\n`;
          text += `<i>آخرین به‌روزرسانی: ${time}</i>`;
          await api.editMessage(c.id, s.pinnedStatus.messageId, text);
        }
      } catch (e) {
        Log.error('status_update', { err: e.message });
      }
    })());

    Log.info('cron_done', { ts: new Date().toISOString() });
  },
};

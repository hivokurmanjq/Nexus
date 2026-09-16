// ═══════════════════════════════════════════════════════════
//  NEXUS — Job Queue
//  از worker.js اصلی منتقل شده — بدون حذف
// ═══════════════════════════════════════════════════════════

import { Utils } from '../lib/utils.js';
import { Database } from '../lib/database.js';
import { TelegramAPI } from '../lib/telegram.js';

// ─── Idempotency for update processing ───
export async function nexusProcessUpdateOnce(ctx) {
  const updateId = ctx?.update?.update_id;
  if (updateId == null) return true;
  const r = await ctx.db.execute(
    `INSERT OR IGNORE INTO processed_updates (update_id,processed_at) VALUES (?,unixepoch())`,
    [updateId]
  );
  return !!(r?.meta?.changes || r?.success || r);
}

// ─── Queue a job ───
export async function nexusQueueJob(ctx, type, payload, runAfter = null) {
  const id = `job_${Date.now().toString(36)}_${Utils.randomToken(8)}`;
  const due = runAfter || Math.floor(Date.now() / 1000);
  await ctx.db.execute(
    `INSERT INTO jobs (id,type,payload,status,attempts,run_after,created_at) VALUES (?,?,?,'pending',0,?,unixepoch())`,
    [id, type, JSON.stringify(payload || {}), due]
  );
  return id;
}

// ─── Process due jobs (called from scheduled) ───
export async function nexusRunDueJobs(env, executionCtx) {
  const db = new Database(env);
  const api = new TelegramAPI(env);
  const now = Math.floor(Date.now() / 1000);
  const jobs = await db.all(
    `SELECT * FROM jobs WHERE status='pending' AND run_after<=? ORDER BY run_after LIMIT 20`, [now]
  );
  for (const job of jobs) {
    const lock = await db.execute(
      `UPDATE jobs SET status='running',locked_at=unixepoch(),attempts=attempts+1
       WHERE id=? AND status='pending'`, [job.id]
    );
    if (!(lock?.meta?.changes || lock?.success || lock)) continue;
    const payload = Utils.safeJson(job.payload, {});
    try {
      if (job.type === 'send_message') {
        const sent = await api.sendMessage(payload.chat_id, payload.text, payload.extra || {});
        if (!sent?.ok) throw new Error(sent?.description || sent?.error || 'telegram_send_failed');
      }
      if (job.type === 'scheduled_message') {
        const sent = await api.sendMessage(payload.chat_id, payload.text, payload.extra || {});
        if (!sent?.ok) throw new Error(sent?.description || 'scheduled_send_failed');
      }
      await db.execute(`UPDATE jobs SET status='completed',completed_at=unixepoch(),last_error=NULL WHERE id=?`, [job.id]);
    } catch (e) {
      const attempt = Number(job.attempts || 0) + 1;
      const failed = attempt >= 5;
      const retryAt = now + Math.min(3600, 30 * (2 ** Math.min(attempt, 6)));
      await db.execute(
        `UPDATE jobs SET status=?,run_after=?,last_error=? WHERE id=?`,
        [failed ? 'failed' : 'pending', retryAt, String(e.message || e).slice(0, 1000), job.id]
      );
    }
  }
  executionCtx?.waitUntil?.(Promise.all([
    db.execute(`DELETE FROM processed_updates WHERE processed_at < unixepoch()-172800`),
    db.execute(`DELETE FROM jobs WHERE status IN ('completed','failed') AND created_at < unixepoch()-2592000`),
  ]));
}

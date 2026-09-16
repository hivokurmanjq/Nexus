// ═══════════════════════════════════════════════════════════
//  NEXUS v14 — Smart Shield
//  از worker.js اصلی منتقل شده — بدون حذف
// ═══════════════════════════════════════════════════════════

import { Utils } from '../lib/utils.js';
import { RESTRICT_ALL, UNRESTRICT_ALL } from '../config/constants.js';
import { nexusV14Defaults } from '../views/v14.js';
import { Log } from '../lib/log.js';

function nexusRiskClamp(n) { return Math.max(0, Math.min(100, Math.round(n))); }

// ─── Age of member in seconds ───
async function nexusGetMemberAgeSeconds(ctx, uid) {
  const r = await ctx.db.first('SELECT first_seen FROM users WHERE id=?', [uid]);
  if (!r?.first_seen) return 0;
  return Math.max(0, Math.floor(Date.now() / 1000) - Number(r.first_seen));
}

// ─── Score message risk ───
async function nexusScoreMessageRisk(ctx, settings) {
  const m = ctx.message || {};
  const text = ctx.text || '';
  const uid = ctx.from?.id;
  const reasons = [];
  let score = 0;
  const urls = Utils.extractUrls(text);
  const age = uid ? await nexusGetMemberAgeSeconds(ctx, uid) : 0;
  const isNew = age > 0 && age < (settings.smartShield?.probationSeconds || 86400);
  if (isNew) { score += 25; reasons.push('عضو تازه‌وارد'); }
  if (urls.length) { score += Math.min(30, 18 + urls.length * 6); reasons.push('لینک خارجی'); }
  if (m.forward_origin || m.forward_from || m.forward_date) { score += 12; reasons.push('محتوای فورواردی'); }
  if (text.length > 900) { score += 5; reasons.push('پیام بسیار بلند'); }
  if (uid) {
    const warns = await ctx.db.getWarns(ctx.chat.id, uid);
    if (warns) { score += Math.min(24, warns * 8); reasons.push(`${warns} اخطار قبلی`); }
    const rs = await ctx.db.first('SELECT score FROM reputation WHERE chat_id=? AND user_id=?', [ctx.chat.id, uid]);
    if ((rs?.score || 0) >= 10) { score -= 15; reasons.push('عضو معتبر'); }
  }
  const flood = await ctx.cache.get(`flood:${ctx.chat?.id}:${uid}`);
  if (Array.isArray(flood) && flood.length >= Math.max(2, (settings.floodMax || 5) - 1)) {
    score += 22; reasons.push('رفتار نزدیک به فلود');
  }
  return { score: nexusRiskClamp(score), reasons, isNew, urls };
}

// ─── Create moderation case ───
async function nexusCreateCase(ctx, input = {}) {
  const id = `case_${Date.now().toString(36)}_${Utils.randomToken(7)}`;
  const now = Math.floor(Date.now() / 1000);
  await ctx.db.execute(
    `INSERT INTO moderation_cases (id,chat_id,target_id,reporter_id,admin_id,source,message_id,reason,severity,risk_score,status,evidence,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, ctx.chat.id, input.targetId || ctx.from?.id || 0, input.reporterId || null,
      input.adminId || null, input.source || 'system', input.messageId || ctx.message?.message_id || null,
      input.reason || 'رفتار مشکوک', input.severity || 'medium', input.riskScore || 0,
      input.status || 'open', JSON.stringify(input.evidence || {}), now, now,
    ]
  );
  return id;
}

// ─── Audit helper ───
async function nexusAudit(ctx, action, targetId = null, details = {}) {
  const safe = JSON.stringify({
    ...details,
    update_id: ctx.update?.update_id || null,
    at: new Date().toISOString(),
  }).slice(0, 3500);
  return ctx.db.logAction(ctx.chat?.id || 0, ctx.from?.id || 0, targetId || 0, action, safe);
}

// ─── Main Smart Shield handler ───
export async function nexusRunSmartShield(ctx) {
  if (!ctx?.isGroup?.() || !ctx.message || !ctx.from || ctx.from.is_bot) return false;
  const settings = nexusV14Defaults(await ctx.getSettings());
  const ss = settings.smartShield;
  if (!ss?.enabled || !settings.featureFlags?.smartShield) return false;
  if (await ctx.isAdmin()) return false;
  const result = await nexusScoreMessageRisk(ctx, settings);
  const evidence = {
    text: String(ctx.text || '').slice(0, 500),
    reasons: result.reasons,
    score: result.score,
    urls: result.urls,
  };
  if (ss.mode === 'observe') {
    if (result.score >= ss.thresholds.review) {
      const caseId = await nexusCreateCase(ctx, {
        source: 'smart_shield_observe', targetId: ctx.from.id,
        riskScore: result.score, severity: result.score >= ss.thresholds.mute ? 'high' : 'medium',
        reason: result.reasons.join('، ') || 'رفتار مشکوک', evidence,
      });
      await nexusAudit(ctx, 'smart_shield_observe', ctx.from.id, { caseId, ...evidence });
    }
    return false;
  }
  if (result.score < ss.thresholds.delete) return false;
  const caseId = await nexusCreateCase(ctx, {
    source: 'smart_shield', targetId: ctx.from.id, riskScore: result.score,
    severity: result.score >= ss.thresholds.critical ? 'critical' : result.score >= ss.thresholds.mute ? 'high' : 'medium',
    reason: result.reasons.join('، ') || 'رفتار مشکوک', evidence,
  });
  await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);
  await ctx.db.incrementStat(ctx.chat.id, 'deletions');
  let applied = 'delete';
  if (result.score >= ss.thresholds.mute) {
    const duration = result.score >= ss.thresholds.critical ? 86400 : 1800;
    await ctx.api.restrictMember(ctx.chat.id, ctx.from.id, RESTRICT_ALL, Math.floor(Date.now() / 1000) + duration);
    await ctx.db.incrementStat(ctx.chat.id, 'mutes');
    applied = `delete_mute_${duration}`;
  }
  await nexusAudit(ctx, 'smart_shield_action', ctx.from.id, { caseId, action: applied, ...evidence });
  return true;
}

// ─── Newcomer Probation ───
export async function nexusApplyNewcomerProbation(ctx, user) {
  const settings = nexusV14Defaults(await ctx.getSettings());
  const ss = settings.smartShield;
  if (!ss?.enabled || !ss.newcomerProbation) return false;
  const until = Math.floor(Date.now() / 1000) + Math.max(300, ss.probationSeconds || 86400);
  const perms = {
    ...UNRESTRICT_ALL,
    can_add_web_page_previews: false,
  };
  if (ss.linkPolicy === 'newcomers') perms.can_add_web_page_previews = false;
  const r = await ctx.api.restrictMember(ctx.chat.id, user.id, perms, until);
  await nexusAudit(ctx, 'newcomer_probation', user.id, { until, policy: ss.linkPolicy });
  return !!r?.ok;
}

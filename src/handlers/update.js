// ═══════════════════════════════════════════════════════════
//  NEXUS — Main Update Handler
//  از worker.js اصلی منتقل شده — بدون حذف
// ═══════════════════════════════════════════════════════════

import { Utils } from '../lib/utils.js';
import { Log } from '../lib/log.js';
import { Views } from '../views/index.js';
import { detectIntent } from './intent-detect.js';
import { handleIntent } from './intent.js';
import { handleCallback } from './callback.js';
import { handleSessionInput } from './session.js';
import { runFilters, lazyExpiration } from './filters.js';
import { handleNewMembers, handleLeftMember } from './members.js';
import { processXP, checkGuessGame, checkTypeGame } from './games.js';
import { handleAIReply } from './ai.js';
import { nxPremiumCommand } from '../views/premium.js';
import { nxHandleCommand, nexusSecurityPipeline } from '../nexus/core.js';

// ═══════════════════════════════════════════════════════════
//  Smart Reply — Agentic edit-in-place for commands
// ═══════════════════════════════════════════════════════════
export async function smartReply(ctx, text, extra = {}) {
  const key = `last_msg:${ctx.chat.id}:${ctx.from.id}`;
  const last = await ctx.cache.get(key);
  if (last && last.id && (Date.now() - last.ts) < 60000) {
    const r = await ctx.api.editMessage(ctx.chat.id, last.id, text, extra);
    if (r.ok) {
      await ctx.cache.set(key, { id: last.id, ts: Date.now() }, 120);
      return r;
    }
  }
  const r = await ctx.send(text, extra);
  if (r?.ok) {
    await ctx.cache.set(key, { id: r.result.message_id, ts: Date.now() }, 120);
  }
  return r;
}

// ═══════════════════════════════════════════════════════════
//  Main Update Handler
// ═══════════════════════════════════════════════════════════
export async function handleUpdate(ctx) {
  if (ctx.isCallback) return handleCallback(ctx);
  if (!ctx.message) return;
  if (await nxPremiumCommand(ctx)) return;
  if (await nxHandleCommand(ctx)) return;

  if (ctx.from) ctx.ctx.waitUntil(ctx.db.upsertUser(ctx.from));
  if (ctx.chat) ctx.ctx.waitUntil(ctx.db.upsertChat(ctx.chat));

  if (ctx.isGroup()) ctx.ctx.waitUntil(lazyExpiration(ctx));

  if (ctx.isGroup()) {
    if (ctx.message.new_chat_members) return handleNewMembers(ctx);
    if (ctx.message.left_chat_member) return handleLeftMember(ctx);
  }

  if (ctx.isGroup() && ctx.from) {
    const p = await ctx.db.getPendingCaptcha(ctx.chat.id, ctx.from.id);
    if (p) {
      await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);
      return;
    }
  }

  if (ctx.from && !ctx.isCallback) {
    const s = await ctx.db.getSession(ctx.chat.id, ctx.from.id);
    if (s) return handleSessionInput(ctx, s);
  }

  if (ctx.isGroup() && ctx.from) {
    if (await nexusSecurityPipeline(ctx)) return;
    if (await runFilters(ctx)) return;
    ctx.ctx.waitUntil(ctx.db.incrementStat(ctx.chat.id, 'messages'));
    ctx.ctx.waitUntil(processXP(ctx));
  }

  if (ctx.isGroup() && ctx.from && ctx.text) {
    const s = await ctx.getSettings();
    if (s.recordMode?.enabled) {
      ctx.ctx.waitUntil(
        ctx.db.recordMessage(ctx.chat.id, ctx.from.id, ctx.message.message_id, ctx.text)
      );
    }
  }

  if (ctx.isGroup() && ctx.text) {
    const mention = ctx.text.match(/@([a-zA-Z0-9_\u0600-\u06FF]{3,32})/);
    if (mention) {
      const aliasUsers = await ctx.db.getAliasUsers(ctx.chat.id, mention[1]);
      if (aliasUsers.length) {
        const mentions = aliasUsers
          .map(u => Utils.mention({ id: u.user_id, first_name: u.first_name || 'کاربر' }))
          .join(' ');
        await ctx.send(
          `<b>@${Utils.escapeHtml(mention[1])}</b>\n\n${mentions}`
        );
        return;
      }
    }
  }

  if (ctx.isGroup() && ctx.text) {
    if (await checkGuessGame(ctx)) return;
    if (await checkTypeGame(ctx)) return;
  }

  if (ctx.isEdited) return;
  if (!ctx.text) return;

  if (ctx.isGroup() && ctx.text.startsWith('#')) {
    const n = ctx.text.slice(1).split(/\s+/)[0].toLowerCase();
    if (n) {
      const note = await ctx.db.getNote(ctx.chat.id, n);
      if (note) { await ctx.send(note.content); return; }
    }
  }

  if (ctx.isGroup()) {
    const s = await ctx.getSettings();
    if (s.shutup) return;
    if (s.smartTriggers) {
      const t = await ctx.db.findTrigger(ctx.chat.id, ctx.text);
      if (t) {
        const rendered = Utils.renderAdvancedTemplate(t.response, ctx);
        await ctx.reply(rendered);
        return;
      }
    }
  }

  const intent = detectIntent(ctx.text);
  if (intent) return handleIntent(ctx, intent);

  if (ctx.isGroup()) await handleAIReply(ctx);
}

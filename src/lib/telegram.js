// ═══════════════════════════════════════════════════════════
//  NEXUS — Telegram API
// ═══════════════════════════════════════════════════════════

import { Utils } from './utils.js';

export class TelegramAPI {
  constructor(env) {
    this.token = env.BOT_TOKEN || '';
    this.base = `https://api.telegram.org/bot${this.token}`;
  }
  async call(method, params = {}) {
    if (!this.token) return { ok: false, error: 'NO_TOKEN' };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetch(`${this.base}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      return await r.json();
    } catch (e) {
      clearTimeout(timer);
      return { ok: false, error: e.message };
    }
  }
  sendMessage(cid, text, extra = {}) {
    return this.call('sendMessage', {
      chat_id: cid, text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...extra,
    });
  }
  editMessage(cid, mid, text, extra = {}) {
    return this.call('editMessageText', {
      chat_id: cid, message_id: mid, text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...extra,
    });
  }
  deleteMessage(cid, mid) {
    return this.call('deleteMessage', { chat_id: cid, message_id: mid });
  }
  answerCallback(id, text = null, alert = false) {
    return this.call('answerCallbackQuery', {
      callback_query_id: id,
      text: text || undefined,
      show_alert: alert,
    });
  }
  getChatMember(cid, uid) {
    return this.call('getChatMember', { chat_id: cid, user_id: uid });
  }
  getChatMemberCount(cid) {
    return this.call('getChatMemberCount', { chat_id: cid });
  }
  getChatAdministrators(cid) {
    return this.call('getChatAdministrators', { chat_id: cid });
  }
  getMe() { return this.call('getMe'); }
  getChat(cid) { return this.call('getChat', { chat_id: cid }); }
  banMember(cid, uid, until = 0) {
    const p = { chat_id: cid, user_id: uid };
    if (until > 0) p.until_date = until;
    return this.call('banChatMember', p);
  }
  unbanMember(cid, uid) {
    return this.call('unbanChatMember', {
      chat_id: cid, user_id: uid, only_if_banned: true,
    });
  }
  restrictMember(cid, uid, perms, until = 0) {
    const p = { chat_id: cid, user_id: uid, permissions: perms };
    if (until > 0) p.until_date = until;
    return this.call('restrictChatMember', p);
  }
  setChatAdministratorCustomTitle(cid, uid, title) {
    return this.call('setChatAdministratorCustomTitle', {
      chat_id: cid, user_id: uid, custom_title: title,
    });
  }
  promoteMember(cid, uid, rights = {}) {
    return this.call('promoteChatMember', {
      chat_id: cid, user_id: uid,
      can_manage_chat: true,
      can_delete_messages: true,
      can_manage_video_chats: true,
      can_restrict_members: true,
      can_promote_members: false,
      can_change_info: true,
      can_invite_users: true,
      can_pin_messages: true,
      ...rights,
    });
  }
  demoteMember(cid, uid) {
    return this.call('promoteChatMember', {
      chat_id: cid, user_id: uid,
      can_manage_chat: false,
      can_delete_messages: false,
      can_manage_video_chats: false,
      can_restrict_members: false,
      can_promote_members: false,
      can_change_info: false,
      can_invite_users: false,
      can_pin_messages: false,
    });
  }
  setChatTitle(cid, title) {
    return this.call('setChatTitle', { chat_id: cid, title });
  }
  setChatDescription(cid, desc) {
    return this.call('setChatDescription', { chat_id: cid, description: desc });
  }
  pinChatMessage(cid, mid, silent = true) {
    return this.call('pinChatMessage', {
      chat_id: cid, message_id: mid, disable_notification: silent,
    });
  }
  unpinChatMessage(cid, mid) {
    return mid
      ? this.call('unpinChatMessage', { chat_id: cid, message_id: mid })
      : this.call('unpinAllChatMessages', { chat_id: cid });
  }
  exportChatInviteLink(cid) {
    return this.call('exportChatInviteLink', { chat_id: cid });
  }
  sendDocument(cid, url, caption = '', extra = {}) {
    return this.call('sendDocument', {
      chat_id: cid, document: url, caption,
      parse_mode: 'HTML', ...extra,
    });
  }
  sendPoll(cid, question, options, opts = {}) {
    return this.call('sendPoll', {
      chat_id: cid,
      question: question.slice(0, 300),
      options: options.map(o => ({ text: o.slice(0, 100) })),
      is_anonymous: opts.anonymous !== false,
      type: 'regular',
      allows_multiple_answers: false,
    });
  }
  setWebhook(url, secret) {
    return this.call('setWebhook', {
      url,
      secret_token: secret || undefined,
      allowed_updates: [
        'message', 'edited_message', 'channel_post', 'edited_channel_post',
        'inline_query', 'chosen_inline_result', 'callback_query',
        'shipping_query', 'pre_checkout_query', 'purchased_paid_media',
        'poll', 'poll_answer', 'my_chat_member', 'chat_member',
        'chat_join_request', 'business_connection', 'business_message',
        'edited_business_message', 'deleted_business_messages',
        'message_reaction', 'message_reaction_count', 'chat_boost',
        'removed_chat_boost', 'paid_message_price_changed',
        'direct_message_price_changed', 'suggested_post_approved',
        'suggested_post_approval_failed', 'suggested_post_declined',
        'suggested_post_paid', 'suggested_post_refunded',
      ],
      drop_pending_updates: false,
    });
  }
  getWebhookInfo() { return this.call('getWebhookInfo'); }
  sendChatAction(cid, action) {
    return this.call('sendChatAction', { chat_id: cid, action });
  }
  setMyCommands(commands, scope = { type: 'default' }) {
    return this.call('setMyCommands', { commands, scope });
  }
  setChatMenuButton(cid, text, url) {
    return this.call('setChatMenuButton', { chat_id: cid, menu_button: { type: 'web_app', text, web_app: { url } } });
  }
  setChatMemberTag(cid, uid, tag) {
    return this.call('setChatMemberTag', { chat_id: cid, user_id: uid, tag });
  }
  sendMessageDraft(cid, draftId, text, extra = {}) {
    return this.call('sendMessageDraft', { chat_id: cid, draft_id: draftId, text, ...extra });
  }
}

// ── Extend with NEXUS card sender (from v14 layer) ──
TelegramAPI.prototype.sendNexusCard = async function(chatId, title, body, buttons=[]) {
  const text = `<b>◈ ${Utils.escapeHtml(title)}</b>\n${body}`;
  const reply_markup = buttons.length ? {inline_keyboard: buttons} : undefined;
  try {
    if (typeof this.call === 'function') {
      const rich = await this.call('sendRichMessage', { chat_id:chatId, rich_message:{blocks:[{type:'paragraph',text}]}, reply_markup });
      if (rich?.ok) return rich;
    }
  } catch {}
  return this.sendMessage(chatId, text, reply_markup ? {reply_markup} : {});
};

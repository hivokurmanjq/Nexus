// ═══════════════════════════════════════════════════════════
//  NEXUS — Context
// ═══════════════════════════════════════════════════════════

import { Database } from './database.js';
import { Cache } from './cache.js';
import { TelegramAPI } from './telegram.js';
import { AIEngine } from './ai.js';
import { LANG } from '../config/constants.js';
import { DEFAULT_SETTINGS } from '../config/defaults.js';

export class Context {
  constructor(update, env, ctx) {
    this.update = update;
    this.env = env;
    this.ctx = ctx;
    this.db = new Database(env);
    this.cache = new Cache(env);
    this.api = new TelegramAPI(env);
    this.ai = new AIEngine(env);
    this.message = update.message || update.edited_message || null;
    this.callback = update.callback_query || null;
    this.isCallback = !!update.callback_query;
    this.isEdited = !!update.edited_message;

    if (this.message) {
      this.chat = this.message.chat;
      this.from = this.message.from;
      this.text = (this.message.text || this.message.caption || '').trim();
    } else if (this.callback) {
      this.chat = this.callback.message?.chat;
      this.from = this.callback.from;
      this.text = this.callback.data || '';
    }
  }
  isGroup() {
    return this.chat && ['group', 'supergroup'].includes(this.chat.type);
  }
  isPrivate() {
    return this.chat && this.chat.type === 'private';
  }
  isOwner() {
    return String(this.from?.id) === String(this.env.OWNER_ID);
  }
  reply(text, extra = {}) {
    if (!this.chat) return null;
    return this.api.sendMessage(this.chat.id, text, {
      reply_to_message_id: this.message?.message_id,
      ...extra,
    });
  }
  send(text, extra = {}) {
    if (!this.chat) return null;
    return this.api.sendMessage(this.chat.id, text, extra);
  }
  editText(text, extra = {}) {
    if (this.callback && this.chat) {
      return this.api.editMessage(
        this.chat.id,
        this.callback.message.message_id,
        text,
        extra
      );
    }
    return null;
  }
  answer(text = null, alert = false) {
    if (this.callback) return this.api.answerCallback(this.callback.id, text, alert);
    return null;
  }
  async isAdmin(userId = null) {
    const uid = userId || this.from?.id;
    if (!uid || !this.chat) return false;
    if (String(uid) === String(this.env.OWNER_ID)) return true;
    const k = `admin:${this.chat.id}:${uid}`;
    const c = await this.cache.get(k);
    if (c !== null) return c;
    const r = await this.api.getChatMember(this.chat.id, uid);
    if (!r.ok) return false;
    const a = ['creator', 'administrator'].includes(r.result.status);
    await this.cache.set(k, a, 60);
    return a;
  }
  async isOwnerOfGroup() {
    if (!this.chat) return false;
    const r = await this.api.getChatMember(this.chat.id, this.from?.id);
    return r.ok && r.result.status === 'creator';
  }
  async getSettings() {
    if (!this.chat) return DEFAULT_SETTINGS;
    const k = `settings:${this.chat.id}`;
    const c = await this.cache.get(k);
    if (c) return c;
    const s = await this.db.getSettings(this.chat.id);
    await this.cache.set(k, s, 600);
    return s;
  }
  async updateSettings(fn) {
    if (!this.chat) return;
    const c = await this.getSettings();
    const u = fn(c);
    await this.db.saveSettings(this.chat.id, u);
    await this.cache.del(`settings:${this.chat.id}`);
    return u;
  }
  t(key) {
    const lang = this.settings?.language || 'fa';
    return LANG[lang]?.[key] || LANG.fa[key] || key;
  }
}

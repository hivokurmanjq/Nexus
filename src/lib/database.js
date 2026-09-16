// ═══════════════════════════════════════════════════════════
//  NEXUS — Database Layer (D1 + KV)
//  Part 1/2
// ═══════════════════════════════════════════════════════════

import { Log } from './log.js';
import { Utils } from './utils.js';
import { Levels } from './utils.js';
import { DEFAULT_SETTINGS } from '../config/defaults.js';

export class Database {
  constructor(env) {
    this.db = env.DB || null;
    this.kv = env.CACHE || null;
  }

  async execute(sql, params = []) {
    if (!this.db) return false;
    try {
      const stmt = this.db.prepare(sql);
      return params.length ? await stmt.bind(...params).run() : await stmt.run();
    } catch (e) {
      Log.error('db_execute', { err: e.message });
      return false;
    }
  }

  async first(sql, params = []) {
    if (!this.db) return null;
    try {
      const stmt = this.db.prepare(sql);
      return params.length ? await stmt.bind(...params).first() : await stmt.first();
    } catch { return null; }
  }

  async all(sql, params = []) {
    if (!this.db) return [];
    try {
      const stmt = this.db.prepare(sql);
      const r = params.length ? await stmt.bind(...params).all() : await stmt.all();
      return r.results || [];
    } catch { return []; }
  }

  async kvGet(key) {
    if (!this.kv) return null;
    try { return await this.kv.get(key, { type: 'json' }); }
    catch { return null; }
  }
  async kvSet(key, value, ttl = 300) {
    if (!this.kv) return false;
    try {
      await this.kv.put(key, JSON.stringify(value), { expirationTtl: ttl });
      return true;
    } catch { return false; }
  }
  async kvDel(key) {
    if (!this.kv) return false;
    try { await this.kv.delete(key); return true; } catch { return false; }
  }

  upsertChat(c) {
    return this.execute(
      `INSERT INTO chats (id,title,type,username) VALUES (?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET title=excluded.title,type=excluded.type,username=excluded.username`,
      [c.id, c.title || null, c.type, c.username || null]
    );
  }

  upsertUser(u) {
    return this.execute(
      `INSERT INTO users (id,first_name,last_name,username,is_bot) VALUES (?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET first_name=excluded.first_name,last_seen=unixepoch()`,
      [u.id, u.first_name || null, u.last_name || null, u.username || null, u.is_bot ? 1 : 0]
    );
  }

  async getSettings(chatId) {
    const r = await this.first('SELECT settings FROM chat_settings WHERE chat_id=?', [chatId]);
    return Utils.deepMerge(DEFAULT_SETTINGS, r ? Utils.safeJson(r.settings, {}) : {});
  }
  saveSettings(chatId, s) {
    return this.execute(
      `INSERT INTO chat_settings (chat_id,settings,updated_at) VALUES (?,?,unixepoch())
       ON CONFLICT(chat_id) DO UPDATE SET settings=excluded.settings,updated_at=unixepoch()`,
      [chatId, JSON.stringify(s)]
    );
  }

  async addWarn(cid, uid, aid, reason) {
    await this.execute(
      `INSERT INTO warnings (chat_id,user_id,admin_id,reason) VALUES (?,?,?,?)`,
      [cid, uid, aid, reason || 'بدون دلیل']
    );
    const r = await this.first(
      `SELECT COUNT(*) as c FROM warnings WHERE chat_id=? AND user_id=?`,
      [cid, uid]
    );
    return r ? r.c : 1;
  }
  resetWarns(cid, uid) {
    return this.execute(`DELETE FROM warnings WHERE chat_id=? AND user_id=?`, [cid, uid]);
  }
  async getWarns(cid, uid) {
    const r = await this.first(
      `SELECT COUNT(*) as c FROM warnings WHERE chat_id=? AND user_id=?`,
      [cid, uid]
    );
    return r ? r.c : 0;
  }

  async getBlacklistWords(cid) {
    const key = `bw:${cid}`;
    let cached = await this.kvGet(key);
    if (cached) return cached;
    const words = (await this.all(`SELECT word FROM blacklist_words WHERE chat_id=?`, [cid])).map(r => r.word);
    await this.kvSet(key, words, 600);
    return words;
  }
  async addBlacklistWord(cid, w) {
    await this.execute(`INSERT OR IGNORE INTO blacklist_words (chat_id,word) VALUES (?,?)`, [cid, w.toLowerCase()]);
    await this.kvDel(`bw:${cid}`);
  }
  async clearBlacklistWords(cid) {
    await this.execute(`DELETE FROM blacklist_words WHERE chat_id=?`, [cid]);
    await this.kvDel(`bw:${cid}`);
  }

  async getWhitelistLinks(cid) {
    const key = `wl:${cid}`;
    let cached = await this.kvGet(key);
    if (cached) return cached;
    const links = (await this.all(`SELECT domain FROM whitelist_links WHERE chat_id=?`, [cid])).map(r => r.domain);
    await this.kvSet(key, links, 600);
    return links;
  }
  async addWhitelistLink(cid, d) {
    await this.execute(`INSERT OR IGNORE INTO whitelist_links (chat_id,domain) VALUES (?,?)`, [cid, d.toLowerCase()]);
    await this.kvDel(`wl:${cid}`);
  }
  async clearWhitelistLinks(cid) {
    await this.execute(`DELETE FROM whitelist_links WHERE chat_id=?`, [cid]);
    await this.kvDel(`wl:${cid}`);
  }

  incrementStat(cid, field) {
    const d = new Date().toISOString().slice(0, 10);
    const allowed = ['messages','new_users','left_users','bans','mutes','warns','kicks','deletions'];
    if (!allowed.includes(field)) return false;
    return this.execute(
      `INSERT INTO daily_stats (chat_id,date,${field}) VALUES (?,?,1)
       ON CONFLICT(chat_id,date) DO UPDATE SET ${field}=${field}+1`,
      [cid, d]
    );
  }
  async getTodayStats(cid) {
    const d = new Date().toISOString().slice(0, 10);
    return await this.first(
      'SELECT * FROM daily_stats WHERE chat_id=? AND date=?',
      [cid, d]
    ) || {};
  }
  async getWeekStats(cid) {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ date: d.toISOString().slice(0, 10), day: d.getDay() });
    }
    const start = days[0].date;
    const rows = await this.all(
      `SELECT date,messages,bans,deletions FROM daily_stats WHERE chat_id=? AND date>=?`,
      [cid, start]
    );
    const map = new Map(rows.map(r => [r.date, r]));
    return days.map(d => ({
      date: d.date,
      day: d.day,
      messages: map.get(d.date)?.messages || 0,
      bans: map.get(d.date)?.bans || 0,
      deletions: map.get(d.date)?.deletions || 0,
    }));
  }

  savePendingCaptcha(cid, uid, ans, mid, t) {
    const e = Math.floor(Date.now() / 1000) + t;
    return this.execute(
      `INSERT INTO captcha_pending (chat_id,user_id,answer,message_id,expires_at)
       VALUES (?,?,?,?,?)
       ON CONFLICT(chat_id,user_id) DO UPDATE SET
         answer=excluded.answer,message_id=excluded.message_id,
         expires_at=excluded.expires_at,attempts=0`,
      [cid, uid, ans, mid, e]
    );
  }
  getPendingCaptcha(cid, uid) {
    return this.first(
      `SELECT * FROM captcha_pending WHERE chat_id=? AND user_id=? AND expires_at>unixepoch()`,
      [cid, uid]
    );
  }
  deletePendingCaptcha(cid, uid) {
    return this.execute(`DELETE FROM captcha_pending WHERE chat_id=? AND user_id=?`, [cid, uid]);
  }
  incrementCaptchaAttempt(cid, uid) {
    return this.execute(
      `UPDATE captcha_pending SET attempts=attempts+1 WHERE chat_id=? AND user_id=?`,
      [cid, uid]
    );
  }

  logRaidJoin(cid, uid) {
    return this.execute(`INSERT INTO raid_events (chat_id,user_id) VALUES (?,?)`, [cid, uid]);
  }
  async getRecentJoins(cid, w) {
    const s = Math.floor(Date.now() / 1000) - w;
    const r = await this.first(
      `SELECT COUNT(*) as c FROM raid_events WHERE chat_id=? AND joined_at>=?`,
      [cid, s]
    );
    return r?.c || 0;
  }

  saveNote(cid, n, c, uid) {
    return this.execute(
      `INSERT INTO notes (chat_id,name,content,created_by) VALUES (?,?,?,?)
       ON CONFLICT(chat_id,name) DO UPDATE SET content=excluded.content`,
      [cid, n.toLowerCase(), c, uid]
    );
  }
  getNote(cid, n) {
    return this.first(`SELECT * FROM notes WHERE chat_id=? AND name=?`, [cid, n.toLowerCase()]);
  }
  listNotes(cid) {
    return this.all(`SELECT name FROM notes WHERE chat_id=? ORDER BY name`, [cid]);
  }
  clearNotes(cid) {
    return this.execute(`DELETE FROM notes WHERE chat_id=?`, [cid]);
  }
  async findNote(cid, name) {
    const aliases = [name, 'rules', 'قوانین', 'rule'];
    for (const a of aliases) {
      const n = await this.getNote(cid, a);
      if (n) return n;
    }
    return null;
  }

  async saveTrigger(cid, k, r, uid) {
    await this.execute(
      `INSERT INTO triggers (chat_id,keyword,response,created_by) VALUES (?,?,?,?)
       ON CONFLICT(chat_id,keyword) DO UPDATE SET response=excluded.response`,
      [cid, k.toLowerCase(), r, uid]
    );
    await this.kvDel(`trg:${cid}`);
  }
  async getTriggers(cid) {
    const key = `trg:${cid}`;
    let cached = await this.kvGet(key);
    if (cached) return cached;
    const list = await this.all(`SELECT * FROM triggers WHERE chat_id=?`, [cid]);
    await this.kvSet(key, list, 300);
    return list;
  }
  async findTrigger(cid, text) {
    const t = await this.getTriggers(cid);
    if (!t.length) return null;
    const n = Utils.normalize(text);
    const tokens = n.split(' ');
    for (const tr of t) {
      const nk = Utils.normalize(tr.keyword);
      if (n === nk || tokens.includes(nk)) return tr;
    }
    return null;
  }
  async clearTriggers(cid) {
    await this.execute(`DELETE FROM triggers WHERE chat_id=?`, [cid]);
    await this.kvDel(`trg:${cid}`);
  }

  setSession(cid, uid, a, d = null, t = 300) {
    const e = Math.floor(Date.now() / 1000) + t;
    return this.execute(
      `INSERT INTO user_sessions (chat_id,user_id,action,data,expires_at) VALUES (?,?,?,?,?)
       ON CONFLICT(chat_id,user_id) DO UPDATE SET
         action=excluded.action,data=excluded.data,expires_at=excluded.expires_at`,
      [cid, uid, a, d ? JSON.stringify(d) : null, e]
    );
  }
  async getSession(cid, uid) {
    const s = await this.first(
      `SELECT * FROM user_sessions WHERE chat_id=? AND user_id=? AND expires_at>unixepoch()`,
      [cid, uid]
    );
    if (s && s.data) s.data = Utils.safeJson(s.data, null);
    return s;
  }
  clearSession(cid, uid) {
    return this.execute(`DELETE FROM user_sessions WHERE chat_id=? AND user_id=?`, [cid, uid]);
  }

  async getUserStats(cid, uid) {
    const s = await this.first(`SELECT * FROM user_stats WHERE chat_id=? AND user_id=?`, [cid, uid]);
    if (!s) return {
      chat_id: cid, user_id: uid, messages: 0, xp: 0, level: 1,
      last_message: 0, streak_days: 0, last_active_date: null,
      wins: 0, losses: 0, games_played: 0,
    };
    return s;
  }
  async addXP(cid, uid, amount) {
    const s = await this.getUserStats(cid, uid);
    const now = Math.floor(Date.now() / 1000);
    const nxp = s.xp + amount;
    const nl = Levels.levelFromXP(nxp);
    const up = nl > s.level;
    const today = new Date().toISOString().slice(0, 10);
    let streak = s.streak_days;
    if (s.last_active_date !== today) {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      streak = s.last_active_date === y.toISOString().slice(0, 10) ? streak + 1 : 1;
    }
    await this.execute(
      `INSERT INTO user_stats (chat_id,user_id,messages,xp,level,last_message,streak_days,last_active_date)
       VALUES (?,?,1,?,?,?,?,?)
       ON CONFLICT(chat_id,user_id) DO UPDATE SET
         messages=messages+1,xp=xp+?,level=?,last_message=?,streak_days=?,last_active_date=?`,
      [cid, uid, nxp, nl, now, streak, today, amount, nl, now, streak, today]
    );
    return { leveledUp: up, oldLevel: s.level, newLevel: nl, newXP: nxp, streak };
  }
  getLeaderboard(cid, limit = 10) {
    return this.all(
      `SELECT s.*,u.first_name,u.username FROM user_stats s
       LEFT JOIN users u ON u.id=s.user_id
       WHERE s.chat_id=? ORDER BY s.xp DESC LIMIT ?`,
      [cid, limit]
    );
  }
  async getUserRank(cid, uid) {
    const r = await this.first(
      `SELECT COUNT(*)+1 as rank FROM user_stats WHERE chat_id=? AND xp>(SELECT xp FROM user_stats WHERE chat_id=? AND user_id=?)`,
      [cid, cid, uid]
    );
    return r?.rank || null;
  }

  async unlockAchievement(cid, uid, a) {
    const e = await this.first(
      `SELECT 1 FROM user_achievements WHERE chat_id=? AND user_id=? AND achievement=?`,
      [cid, uid, a]
    );
    if (e) return false;
    await this.execute(
      `INSERT INTO user_achievements (chat_id,user_id,achievement) VALUES (?,?,?)`,
      [cid, uid, a]
    );
    return true;
  }
  async getUserAchievements(cid, uid) {
    return (await this.all(
      `SELECT achievement FROM user_achievements WHERE chat_id=? AND user_id=?`,
      [cid, uid]
    )).map(r => r.achievement);
  }

  createGame(gid, cid, gt, uid, data) {
    const e = Math.floor(Date.now() / 1000) + 300;
    return this.execute(
      `INSERT INTO active_games (id,chat_id,game_type,creator_id,data,expires_at) VALUES (?,?,?,?,?,?)`,
      [gid, cid, gt, uid, JSON.stringify(data), e]
    );
  }
  async getGame(gid) {
    const g = await this.first(
      `SELECT * FROM active_games WHERE id=? AND expires_at>unixepoch()`,
      [gid]
    );
    if (g && g.data) g.data = Utils.safeJson(g.data, {});
    return g;
  }
  async getActiveGame(cid, type) {
    const g = await this.first(
      `SELECT * FROM active_games WHERE chat_id=? AND game_type=? AND state='waiting' AND expires_at>unixepoch() LIMIT 1`,
      [cid, type]
    );
    if (g && g.data) g.data = Utils.safeJson(g.data, {});
    return g;
  }
  updateGame(gid, data, state = null) {
    if (state) return this.execute(
      `UPDATE active_games SET data=?,state=? WHERE id=?`,
      [JSON.stringify(data), state, gid]
    );
    return this.execute(
      `UPDATE active_games SET data=? WHERE id=?`,
      [JSON.stringify(data), gid]
    );
  }
  deleteGame(gid) {
    return this.execute(`DELETE FROM active_games WHERE id=?`, [gid]);
  }
  async recordGameResult(cid, uid, gt, r, xp) {
    await this.execute(
      `INSERT INTO game_history (chat_id,user_id,game_type,result,xp_change) VALUES (?,?,?,?,?)`,
      [cid, uid, gt, r, xp]
    );
    if (r === 'win') {
      await this.execute(
        `UPDATE user_stats SET wins=wins+1,games_played=games_played+1 WHERE chat_id=? AND user_id=?`,
        [cid, uid]
      );
      const s = await this.first(
        `SELECT wins FROM user_stats WHERE chat_id=? AND user_id=?`,
        [cid, uid]
      );
      if (s?.wins === 10) await this.unlockAchievement(cid, uid, 'win_10');
    } else if (r === 'loss') {
      await this.execute(
        `UPDATE user_stats SET losses=losses+1,games_played=games_played+1 WHERE chat_id=? AND user_id=?`,
        [cid, uid]
      );
    } else {
      await this.execute(
        `UPDATE user_stats SET games_played=games_played+1 WHERE chat_id=? AND user_id=?`,
        [cid, uid]
      );
    }
  }

  async createDashboardToken(userId) {
    const token = Utils.randomToken(48);
    const expires = Math.floor(Date.now() / 1000) + 86400 * 7;
    await this.execute(
      `INSERT INTO dashboard_tokens (token,user_id,expires_at) VALUES (?,?,?)`,
      [token, userId, expires]
    );
    return token;
  }
  async validateToken(token) {
    return await this.first(
      `SELECT * FROM dashboard_tokens WHERE token=? AND expires_at>unixepoch()`,
      [token]
    );
  }

  async getGlobalStats() {
    const chats = await this.first(`SELECT COUNT(*) as c FROM chats WHERE is_active=1`);
    const users = await this.first(`SELECT COUNT(*) as c FROM users WHERE is_bot=0`);
    const today = new Date().toISOString().slice(0, 10);
    const msgs = await this.first(
      `SELECT SUM(messages) as m,SUM(bans) as b,SUM(deletions) as d FROM daily_stats WHERE date=?`,
      [today]
    );
    return {
      chats: chats?.c || 0,
      users: users?.c || 0,
      messages_today: msgs?.m || 0,
      bans_today: msgs?.b || 0,
      deletions_today: msgs?.d || 0,
    };
  }
  getAllChats() {
    return this.all(`SELECT * FROM chats WHERE is_active=1 ORDER BY id DESC LIMIT 100`);
  }

  logAction(cid, aid, tid, action, details = null) {
    return this.execute(
      `INSERT INTO action_logs (chat_id,admin_id,target_id,action,details) VALUES (?,?,?,?,?)`,
      [cid, aid, tid, action, details]
    );
  }
  getLogs(cid, limit = 20) {
    return this.all(
      `SELECT l.*, a.first_name as admin_name, t.first_name as target_name
       FROM action_logs l
       LEFT JOIN users a ON a.id=l.admin_id
       LEFT JOIN users t ON t.id=l.target_id
       WHERE l.chat_id=?
       ORDER BY l.created_at DESC LIMIT ?`,
      [cid, limit]
    );
  }

  async getChatExt(cid) {
    const r = await this.first(`SELECT * FROM chat_ext WHERE chat_id=?`, [cid]);
    return r || {
      chat_id: cid,
      log_channel: null,
      reports_enabled: 1,
      anti_channel: 1,
      approval_mode: 0,
      invite_link: null,
    };
  }
  saveChatExt(cid, data) {
    return this.execute(
      `INSERT INTO chat_ext (chat_id,log_channel,reports_enabled,anti_channel,approval_mode,invite_link)
       VALUES (?,?,?,?,?,?)
       ON CONFLICT(chat_id) DO UPDATE SET
         log_channel=excluded.log_channel,
         reports_enabled=excluded.reports_enabled,
         anti_channel=excluded.anti_channel,
         approval_mode=excluded.approval_mode,
         invite_link=excluded.invite_link`,
      [cid, data.log_channel, data.reports_enabled, data.anti_channel, data.approval_mode, data.invite_link]
    );
  }

  getReports(cid, limit = 20) {
    return this.all(
      `SELECT r.*, u.first_name as reporter FROM reports r
       LEFT JOIN users u ON u.id=r.reporter_id
       WHERE r.chat_id=? AND r.status='pending'
       ORDER BY r.created_at DESC LIMIT ?`,
      [cid, limit]
    );
  }

  createScheduled(cid, text, sendAt, repeat, uid) {
    return this.execute(
      `INSERT INTO scheduled_messages (chat_id,text,send_at,repeat_interval,created_by) VALUES (?,?,?,?,?)`,
      [cid, text, sendAt, repeat || 0, uid]
    );
  }
  getPendingScheduled() {
    const now = Math.floor(Date.now() / 1000);
    return this.all(
      `SELECT * FROM scheduled_messages WHERE active=1 AND send_at<=?`,
      [now]
    );
  }
  listScheduled(cid) {
    return this.all(
      `SELECT * FROM scheduled_messages WHERE chat_id=? AND active=1 ORDER BY send_at`,
      [cid]
    );
  }
  markScheduledSent(id, repeat) {
    if (repeat > 0) {
      const nextAt = Math.floor(Date.now() / 1000) + repeat;
      return this.execute(`UPDATE scheduled_messages SET send_at=? WHERE id=?`, [nextAt, id]);
    }
    return this.execute(`UPDATE scheduled_messages SET active=0 WHERE id=?`, [id]);
  }
  deleteScheduled(id, cid) {
    return this.execute(
      `DELETE FROM scheduled_messages WHERE id=? AND chat_id=?`,
      [id, cid]
    );
  }
    // ═══════════════════════════════════════════════════════════
  //  Federation
  // ═══════════════════════════════════════════════════════════

  async createFederation(name, ownerId) {
    try {
      await this.execute(
        `INSERT INTO federations (name,owner_id) VALUES (?,?)`,
        [name.toLowerCase(), ownerId]
      );
      const f = await this.first(`SELECT * FROM federations WHERE name=?`, [name.toLowerCase()]);
      return f;
    } catch { return null; }
  }
  getFederation(name) {
    return this.first(`SELECT * FROM federations WHERE name=?`, [name.toLowerCase()]);
  }
  joinFederation(fedId, cid) {
    return this.execute(
      `INSERT OR IGNORE INTO fed_chats (fed_id,chat_id) VALUES (?,?)`,
      [fedId, cid]
    );
  }
  leaveFederation(fedId, cid) {
    return this.execute(`DELETE FROM fed_chats WHERE fed_id=? AND chat_id=?`, [fedId, cid]);
  }
  getChatFederation(cid) {
    return this.first(
      `SELECT f.* FROM federations f JOIN fed_chats fc ON fc.fed_id=f.id WHERE fc.chat_id=?`,
      [cid]
    );
  }
  getFederationChats(fedId) {
    return this.all(`SELECT chat_id FROM fed_chats WHERE fed_id=?`, [fedId]);
  }
  addFedBan(fedId, uid, reason, by) {
    return this.execute(
      `INSERT OR REPLACE INTO fed_bans (fed_id,user_id,reason,banned_by) VALUES (?,?,?,?)`,
      [fedId, uid, reason, by]
    );
  }
  removeFedBan(fedId, uid) {
    return this.execute(`DELETE FROM fed_bans WHERE fed_id=? AND user_id=?`, [fedId, uid]);
  }
  isFedBanned(fedId, uid) {
    return this.first(`SELECT 1 FROM fed_bans WHERE fed_id=? AND user_id=?`, [fedId, uid]);
  }
  getFedBans(fedId, limit = 30) {
    return this.all(
      `SELECT * FROM fed_bans WHERE fed_id=? ORDER BY created_at DESC LIMIT ?`,
      [fedId, limit]
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  Reputation
  // ═══════════════════════════════════════════════════════════

  async changeRep(cid, uid, delta) {
    await this.execute(
      `INSERT INTO reputation (chat_id,user_id,score) VALUES (?,?,?)
       ON CONFLICT(chat_id,user_id) DO UPDATE SET score = score + ?`,
      [cid, uid, delta, delta]
    );
    const r = await this.first(
      `SELECT score FROM reputation WHERE chat_id=? AND user_id=?`,
      [cid, uid]
    );
    return r?.score || delta;
  }
  async getRep(cid, uid) {
    const r = await this.first(
      `SELECT score FROM reputation WHERE chat_id=? AND user_id=?`,
      [cid, uid]
    );
    return r?.score || 0;
  }
  getRepTop(cid, limit = 10) {
    return this.all(
      `SELECT r.*, u.first_name FROM reputation r
       LEFT JOIN users u ON u.id=r.user_id
       WHERE r.chat_id=? ORDER BY r.score DESC LIMIT ?`,
      [cid, limit]
    );
  }
  getLastRep(cid, fromId, toId) {
    return this.first(
      `SELECT created_at FROM rep_history WHERE chat_id=? AND from_id=? AND to_id=? ORDER BY created_at DESC LIMIT 1`,
      [cid, fromId, toId]
    );
  }
  logRep(cid, fromId, toId, delta) {
    return this.execute(
      `INSERT INTO rep_history (chat_id,from_id,to_id,delta) VALUES (?,?,?,?)`,
      [cid, fromId, toId, delta]
    );
  }
  cleanReputationForUser(cid, uid) {
    return Promise.all([
      this.execute(`DELETE FROM reputation WHERE chat_id=? AND user_id=?`, [cid, uid]),
      this.execute(`DELETE FROM rep_history WHERE chat_id=? AND (from_id=? OR to_id=?)`, [cid, uid, uid]),
    ]);
  }

  // ═══════════════════════════════════════════════════════════
  //  Invites
  // ═══════════════════════════════════════════════════════════

  async addInvite(cid, uid) {
    await this.execute(
      `INSERT INTO invites (chat_id,user_id,count) VALUES (?,?,1)
       ON CONFLICT(chat_id,user_id) DO UPDATE SET count=count+1`,
      [cid, uid]
    );
    const r = await this.first(
      `SELECT count FROM invites WHERE chat_id=? AND user_id=?`,
      [cid, uid]
    );
    return r?.count || 1;
  }
  getInviteTop(cid, limit = 10) {
    return this.all(
      `SELECT i.*, u.first_name FROM invites i
       LEFT JOIN users u ON u.id=i.user_id
       WHERE i.chat_id=? ORDER BY i.count DESC LIMIT ?`,
      [cid, limit]
    );
  }
  getInviteCount(cid, uid) {
    return this.first(`SELECT count FROM invites WHERE chat_id=? AND user_id=?`, [cid, uid]);
  }

  // ═══════════════════════════════════════════════════════════
  //  Global Blacklist
  // ═══════════════════════════════════════════════════════════

  addGlobalBan(uid, reason, by) {
    return this.execute(
      `INSERT OR REPLACE INTO global_blacklist (user_id,reason,banned_by) VALUES (?,?,?)`,
      [uid, reason, by]
    );
  }
  removeGlobalBan(uid) {
    return this.execute(`DELETE FROM global_blacklist WHERE user_id=?`, [uid]);
  }
  isGlobalBanned(uid) {
    return this.first(`SELECT 1 FROM global_blacklist WHERE user_id=?`, [uid]);
  }
  getGlobalBans(limit = 50) {
    return this.all(
      `SELECT * FROM global_blacklist ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  Rate Limiting
  // ═══════════════════════════════════════════════════════════

  async checkRate(key, max, windowSec) {
    const now = Math.floor(Date.now() / 1000);
    await this.execute(
      `INSERT INTO rate_limits (key,count,window_start) VALUES (?,1,?)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE WHEN ? - window_start > ? THEN 1 ELSE count + 1 END,
         window_start = CASE WHEN ? - window_start > ? THEN ? ELSE window_start END`,
      [key, now, now, windowSec, now, windowSec, now]
    );
    const r = await this.first(
      `SELECT count, window_start FROM rate_limits WHERE key=?`,
      [key]
    );
    if (!r) return { allowed: true, remaining: max - 1 };
    if (r.count > max) {
      return {
        allowed: false,
        remaining: 0,
        retry: Math.max(1, windowSec - (now - r.window_start)),
      };
    }
    return { allowed: true, remaining: Math.max(0, max - r.count) };
  }

  // ═══════════════════════════════════════════════════════════
  //  Backup
  // ═══════════════════════════════════════════════════════════

  logBackup(cid, size) {
    return this.execute(`INSERT INTO backup_logs (chat_id,size_bytes) VALUES (?,?)`, [cid, size]);
  }
  getLastBackup(cid) {
    return this.first(
      `SELECT * FROM backup_logs WHERE chat_id=? ORDER BY created_at DESC LIMIT 1`,
      [cid]
    );
  }
  async getFullBackup(cid) {
    const s = await this.getSettings(cid);
    const notes = await this.all(`SELECT * FROM notes WHERE chat_id=?`, [cid]);
    const triggers = await this.all(`SELECT * FROM triggers WHERE chat_id=?`, [cid]);
    const words = await this.all(`SELECT word FROM blacklist_words WHERE chat_id=?`, [cid]);
    const links = await this.all(`SELECT domain FROM whitelist_links WHERE chat_id=?`, [cid]);
    const aliases = await this.all(
      `SELECT name, user_id FROM aliases WHERE chat_id=?`,
      [cid]
    );
    const ext = await this.getChatExt(cid);
    const chain = await this.all(`SELECT * FROM warn_chain WHERE chat_id=?`, [cid]);
    return {
      version: '13.0',
      chat_id: cid,
      timestamp: new Date().toISOString(),
      settings: s,
      notes: notes.map(n => ({ name: n.name, content: n.content, created_by: n.created_by })),
      triggers: triggers.map(t => ({ keyword: t.keyword, response: t.response })),
      blacklist: words.map(w => w.word),
      whitelist: links.map(l => l.domain),
      aliases: aliases.map(a => ({ name: a.name, user_id: a.user_id })),
      chat_ext: ext,
      warn_chain: chain,
    };
  }
  async restoreBackup(cid, data) {
    try {
      if (data.settings) await this.saveSettings(cid, data.settings);
      if (data.notes) {
        for (const n of data.notes) {
          await this.saveNote(cid, n.name, n.content, n.created_by || 0);
        }
      }
      if (data.triggers) {
        for (const t of data.triggers) {
          await this.saveTrigger(cid, t.keyword, t.response, 0);
        }
      }
      if (data.blacklist) {
        for (const w of data.blacklist) await this.addBlacklistWord(cid, w);
      }
      if (data.whitelist) {
        for (const l of data.whitelist) await this.addWhitelistLink(cid, l);
      }
      if (data.aliases) {
        for (const a of data.aliases) await this.addAlias(cid, a.name, a.user_id);
      }
      if (data.chat_ext) await this.saveChatExt(cid, data.chat_ext);
      if (data.warn_chain) {
        for (const c of data.warn_chain) {
          await this.setWarnChain(cid, c.step, c.action, c.duration);
        }
      }
      return true;
    } catch (e) {
      Log.error('restore_fail', { err: e.message });
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  Warn Chain
  // ═══════════════════════════════════════════════════════════

  setWarnChain(cid, step, action, duration) {
    return this.execute(
      `INSERT OR REPLACE INTO warn_chain (chat_id,step,action,duration) VALUES (?,?,?,?)`,
      [cid, step, action, duration || 0]
    );
  }
  getWarnChain(cid) {
    return this.all(`SELECT * FROM warn_chain WHERE chat_id=? ORDER BY step ASC`, [cid]);
  }
  clearWarnChain(cid) {
    return this.execute(`DELETE FROM warn_chain WHERE chat_id=?`, [cid]);
  }

  // ═══════════════════════════════════════════════════════════
  //  Aliases
  // ═══════════════════════════════════════════════════════════

  async addAlias(cid, name, uid) {
    await this.execute(
      `INSERT OR IGNORE INTO aliases (chat_id,name,user_id) VALUES (?,?,?)`,
      [cid, name.toLowerCase().slice(0, 20), uid]
    );
    await this.kvDel(`al:${cid}`);
  }
  async removeAlias(cid, name, uid) {
    await this.execute(
      `DELETE FROM aliases WHERE chat_id=? AND name=? AND user_id=?`,
      [cid, name.toLowerCase(), uid]
    );
    await this.kvDel(`al:${cid}`);
  }
  async clearAlias(cid, name) {
    await this.execute(`DELETE FROM aliases WHERE chat_id=? AND name=?`, [cid, name.toLowerCase()]);
    await this.kvDel(`al:${cid}`);
  }
  getAliasUsers(cid, name) {
    return this.all(
      `SELECT a.user_id, u.first_name FROM aliases a
       LEFT JOIN users u ON u.id=a.user_id
       WHERE a.chat_id=? AND a.name=?`,
      [cid, name.toLowerCase()]
    );
  }
  async getAliases(cid) {
    const key = `al:${cid}`;
    let cached = await this.kvGet(key);
    if (cached) return cached;
    const list = await this.all(
      `SELECT name, COUNT(*) as count FROM aliases WHERE chat_id=? GROUP BY name ORDER BY name`,
      [cid]
    );
    await this.kvSet(key, list, 300);
    return list;
  }

  // ═══════════════════════════════════════════════════════════
  //  Admin Permissions
  // ═══════════════════════════════════════════════════════════

  async getAdminPerms(cid, uid) {
    const r = await this.first(
      `SELECT perms FROM admin_perms WHERE chat_id=? AND user_id=?`,
      [cid, uid]
    );
    return r ? Utils.safeJson(r.perms, {}) : {};
  }
  async setAdminPerms(cid, uid, perms) {
    return this.execute(
      `INSERT INTO admin_perms (chat_id,user_id,perms) VALUES (?,?,?)
       ON CONFLICT(chat_id,user_id) DO UPDATE SET perms=excluded.perms`,
      [cid, uid, JSON.stringify(perms)]
    );
  }
  async hasAdminPerm(cid, uid, perm) {
    const p = await this.getAdminPerms(cid, uid);
    if (!p || Object.keys(p).length === 0) return true;
    return p[perm] !== false;
  }

  // ═══════════════════════════════════════════════════════════
  //  Message Records
  // ═══════════════════════════════════════════════════════════

  recordMessage(cid, uid, mid, text) {
    if (!text) return false;
    return this.execute(
      `INSERT INTO message_records (chat_id,user_id,message_id,text) VALUES (?,?,?,?)`,
      [cid, uid, mid, String(text).slice(0, 500)]
    );
  }
  searchMessages(cid, query, limit = 20) {
    return this.all(
      `SELECT r.*, u.first_name FROM message_records r
       LEFT JOIN users u ON u.id=r.user_id
       WHERE r.chat_id=? AND r.text LIKE ?
       ORDER BY r.created_at DESC LIMIT ?`,
      [cid, `%${query}%`, limit]
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  Exchange Cache
  // ═══════════════════════════════════════════════════════════

  async getCachedRate(key, maxAge = 900) {
    const r = await this.first(`SELECT * FROM exchange_cache WHERE key=?`, [key]);
    if (!r) return null;
    const now = Math.floor(Date.now() / 1000);
    if ((now - r.updated_at) > maxAge) return null;
    return Utils.safeJson(r.data, null);
  }
  saveCachedRate(key, data) {
    return this.execute(
      `INSERT OR REPLACE INTO exchange_cache (key,data,updated_at) VALUES (?,?,unixepoch())`,
      [key, JSON.stringify(data)]
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  Lang Config
  // ═══════════════════════════════════════════════════════════

  getLangConfig(cid) {
    return this.first(`SELECT lang FROM lang_config WHERE chat_id=?`, [cid]);
  }
  setLangConfig(cid, lang) {
    return this.execute(
      `INSERT INTO lang_config (chat_id,lang) VALUES (?,?)
       ON CONFLICT(chat_id) DO UPDATE SET lang=excluded.lang`,
      [cid, lang]
    );
  }

  async getUserFlags(uid) {
    return await this.first(`SELECT * FROM users WHERE id=?`, [uid]);
  }

  // ═══════════════════════════════════════════════════════════
  //  Cleanup Jobs
  // ═══════════════════════════════════════════════════════════

  cleanExpiredCaptcha() {
    return this.execute(`DELETE FROM captcha_pending WHERE expires_at<unixepoch()`);
  }
  cleanExpiredSessions() {
    return this.execute(`DELETE FROM user_sessions WHERE expires_at<unixepoch()`);
  }
  cleanExpiredGames() {
    return this.execute(`DELETE FROM active_games WHERE expires_at<unixepoch()`);
  }
  cleanExpiredTokens() {
    return this.execute(`DELETE FROM dashboard_tokens WHERE expires_at<unixepoch()`);
  }
  cleanOldRaidEvents() {
    const cutoff = Math.floor(Date.now() / 1000) - 3600;
    return this.execute(`DELETE FROM raid_events WHERE joined_at<?`, [cutoff]);
  }
  cleanStaleRateLimits() {
    const cutoff = Math.floor(Date.now() / 1000) - 7200;
    return this.execute(`DELETE FROM rate_limits WHERE window_start < ?`, [cutoff]);
  }
  cleanExpiredWarnings() {
    return this.execute(`DELETE FROM warnings WHERE expires_at IS NOT NULL AND expires_at < unixepoch()`);
  }
  cleanOldRecords(days = 7) {
    const cutoff = Math.floor(Date.now() / 1000) - (days * 86400);
    return this.execute(`DELETE FROM message_records WHERE created_at<?`, [cutoff]);
  }
  cleanOldLogs(days = 30) {
    const cutoff = Math.floor(Date.now() / 1000) - (days * 86400);
    return this.execute(`DELETE FROM action_logs WHERE created_at < ?`, [cutoff]);
  }
  cleanOldGameHistory(days = 30) {
    const cutoff = Math.floor(Date.now() / 1000) - (days * 86400);
    return this.execute(`DELETE FROM game_history WHERE played_at < ?`, [cutoff]);
  }
  cleanOldRepHistory(days = 60) {
    const cutoff = Math.floor(Date.now() / 1000) - (days * 86400);
    return this.execute(`DELETE FROM rep_history WHERE created_at < ?`, [cutoff]);
  }
  cleanOldStats(days = 60) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    return this.execute(`DELETE FROM daily_stats WHERE date < ?`, [cutoff]);
  }
  cleanOldBackups(days = 30) {
    const cutoff = Math.floor(Date.now() / 1000) - (days * 86400);
    return this.execute(`DELETE FROM backup_logs WHERE created_at < ?`, [cutoff]);
  }
  cleanOldExchangeCache() {
    const cutoff = Math.floor(Date.now() / 1000) - 86400;
    return this.execute(`DELETE FROM exchange_cache WHERE updated_at < ?`, [cutoff]);
  }
}

// ═══════════════════════════════════════════════════════════
//  NEXUS v14 Extensions — Product-level methods
//  (از لایه NEXUS CORE که قبلاً تو worker.js بود)
// ═══════════════════════════════════════════════════════════

Database.prototype.nexusEvent = function(cid, uid, type, score, payload) {
  return this.execute(
    `INSERT INTO nexus_events (chat_id,user_id,event_type,score,payload,created_at) VALUES (?,?,?,?,?,unixepoch())`,
    [cid, uid, type, score || 0, JSON.stringify(payload || {}).slice(0, 1800)]
  );
};
Database.prototype.nexusRecent = function(cid, seconds = 86400, limit = 30) {
  return this.all(
    `SELECT * FROM nexus_events WHERE chat_id=? AND created_at>=unixepoch()-? ORDER BY created_at DESC LIMIT ?`,
    [cid, seconds, limit]
  );
};
Database.prototype.nexusTrusted = function(cid, uid) {
  return this.first(`SELECT * FROM nexus_trusted WHERE chat_id=? AND user_id=?`, [cid, uid]);
};
Database.prototype.nexusTrust = function(cid, uid, by, reason = 'trusted') {
  return this.execute(
    `INSERT OR REPLACE INTO nexus_trusted(chat_id,user_id,reason,created_by,created_at) VALUES(?,?,?,?,unixepoch())`,
    [cid, uid, reason, by]
  );
};
Database.prototype.nexusUntrust = function(cid, uid) {
  return this.execute(`DELETE FROM nexus_trusted WHERE chat_id=? AND user_id=?`, [cid, uid]);
};
Database.prototype.nexusTrustList = function(cid) {
  return this.all(
    `SELECT t.*,u.first_name,u.username FROM nexus_trusted t LEFT JOIN users u ON u.id=t.user_id WHERE t.chat_id=? ORDER BY t.created_at DESC`,
    [cid]
  );
};
Database.prototype.nexusRole = function(cid, uid) {
  return this.first(`SELECT * FROM nexus_roles WHERE chat_id=? AND user_id=?`, [cid, uid]);
};
Database.prototype.nexusSetRole = function(cid, uid, role, scopes = {}) {
  return this.execute(
    `INSERT OR REPLACE INTO nexus_roles(chat_id,user_id,role,scopes,created_at) VALUES(?,?,?,?,unixepoch())`,
    [cid, uid, role, JSON.stringify(scopes)]
  );
};
Database.prototype.nexusThreatSummary = async function(cid) {
  return this.first(
    `SELECT COUNT(*) total, SUM(CASE WHEN score>=30 THEN 1 ELSE 0 END) watch, SUM(CASE WHEN score>=60 THEN 1 ELSE 0 END) high, SUM(CASE WHEN score>=85 THEN 1 ELSE 0 END) critical FROM nexus_events WHERE chat_id=? AND created_at>=unixepoch()-86400`,
    [cid]
  ) || {total: 0, watch: 0, high: 0, critical: 0};
};

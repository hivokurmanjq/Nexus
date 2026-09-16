// ═══════════════════════════════════════════════════════════
//  NEXUS — D1 Schema (v14 + Core)
//  از worker.js اصلی منتقل شده — بدون حذف
// ═══════════════════════════════════════════════════════════

import { Log } from '../lib/log.js';

export const NEXUS_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS nexus_events (id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id INTEGER NOT NULL, user_id INTEGER, event_type TEXT NOT NULL, score INTEGER DEFAULT 0, payload TEXT, created_at INTEGER DEFAULT (unixepoch()))`,
  `CREATE INDEX IF NOT EXISTS idx_nexus_events_chat_time ON nexus_events(chat_id,created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_nexus_events_score ON nexus_events(chat_id,score)`,
  `CREATE TABLE IF NOT EXISTS nexus_risk_profiles (chat_id INTEGER PRIMARY KEY, mode TEXT DEFAULT 'adaptive', threshold_watch INTEGER DEFAULT 30, threshold_high INTEGER DEFAULT 60, threshold_critical INTEGER DEFAULT 85, updated_at INTEGER DEFAULT (unixepoch()))`,
  `CREATE TABLE IF NOT EXISTS nexus_trusted (chat_id INTEGER NOT NULL, user_id INTEGER NOT NULL, reason TEXT, created_by INTEGER, created_at INTEGER DEFAULT (unixepoch()), PRIMARY KEY(chat_id,user_id))`,
  `CREATE TABLE IF NOT EXISTS nexus_roles (chat_id INTEGER NOT NULL, user_id INTEGER NOT NULL, role TEXT NOT NULL, scopes TEXT, created_at INTEGER DEFAULT (unixepoch()), PRIMARY KEY(chat_id,user_id))`,
];

export const V14_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS processed_updates (update_id INTEGER PRIMARY KEY, processed_at INTEGER NOT NULL DEFAULT (unixepoch()))`,
  `CREATE TABLE IF NOT EXISTS moderation_cases (
    id TEXT PRIMARY KEY, chat_id INTEGER NOT NULL, target_id INTEGER NOT NULL,
    reporter_id INTEGER, admin_id INTEGER, source TEXT NOT NULL, message_id INTEGER,
    reason TEXT, severity TEXT DEFAULT 'medium', risk_score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'open', evidence TEXT, created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
  )`,
  `CREATE INDEX IF NOT EXISTS idx_cases_chat_status ON moderation_cases(chat_id,status,created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_cases_target ON moderation_cases(chat_id,target_id,created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY, type TEXT NOT NULL, payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
    run_after INTEGER NOT NULL, locked_at INTEGER, completed_at INTEGER,
    last_error TEXT, created_at INTEGER DEFAULT (unixepoch())
  )`,
  `CREATE INDEX IF NOT EXISTS idx_jobs_due ON jobs(status,run_after)`,
  `CREATE TABLE IF NOT EXISTS invite_campaigns (
    id TEXT PRIMARY KEY, chat_id INTEGER NOT NULL, label TEXT NOT NULL,
    invite_link TEXT, created_by INTEGER, expires_at INTEGER, member_limit INTEGER,
    joined_count INTEGER DEFAULT 0, active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS topic_settings (
    chat_id INTEGER NOT NULL, thread_id INTEGER NOT NULL, title TEXT,
    mode TEXT DEFAULT 'inherit', settings TEXT, assigned_admins TEXT,
    created_at INTEGER DEFAULT (unixepoch()), PRIMARY KEY(chat_id,thread_id)
  )`,
];

export async function nexusInstallSchema(env) {
  const { Database } = await import('../lib/database.js');
  const db = new Database(env);
  const out = [];
  for (const sql of [...NEXUS_SCHEMA, ...V14_SCHEMA]) {
    try { await db.execute(sql); out.push(true); }
    catch (e) { Log.error('schema_fail', { err: e.message }); out.push(false); }
  }
  return out;
}

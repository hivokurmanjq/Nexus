// ═══════════════════════════════════════════════════════════
//  NEXUS — Cache (Memory + KV)
// ═══════════════════════════════════════════════════════════

export class Cache {
  constructor(env) {
    this.kv = env.CACHE || null;
    this.mem = new Map();
  }
  async get(k) {
    if (this.mem.has(k)) return this.mem.get(k);
    if (!this.kv) return null;
    try {
      const v = await this.kv.get(k, { type: 'json' });
      if (v != null) this.mem.set(k, v);
      return v;
    } catch { return null; }
  }
  async set(k, v, ttl = 300) {
    this.mem.set(k, v);
    if (!this.kv) return false;
    try {
      await this.kv.put(k, JSON.stringify(v), { expirationTtl: ttl });
      return true;
    } catch { return false; }
  }
  async del(k) {
    this.mem.delete(k);
    if (this.kv) try { await this.kv.delete(k); } catch {}
  }
}

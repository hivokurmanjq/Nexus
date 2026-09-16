// ═══════════════════════════════════════════════════════════
//  NEXUS — Structured Logger
// ═══════════════════════════════════════════════════════════

export const Log = {
  _out(level, msg, meta = {}) {
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      msg,
      ...meta,
    });
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  },
  info(msg, meta) { this._out('info', msg, meta); },
  warn(msg, meta) { this._out('warn', msg, meta); },
  error(msg, meta) { this._out('error', msg, meta); },
};

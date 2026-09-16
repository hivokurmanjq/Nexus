// ═══════════════════════════════════════════════════════════
//  NEXUS — AI Engine
// ═══════════════════════════════════════════════════════════

import { Log } from './log.js';

export class AIEngine {
  constructor(env) {
    this.ai = env.AI || null;
  }
  async chat(userMessage, userName = 'کاربر') {
    if (!this.ai) return { error: 'NO_BINDING' };
    const clean = String(userMessage).slice(0, 800);
    const models = [
      '@cf/meta/llama-3.1-8b-instruct',
      '@cf/meta/llama-3.1-8b-instruct-fast',
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      '@cf/meta/llama-3.2-3b-instruct',
      '@cf/mistral/mistral-7b-instruct-v0.2',
    ];
    const sys = `تو "Nexus" هستی، دستیار هوشمند و دوستانه در گروه تلگرام فارسی‌زبان.
- کوتاه و مفید (۲ تا ۴ خط)
- به فارسی، فارسی جواب بده
- ایموجی به‌جا
- نام کاربر: ${userName}`;
    const errors = [];
    for (const model of models) {
      try {
        const response = await this.ai.run(model, {
          messages: [
            { role: 'system', content: sys },
            { role: 'user', content: clean },
          ],
          max_tokens: 500,
          temperature: 0.7,
        });
        const r = response?.response
          || response?.result?.response
          || response?.choices?.[0]?.message?.content
          || (typeof response === 'string' ? response : null);
        if (r && r.length > 0) return { text: r, model };
      } catch (e) {
        errors.push(`${model}: ${e.message}`);
      }
    }
    Log.error('ai_all_failed', { errs: errors.join(' | ') });
    return { error: 'ALL_MODELS_FAILED' };
  }
}

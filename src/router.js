// ═══════════════════════════════════════════════════════════
//  NEXUS — HTTP Router
//  مسیریابی /webhook /setup /dashboard /healthz /app
// ═══════════════════════════════════════════════════════════

import { BOT, NEXUS_CORE } from './config/constants.js';
import { Database } from './lib/database.js';
import { Cache } from './lib/cache.js';
import { TelegramAPI } from './lib/telegram.js';
import { Context } from './lib/context.js';
import { Log } from './lib/log.js';
import { handleUpdate } from './handlers/update.js';
import { nexusInstallSchema } from './nexus/schema.js';
import { nexusRunDueJobs } from './nexus/jobs.js';
import { NEXUS_ANALYTICS } from './nexus/core.js';
import { renderHome } from './web/home.js';
import { renderDashboard } from './web/dashboard.js';
import { renderNexusApp } from './web/app.js';
import { SECURITY_HEADERS } from './web/css.js';

// ─── Webhook handler ───
async function handleWebhook(request, env, ctx, url) {
  const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');

  if (env.WEBHOOK_SECRET && secret !== env.WEBHOOK_SECRET) {
    return new Response('Unauthorized', {
      status: 401,
      headers: SECURITY_HEADERS
    });
  }

  const update = await request.json().catch(() => null);

  if (!update) {
    return new Response('Bad JSON', {
      status: 400,
      headers: SECURITY_HEADERS
    });
  }

  if (update.update_id) {
    const dk = `u:${update.update_id}`;
    const cache = new Cache(env);

    if (await cache.get(dk)) {
      return new Response('OK', {
        headers: SECURITY_HEADERS
      });
    }

    ctx.waitUntil(cache.set(dk, 1, 300));
  }

  ctx.waitUntil((async () => {
    try {
      const context = new Context(update, env, ctx);
      await handleUpdate(context);
    } catch (err) {
      Log.error('handler', {
        err: err.message,
        stack: err.stack
      });
    }
  })());

  return new Response('OK', {
    headers: SECURITY_HEADERS
  });
}

// ─── Setup handler ───
async function handleSetup(url, env) {
  const provided = url.searchParams.get('secret');

  if (!env.WEBHOOK_SECRET || provided !== env.WEBHOOK_SECRET) {
    return new Response('Forbidden', {
      status: 403,
      headers: SECURITY_HEADERS
    });
  }

  const api = new TelegramAPI(env);
  const action = url.searchParams.get('action');

  if (action === 'set') {
    const webhookUrl = `${url.origin}/webhook`;
    const res = await api.setWebhook(webhookUrl, env.WEBHOOK_SECRET);

    return Response.json(
      {
        action: 'set',
        webhookUrl,
        response: res
      },
      {
        headers: SECURITY_HEADERS
      }
    );
  }

  if (action === 'info') {
    return Response.json(
      await api.getWebhookInfo(),
      {
        headers: SECURITY_HEADERS
      }
    );
  }

  if (action === 'schema') {
    const result = await nexusInstallSchema(env);

    return Response.json(
      {
        action: 'schema',
        ok: result.every(Boolean),
        statements: result.length,
        result
      },
      {
        headers: SECURITY_HEADERS
      }
    );
  }

  if (action === 'bootstrap') {
    const commands = [
      {
        command: 'start',
        description: 'باز کردن NEXUS'
      },
      {
        command: 'panel',
        description: 'مرکز فرماندهی گروه'
      },
      {
        command: 'help',
        description: 'راهنمای NEXUS'
      },
      {
        command: 'status',
        description: 'وضعیت امنیت'
      },
      {
        command: 'ai',
        description: 'دستیار هوشمند'
      }
    ];

    const results = {
      commands: await api.setMyCommands(commands),
      menu: null
    };

    if (env.MINI_APP_URL) {
      results.menu = await api.setChatMenuButton(
        null,
        'NEXUS',
        env.MINI_APP_URL
      );
    }

    return Response.json(
      {
        action: 'bootstrap',
        results
      },
      {
        headers: SECURITY_HEADERS
      }
    );
  }

  return Response.json(
    {
      usage: {
        set: `${url.origin}/setup?secret=***&action=set`,
        info: `${url.origin}/setup?secret=***&action=info`,
        schema: `${url.origin}/setup?secret=***&action=schema`,
        bootstrap: `${url.origin}/setup?secret=***&action=bootstrap`
      }
    },
    {
      headers: SECURITY_HEADERS
    }
  );
}

// ─── Dashboard API ───
async function handleDashboardApi(url, env) {
  const token = url.searchParams.get('token');

  if (!token) {
    return Response.json(
      {
        ok: false,
        error: 'missing_token'
      },
      {
        status: 401,
        headers: SECURITY_HEADERS
      }
    );
  }

  const db = new Database(env);
  const t = await db.validateToken(token);

  if (!t) {
    return Response.json(
      {
        ok: false,
        error: 'invalid_token'
      },
      {
        status: 403,
        headers: SECURITY_HEADERS
      }
    );
  }

  const chats = await db.all(
    `SELECT c.* FROM chats c WHERE c.is_active=1 ORDER BY c.title LIMIT 100`
  );

  const out = [];

  for (const c of chats) {
    const stats = await NEXUS_ANALYTICS.overview(db, c.id);

    const threats = await db
      .nexusThreatSummary(c.id)
      .catch(() => ({
        total: 0,
        watch: 0,
        high: 0,
        critical: 0
      }));

    out.push({
      id: c.id,
      title: c.title,
      type: c.type,
      stats,
      threats
    });
  }

  return Response.json(
    {
      ok: true,
      product: NEXUS_CORE,
      owner: t.user_id,
      chats: out
    },
    {
      headers: {
        ...SECURITY_HEADERS,
        'Cache-Control': 'no-store'
      }
    }
  );
}

// ─── Dashboard page ───
async function handleDashboardPage(url, env) {
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response('Missing token', {
      status: 401,
      headers: SECURITY_HEADERS
    });
  }

  const db = new Database(env);
  const t = await db.validateToken(token);

  if (!t) {
    return new Response('Invalid or expired token', {
      status: 403,
      headers: SECURITY_HEADERS
    });
  }

  const html = await renderDashboard(env, t.user_id);

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...SECURITY_HEADERS
    }
  });
}

// ─── Main router ───
export async function route(request, env, ctx) {
  try {
    const url = new URL(request.url);

    if (
      request.method === 'POST' &&
      url.pathname === '/webhook'
    ) {
      return await handleWebhook(
        request,
        env,
        ctx,
        url
      );
    }

    if (url.pathname === '/setup') {
      return await handleSetup(url, env);
    }

    if (url.pathname === '/api/dashboard') {
      return await handleDashboardApi(url, env);
    }

    if (url.pathname === '/dashboard') {
      return await handleDashboardPage(url, env);
    }

    if (url.pathname === '/app') {
      return new Response(
        renderNexusApp(env),
        {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            ...SECURITY_HEADERS
          }
        }
      );
    }

    if (url.pathname === '/healthz') {
      return Response.json(
        {
          ok: true,
          ts: Date.now(),
          version: BOT.version,
          checks: {
            db: !!env.DB,
            kv: !!env.CACHE,
            ai: !!env.AI,
            token: !!env.BOT_TOKEN
          }
        },
        {
          headers: SECURITY_HEADERS
        }
      );
    }

    // Home
    const html = await renderHome(env);

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        ...SECURITY_HEADERS
      }
    });

  } catch (err) {
    Log.error('fatal', {
      err: err.message,
      stack: err.stack
    });

    return new Response(
      'Internal Server Error',
      {
        status: 500,
        headers: SECURITY_HEADERS
      }
    );
  }
}

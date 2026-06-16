/**
 * Roxou VPS — Health check stubs
 *
 * Standalone Node script for the future `roxou-api` (Express) on VPS.
 * NOT loaded by the current Vite SPA. Reference implementation only.
 *
 * Usage on VPS:
 *   node server/health.js   # ou importar em apps/api/src/routes/health.ts
 */

import http from "node:http";
import os from "node:os";
import { existsSync, accessSync, constants, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { URL as NodeUrl } from "node:url";

const PORT = process.env.HEALTH_PORT || 3001;
const STORAGE_ROOT = process.env.STORAGE_ROOT || "/var/www/roxou/storage";
const LOG_ROOT = process.env.LOG_ROOT || "/var/www/roxou/logs";
const TZ = process.env.TZ || null;
const ADMIN_TOKEN = process.env.ROXOU_ADMIN_TOKEN || null;

function boolEnv(name) {
  const v = process.env[name];
  return typeof v === "string" && v.length > 0;
}

function checkStorage() {
  try {
    if (!existsSync(STORAGE_ROOT)) return { ok: false, writable: false };
    accessSync(STORAGE_ROOT, constants.W_OK);
    return { ok: true, writable: true };
  } catch {
    return { ok: true, writable: false };
  }
}

function checkFfmpeg() {
  try {
    const out = execFileSync(process.env.FFMPEG_PATH || "ffmpeg", ["-version"], {
      encoding: "utf8",
      timeout: 2000,
    });
    return { ok: true, version: out.split("\n")[0] };
  } catch {
    return { ok: false };
  }
}

function envCheck() {
  // Nunca retornar valores. Apenas presença.
  return {
    supabase: {
      url: boolEnv("SUPABASE_URL"),
      anon: boolEnv("SUPABASE_ANON_KEY"),
      service_role: boolEnv("SUPABASE_SERVICE_ROLE_KEY"),
      db_url: boolEnv("SUPABASE_DB_URL"),
    },
    ai: {
      lovable: boolEnv("LOVABLE_API_KEY"),
    },
    external: {
      maps: boolEnv("GOOGLE_MAPS_API_KEY"),
      firecrawl: boolEnv("FIRECRAWL_API_KEY"),
      meta_app: boolEnv("META_APP_ID") && boolEnv("META_APP_SECRET"),
      resend: boolEnv("RESEND_API_KEY"),
      sports: boolEnv("THESPORTSDB_API_KEY"),
    },
    ops: {
      cron_secret: boolEnv("CRON_SECRET"),
      tz: TZ,
      node_env: process.env.NODE_ENV || null,
    },
  };
}

const routes = {
  "/health":             () => ({ ok: true, ts: new Date().toISOString() }),
  "/api/health":         () => ({ ok: true, service: "roxou-api", ts: new Date().toISOString() }),
  "/api/storage/health": () => ({ ok: true, storage: checkStorage() }),
  "/api/ffmpeg/health":  () => ({ ok: true, ffmpeg: checkFfmpeg() }),
};

/**
 * FASE 10G.1.2 — endpoints reais (requireAdmin via header).
 * Em produção, montar atrás do middleware admin do Express; aqui exigimos
 * x-admin-token === ROXOU_ADMIN_TOKEN quando a env estiver setada.
 */
function requireAdmin(req) {
  if (!ADMIN_TOKEN) return true; // dev: sem token configurado → libera
  return req.headers["x-admin-token"] === ADMIN_TOKEN;
}

function diskUsage() {
  try {
    const out = execFileSync("df", ["-Pk", "/"], { encoding: "utf8", timeout: 1500 });
    const cols = out.trim().split("\n").pop().split(/\s+/);
    return { total: Number(cols[1]) * 1024, used: Number(cols[2]) * 1024, free: Number(cols[3]) * 1024 };
  } catch {
    return null;
  }
}

function hostMetrics() {
  const mem = { total: os.totalmem(), free: os.freemem(), used: os.totalmem() - os.freemem() };
  return {
    uptime: os.uptime(),
    process_uptime: process.uptime(),
    load_avg: os.loadavg(),
    cpu_count: os.cpus().length,
    platform: `${os.type()} ${os.release()}`,
    node_version: process.version,
    memory: mem,
    disk: diskUsage(),
  };
}

function pm2List() {
  try {
    const out = execFileSync("pm2", ["jlist"], { encoding: "utf8", timeout: 3000 });
    const list = JSON.parse(out);
    return list.map((p) => ({
      name: p.name,
      pm_id: p.pm_id,
      pid: p.pid,
      status: p.pm2_env?.status,
      restarts: p.pm2_env?.restart_time,
      uptime: p.pm2_env?.pm_uptime,
      memory: p.monit?.memory,
      cpu: p.monit?.cpu,
    }));
  } catch (e) {
    return { error: "pm2_unavailable", message: String(e?.message || e) };
  }
}

const LOG_CATEGORIES = new Set(["build", "partner", "ocr", "analytics", "supabase", "events"]);

function readLogs(cat, limit = 100) {
  if (!LOG_CATEGORIES.has(cat)) return { error: "invalid_category" };
  const file = `${LOG_ROOT}/${cat}.log`;
  if (!existsSync(file)) return { lines: [] };
  try {
    const raw = readFileSync(file, "utf8");
    const tail = raw.trim().split("\n").slice(-limit);
    const lines = tail.map((msg) => {
      const m = msg.match(/^(\S+)\s+\[(\w+)\]\s+(.*)$/);
      if (m) return { ts: m[1], level: m[2], msg: m[3], source: cat };
      return { ts: new Date().toISOString(), level: "info", msg, source: cat };
    });
    return { lines };
  } catch (e) {
    return { error: "read_failed", message: String(e?.message || e) };
  }
}

const server = http.createServer((req, res) => {
  const url = new NodeUrl(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;
  const send = (code, body) => {
    res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify(body));
  };

  // rotas públicas
  if (routes[pathname]) {
    try { return send(200, routes[pathname]()); }
    catch { return send(500, { ok: false, error: "internal" }); }
  }

  // rotas protegidas
  if (pathname === "/api/env-check") {
    if (!requireAdmin(req)) return send(401, { ok: false, error: "unauthorized" });
    return send(200, { ok: true, env: envCheck() });
  }
  if (pathname === "/api/system/host") {
    if (!requireAdmin(req)) return send(401, { ok: false, error: "unauthorized" });
    return send(200, { ok: true, ...hostMetrics() });
  }
  if (pathname === "/api/system/pm2") {
    if (!requireAdmin(req)) return send(401, { ok: false, error: "unauthorized" });
    const r = pm2List();
    if (Array.isArray(r)) return send(200, { ok: true, processes: r });
    return send(200, { ok: false, processes: [], ...r });
  }
  if (pathname === "/api/logs") {
    if (!requireAdmin(req)) return send(401, { ok: false, error: "unauthorized" });
    const cat = url.searchParams.get("cat") || "build";
    const limit = Math.min(500, Number(url.searchParams.get("limit") || 100));
    const r = readLogs(cat, limit);
    if (r.error) return send(200, { ok: false, lines: [], ...r });
    return send(200, { ok: true, ...r });
  }

  return send(404, { ok: false, error: "not_found" });
});

if (import.meta.url === `file://${process.argv[1]}`) {
  server.listen(PORT, () => {
    console.log(`[health] listening on :${PORT} (TZ=${TZ}, log_root=${LOG_ROOT})`);
  });
}

export { server, envCheck, checkStorage, checkFfmpeg, hostMetrics, pm2List, readLogs };


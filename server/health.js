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
import { existsSync, accessSync, constants, readFileSync, statSync } from "node:fs";
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
  "/api/env-check":      () => ({ ok: true, env: envCheck() }), // proteger com requireAdmin no Express real
};

const server = http.createServer((req, res) => {
  const handler = routes[req.url];
  if (!handler) {
    res.writeHead(404, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: false, error: "not_found" }));
  }
  try {
    const body = JSON.stringify(handler());
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(body);
  } catch (e) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "internal" }));
  }
});

if (import.meta.url === `file://${process.argv[1]}`) {
  server.listen(PORT, () => {
    console.log(`[health] listening on :${PORT} (TZ=${TZ})`);
  });
}

export { server, envCheck, checkStorage, checkFfmpeg };

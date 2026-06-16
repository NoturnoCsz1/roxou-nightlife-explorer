/**
 * Generate /public/health and /public/partner/health JSON files with
 * the current build timestamp and version. Runs in `prebuild`.
 *
 * The VPS nginx aliases:
 *   location = /health            → /var/www/roxou/dist/health
 *   location = /partner/health    → /var/www/roxou/dist/partner/health
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";

const pkg = JSON.parse(
  readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"),
) as { version?: string };

const ts = new Date().toISOString();

function emit(target: string, service: string) {
  const dir = path.dirname(target);
  mkdirSync(dir, { recursive: true });
  const body = {
    status: "ok",
    service,
    version: pkg.version ?? "0.0.0",
    build: ts,
    pwa_enabled: process.env.VITE_DISABLE_PWA !== "true" && process.env.DISABLE_PWA !== "true",
  };
  writeFileSync(target, JSON.stringify(body) + "\n", "utf8");
  // eslint-disable-next-line no-console
  console.log(`[health] wrote ${target}`);
}

emit(path.resolve("public/health"), "roxou-web");
emit(path.resolve("public/partner/health"), "roxou-partner");

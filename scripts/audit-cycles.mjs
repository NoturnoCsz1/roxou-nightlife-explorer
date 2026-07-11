#!/usr/bin/env node
/**
 * Onda 1 — Auditoria de ciclos de dependência.
 *
 * Faz uma varredura estática sobre `src/**` (ignora `node_modules`,
 * `dist`, arquivos de teste), extrai imports estáticos e detecta
 * ciclos com Tarjan.
 *
 * Regras:
 *  - Node puro. Nenhuma dependência nova.
 *  - Não altera arquivos.
 *  - Resolve aliases lidos de `tsconfig.json`.
 *  - Saída: humana + escreve `docs/ciclos-dependencias-baseline.md`
 *    somente quando invocado com `--write-baseline`.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import url from "node:url";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");

const IGNORE_DIRS = new Set(["node_modules", "dist", "build", ".git"]);
const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const INDEX_CANDIDATES = ["", "/index.ts", "/index.tsx", "/index.js", "/index.jsx", ".ts", ".tsx", ".js", ".jsx"];

async function loadAliases() {
  const raw = await fs.readFile(path.join(ROOT, "tsconfig.json"), "utf8");
  // tsconfig aceita comentários; remove com regex simples.
  const cleaned = raw.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const cfg = JSON.parse(cleaned);
  const paths = cfg?.compilerOptions?.paths ?? {};
  const map = [];
  for (const [key, values] of Object.entries(paths)) {
    const from = key.replace(/\/\*$/, "");
    const to = String(values[0]).replace(/\/\*$/, "");
    map.push({ from, to: path.resolve(ROOT, to) });
  }
  return map.sort((a, b) => b.from.length - a.from.length);
}

async function walk(dir, out = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (IGNORE_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else if (CODE_EXT.has(path.extname(e.name))) out.push(p);
  }
  return out;
}

const IMPORT_RE =
  /(?:import\s+(?:[\w${},*\s]+?\s+from\s+)?|export\s+(?:\*|\{[^}]*\})\s+from\s+|import\s*\()\s*["']([^"']+)["']/g;

function extractImports(source) {
  const spec = new Set();
  let m;
  while ((m = IMPORT_RE.exec(source))) spec.add(m[1]);
  return [...spec];
}

async function fileExists(p) {
  try {
    const s = await fs.stat(p);
    return s.isFile();
  } catch {
    return false;
  }
}

async function resolveImport(spec, importer, aliases) {
  if (!spec.startsWith(".") && !spec.startsWith("/") && !spec.startsWith("@")) return null; // pacote npm
  let base;
  if (spec.startsWith(".")) base = path.resolve(path.dirname(importer), spec);
  else if (spec.startsWith("/")) base = path.resolve(ROOT, spec.slice(1));
  else {
    const hit = aliases.find(
      (a) => spec === a.from || spec.startsWith(a.from + "/")
    );
    if (!hit) return null;
    const rest = spec === hit.from ? "" : spec.slice(hit.from.length);
    base = path.resolve(hit.to + rest);
  }
  for (const c of INDEX_CANDIDATES) {
    const cand = base + c;
    if (await fileExists(cand)) return path.resolve(cand);
  }
  return null;
}

function tarjanSCC(graph) {
  let idx = 0;
  const stack = [];
  const onStack = new Set();
  const indices = new Map();
  const lows = new Map();
  const sccs = [];

  function strongconnect(v) {
    indices.set(v, idx);
    lows.set(v, idx);
    idx++;
    stack.push(v);
    onStack.add(v);
    for (const w of graph.get(v) ?? []) {
      if (!indices.has(w)) {
        strongconnect(w);
        lows.set(v, Math.min(lows.get(v), lows.get(w)));
      } else if (onStack.has(w)) {
        lows.set(v, Math.min(lows.get(v), indices.get(w)));
      }
    }
    if (lows.get(v) === indices.get(v)) {
      const comp = [];
      let w;
      do {
        w = stack.pop();
        onStack.delete(w);
        comp.push(w);
      } while (w !== v);
      if (comp.length > 1) sccs.push(comp);
    }
  }
  for (const v of graph.keys()) if (!indices.has(v)) strongconnect(v);
  return sccs;
}

async function main() {
  const writeBaseline = process.argv.includes("--write-baseline");
  const aliases = await loadAliases();
  const files = await walk(SRC);
  const graph = new Map();

  for (const f of files) {
    graph.set(f, []);
    const src = await fs.readFile(f, "utf8");
    for (const spec of extractImports(src)) {
      const resolved = await resolveImport(spec, f, aliases);
      if (resolved && resolved !== f) graph.get(f).push(resolved);
    }
  }

  const sccs = tarjanSCC(graph);
  const rel = (p) => path.relative(ROOT, p);

  console.log(`\n[audit:cycles] arquivos: ${files.length}`);
  console.log(`[audit:cycles] SCCs (ciclos) encontrados: ${sccs.length}`);
  for (const c of sccs) {
    console.log("  ciclo (" + c.length + "):");
    for (const n of c) console.log("    - " + rel(n));
  }

  if (writeBaseline) {
    const md = [
      "# Ciclos de Dependência — Baseline (Onda 1)",
      "",
      "Gerado por `bun run audit:cycles -- --write-baseline`.",
      "",
      `- Arquivos analisados: **${files.length}**`,
      `- SCCs (ciclos) encontrados: **${sccs.length}**`,
      "",
    ];
    if (sccs.length === 0) {
      md.push("Nenhum ciclo estático detectado. ✅");
    } else {
      md.push("## Ciclos");
      sccs.forEach((c, i) => {
        md.push("", `### Ciclo #${i + 1} (${c.length} nós)`, "");
        for (const n of c) md.push(`- \`${rel(n)}\``);
      });
    }
    md.push(
      "",
      "## Política",
      "",
      "- Este baseline é herdado do legado. **Nenhum ciclo novo é aceito** em",
      "  `src/modules/**`, `src/contracts/**`, `src/app/**`, `src/shared/**`,",
      "  `src/integrations/**`.",
      "- Ciclos remanescentes devem ser eliminados nas Ondas 2–14 conforme",
      "  o módulo é migrado (ver `docs/plano-modularizacao-roxou.md`).",
      ""
    );
    await fs.writeFile(path.join(ROOT, "docs/ciclos-dependencias-baseline.md"), md.join("\n"));
    console.log("[audit:cycles] baseline gravado em docs/ciclos-dependencias-baseline.md");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

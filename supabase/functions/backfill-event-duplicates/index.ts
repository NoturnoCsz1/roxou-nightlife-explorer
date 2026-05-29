// Roxou — Backfill de duplicidade em eventos antigos.
// Preenche dedupe_key, flyer_fingerprint, duplicate_checked_at.
// Identifica grupos com alta confiança (mesmo fingerprint OU mesma dedupe_key)
// e marca duplicate_group_id. NÃO apaga, NÃO publica, NÃO arquiva.
// Apenas relatório no retorno.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { requireCronOrAdmin, corsHeaders } from "../_shared/requireAdmin.ts";


// ---------- helpers (espelho de src/lib/eventDuplicateDetector.ts) ----------
const TITLE_SPAM_RE =
  /\b(hoje tem|sextou|sabadou|domingou|imperdivel|imperdível|ultima chance|última chance|corre|corra|promo[cç][aã]o|ingresso garantido|open bar)\b/gi;
const PHONE_RE = /(\+?\d{2}\s?)?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/g;
const PRICE_RE = /\b(r\$\s?\d+[\.,]?\d*|\d+\s?reais?)\b/gi;
const HASHTAG_RE = /#\w+/g;
const MENTION_RE = /@\w+/g;
const URL_RE = /https?:\/\/\S+/g;
const VENUE_SUFFIX_RE =
  /\b(bar|club|clube|casa|pub|lounge|disco|boate|hall|arena|espa[çc]o)\b/g;

function normalizeText(s: string | null | undefined): string {
  if (!s) return "";
  return String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitle(t: string | null | undefined): string {
  if (!t) return "";
  let s = String(t)
    .replace(URL_RE, " ")
    .replace(HASHTAG_RE, " ")
    .replace(MENTION_RE, " ")
    .replace(PHONE_RE, " ")
    .replace(PRICE_RE, " ")
    .replace(TITLE_SPAM_RE, " ");
  return normalizeText(s);
}

function normalizeVenue(v: string | null | undefined): string {
  const base = normalizeText(v);
  if (!base) return "";
  const cleaned = base.replace(VENUE_SUFFIX_RE, " ").replace(/\s+/g, " ").trim();
  return cleaned.length >= 3 ? cleaned : base;
}

function dateKeySP(iso: string | null | undefined): string {
  if (!iso) return "nodate";
  try {
    const d = new Date(iso);
    // -03:00 (sem DST)
    const sp = new Date(d.getTime() - 3 * 3600 * 1000);
    return sp.toISOString().slice(0, 10);
  } catch {
    return String(iso).slice(0, 10) || "nodate";
  }
}

function generateDedupeKey(e: {
  partner_id?: string | null;
  title?: string | null;
  date_time?: string | null;
  venue_name?: string | null;
}): string {
  const t = (normalizeTitle(e.title).replace(/\s+/g, "-")) || "notitle";
  const v = (normalizeVenue(e.venue_name).replace(/\s+/g, "-")) || "novenue";
  const d = dateKeySP(e.date_time);
  const p = e.partner_id || "nopartner";
  return `${p}|${t}|${d}|${v}`;
}

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function cleanImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`.toLowerCase();
  } catch {
    return String(url).split("?")[0].toLowerCase();
  }
}

function generateFlyerFingerprint(e: {
  image_hash?: string | null;
  image_url?: string | null;
}): string | null {
  if (e.image_hash) return `h:${e.image_hash}`;
  const url = cleanImageUrl(e.image_url);
  if (url) return `u:${fnv1a(url)}`;
  return null;
}

// ---------- handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireCronOrAdmin(req);
  if (!auth.ok) return auth.response;


  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({} as any));
    const dryRun = body?.dry_run === true;
    const onlyMissing = body?.only_missing !== false; // default true
    const batchSize = Math.min(Math.max(Number(body?.batch_size) || 500, 50), 1000);

    const report = {
      analyzed: 0,
      fingerprints_created: 0,
      dedupe_keys_created: 0,
      possible_duplicates: 0,
      confirmed_duplicates: 0,
      groups_created: 0,
      errors: [] as string[],
      dry_run: dryRun,
    };

    // 1) busca eventos em lotes
    let from = 0;
    const all: any[] = [];
    while (true) {
      let q = supabase
        .from("events")
        .select(
          "id, title, date_time, venue_name, partner_id, image_url, image_hash, dedupe_key, flyer_fingerprint, duplicate_group_id, duplicate_checked_at",
        )
        .order("created_at", { ascending: false })
        .range(from, from + batchSize - 1);

      if (onlyMissing) {
        q = q.or(
          "dedupe_key.is.null,flyer_fingerprint.is.null,duplicate_checked_at.is.null",
        );
      }

      const { data, error } = await q;
      if (error) {
        report.errors.push(`fetch ${from}: ${error.message}`);
        break;
      }
      if (!data?.length) break;
      all.push(...data);
      if (data.length < batchSize) break;
      from += batchSize;
      if (all.length > 20000) break; // safety
    }

    report.analyzed = all.length;

    // 2) calcula campos e atualiza
    const updates: { id: string; patch: any; fp: string | null; key: string }[] = [];
    for (const ev of all) {
      try {
        const fp =
          ev.flyer_fingerprint ||
          generateFlyerFingerprint({
            image_hash: ev.image_hash,
            image_url: ev.image_url,
          });
        const key = ev.dedupe_key || generateDedupeKey(ev);

        const patch: any = { duplicate_checked_at: new Date().toISOString() };
        if (!ev.dedupe_key && key) {
          patch.dedupe_key = key;
          report.dedupe_keys_created++;
        }
        if (!ev.flyer_fingerprint && fp) {
          patch.flyer_fingerprint = fp;
          report.fingerprints_created++;
        }
        updates.push({ id: ev.id, patch, fp, key });
      } catch (e) {
        report.errors.push(`prep ${ev.id}: ${(e as Error).message}`);
      }
    }

    if (!dryRun) {
      // updates individuais (concorrência limitada)
      const concurrency = 8;
      let i = 0;
      async function worker() {
        while (i < updates.length) {
          const idx = i++;
          const u = updates[idx];
          const { error } = await supabase
            .from("events")
            .update(u.patch)
            .eq("id", u.id);
          if (error) report.errors.push(`upd ${u.id}: ${error.message}`);
        }
      }
      await Promise.all(Array.from({ length: concurrency }, worker));
    }

    // 3) detecta grupos de alta confiança (mesmo fp OU mesma dedupe_key)
    const byFp = new Map<string, string[]>();
    const byKey = new Map<string, string[]>();
    for (const u of updates) {
      if (u.fp) {
        if (!byFp.has(u.fp)) byFp.set(u.fp, []);
        byFp.get(u.fp)!.push(u.id);
      }
      if (u.key) {
        if (!byKey.has(u.key)) byKey.set(u.key, []);
        byKey.get(u.key)!.push(u.id);
      }
    }

    // união (UF simples via Map)
    const parent = new Map<string, string>();
    function find(x: string): string {
      let p = parent.get(x) ?? x;
      while (p !== (parent.get(p) ?? p)) p = parent.get(p) ?? p;
      parent.set(x, p);
      return p;
    }
    function union(a: string, b: string) {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent.set(ra, rb);
    }
    for (const ids of [...byFp.values(), ...byKey.values()]) {
      if (ids.length < 2) continue;
      for (let k = 1; k < ids.length; k++) union(ids[0], ids[k]);
    }

    // agrupa
    const groups = new Map<string, string[]>();
    for (const u of updates) {
      const r = find(u.id);
      if (!groups.has(r)) groups.set(r, []);
      groups.get(r)!.push(u.id);
    }

    const confirmedGroups = [...groups.values()].filter((g) => g.length > 1);
    report.possible_duplicates = confirmedGroups.reduce(
      (s, g) => s + g.length,
      0,
    );

    if (!dryRun) {
      for (const g of confirmedGroups) {
        // usa o menor id (estável) como group_id determinístico — na verdade, gera um uuid v4
        const groupId = crypto.randomUUID();
        const { error } = await supabase
          .from("events")
          .update({ duplicate_group_id: groupId })
          .in("id", g)
          .is("duplicate_group_id", null);
        if (error) {
          report.errors.push(`group ${groupId}: ${error.message}`);
          continue;
        }
        report.groups_created++;
        report.confirmed_duplicates += g.length;
      }
    } else {
      report.groups_created = confirmedGroups.length;
      report.confirmed_duplicates = report.possible_duplicates;
    }

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

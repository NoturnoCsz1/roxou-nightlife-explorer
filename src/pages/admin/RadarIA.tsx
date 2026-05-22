import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cleanEventTitle, wasTitleOptimized } from "@/lib/titleCleaner";
import { findPossibleDuplicateEvent } from "@/lib/eventDuplicateDetector";
import { validateBeforePublish, persistValidationLog, REASON_LABELS } from "@/lib/eventIngestionGuard";
import {
  Radar,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Pencil,
  XCircle,
  ExternalLink,
  Loader2,
  ImageIcon,
  Calendar,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  ScanLine,
  Archive,
  ArchiveRestore,
  Repeat2,
  History,
  Pin,
  Ban,
  SlidersHorizontal,
  Trash2,
  Clock,
  Music2,
  Utensils,
  Megaphone,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type TabKey = "novos" | "revisar" | "criados" | "ignorados" | "arquivados";

interface ScanRow {
  id: string;
  media_id: string;
  permalink: string | null;
  source_handle: string | null;
  partner_id: string | null;
  status: string;
  reason: string | null;
  dedupe_key: string | null;
  event_id: string | null;
  duplicate_of_event_id: string | null;
  raw_ocr: string | null;
  raw_caption: string | null;
  extracted_json: any;
  keywords: string[] | null;
  ai_confidence: string | null;
  scan_count: number;
  last_seen_at: string;
  created_at: string;
  archived_at: string | null;
  archive_reason: string | null;
  hidden_from_radar: boolean;
  permanently_ignored?: boolean;
  preview_image_url?: string | null;
  first_published_at: string | null;
  last_reposted_at: string | null;
  repost_count: number;
  created_event_deleted_at?: string | null;
  deletion_reason?: string | null;
  duplicate_score?: number | null;
  duplicate_reason?: string | null;
  flyer_fingerprint?: string | null;
}

interface EventRow {
  id: string;
  title: string;
  slug: string;
  date_time: string | null;
  venue_name: string | null;
  image_url: string | null;
  status: string;
  ai_confidence: string | null;
  instagram: string | null;
  dedupe_key: string | null;
  original_detected_title: string | null;
}

interface Card {
  scan: ScanRow;
  event: EventRow | null;
  duplicateOf: EventRow | null;
}

const confBadge: Record<string, string> = {
  high: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
  medium: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  low: "bg-rose-400/15 text-rose-300 border-rose-400/30",
};

function formatDate(dt: string | null) {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return dt; }
}

// ============ DEFENSIVE DATE PARSER ============
// Aceita ISO (yyyy-mm-dd) ou DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY.
// Retorna ISO com offset -03:00 ou null se não der pra parsear com segurança.
function parseEventDateTimeSP(ext: any): string | null {
  const dateRaw = ext?.date ?? ext?.event_date ?? null;
  const timeRaw = ext?.time ?? ext?.event_time ?? "22:00";
  if (!dateRaw) return null;
  const s = String(dateRaw).trim();
  let y = 0, mo = 0, d = 0;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else {
    m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (m) {
      d = +m[1]; mo = +m[2]; y = +m[3];
      if (y < 100) y += 2000;
    } else return null;
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const t = String(timeRaw).match(/^(\d{1,2}):?(\d{2})?/);
  const hh = t ? Math.min(23, +t[1]) : 22;
  const mi = t && t[2] ? Math.min(59, +t[2]) : 0;
  const iso = `${y}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}T${String(hh).padStart(2,"0")}:${String(mi).padStart(2,"0")}:00-03:00`;
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return null;
  return iso;
}

function slugifyScan(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80) || "evento";
}

// ============ PREVIEW HELPERS ============
function normalizeUrl(raw: any): string | null {
  if (raw == null) return null;
  let u = String(raw).trim();
  if (!u || u === "null" || u === "undefined") return null;
  try { u = decodeURI(u); } catch {}
  if (!/^https?:\/\//i.test(u)) return null;
  return u;
}

function buildPreviewChain(scan: any, ev: any, ext: any): string[] {
  const candidates = [
    ev?.image_url,
    scan?.preview_image_url,
    ext?.image_url,
    ext?.flyer_url,
    ext?.media_url,
    ext?.thumbnail_url,
    ext?.display_url,
    Array.isArray(ext?.media) ? ext.media[0]?.url : null,
    Array.isArray(ext?.media) ? ext.media[0]?.thumbnail_url : null,
  ];
  const out: string[] = [];
  for (const c of candidates) {
    const n = normalizeUrl(c);
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}

// Mini-componente com fallback automático + skeleton + fade-in
function SmartPreview({ urls, alt }: { urls: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setIdx(0); setLoaded(false); }, [urls.join("|")]);

  if (!urls.length || idx >= urls.length) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground/60 bg-gradient-to-br from-primary/5 to-purple-500/5">
        <Radar className="h-10 w-10" />
        <span className="text-[10px] uppercase tracking-wider">Sem preview</span>
      </div>
    );
  }
  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted/40 via-muted/20 to-muted/40" />
      )}
      <img
        key={urls[idx]}
        src={urls[idx]}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => { setLoaded(false); setIdx((i) => i + 1); }}
        className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </>
  );
}

// ============ CLASSIFICAÇÃO DE CONTEÚDO ============
const MUSIC_KEYWORDS = [
  "dj","música ao vivo","musica ao vivo","ao vivo","show","banda","cantor","cantora",
  "sertanejo","pagode","funk","eletrônica","eletronica","rock","mpb","samba","roda de samba",
  "axé","forró","forro","reggae","hip hop","rap","trap","techno","house","brega",
  "balada","festa","festival","sunset","after","resenha","open bar","openbar",
  "universitário","universitario","line up","line-up","atração","atracao","apresenta",
  "🎤","🎧","🎶","🎵","🪩","🎸","🥁",
];
const FOOD_KEYWORDS = [
  "prato executivo","executivo","hamburguer","hambúrguer","burger","pizza","almoço","almoco",
  "jantar","cardápio","cardapio","menu","delivery","combo","promoção do dia","happy hour comida",
  "porção","porcao","churrasco","rodízio","rodizio","buffet",
];
const AD_KEYWORDS = [
  "publicidade","institucional","propaganda","aniversário da loja","aniversario da loja",
  "venha conhecer","novidade","inauguração","inauguracao","abertura","financiamento",
  "imobiliária","imobiliaria","oferta","queima de estoque",
];

function getContentText(scan: any, ext: any): string {
  return [
    scan?.raw_caption, scan?.raw_ocr, ext?.title, ext?.description, ext?.summary,
    Array.isArray(scan?.keywords) ? scan.keywords.join(" ") : "",
    Array.isArray(ext?.hashtags) ? ext.hashtags.join(" ") : "",
  ].filter(Boolean).join(" ").toLowerCase();
}

type ContentKind = "music" | "food" | "ad" | "review";
function classifyContent(scan: any, ext: any): ContentKind {
  const text = getContentText(scan, ext);
  const detected = String(ext?.detected_type || ext?.type || "").toLowerCase();
  const hasMusic = MUSIC_KEYWORDS.some(k => text.includes(k));
  const hasFood = FOOD_KEYWORDS.some(k => text.includes(k));
  const hasAd = AD_KEYWORDS.some(k => text.includes(k));
  if (hasMusic) return "music";
  if (detected === "promotion" || detected === "promocao" || hasAd) return "ad";
  if (detected === "menu" || hasFood) return "food";
  return "review";
}

const CONTENT_BADGE: Record<ContentKind, { label: string; icon: any; cls: string }> = {
  music: { label: "Evento Musical", icon: Music2, cls: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40" },
  food:  { label: "Gastronomia",    icon: Utensils, cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  ad:    { label: "Publicidade",    icon: Megaphone, cls: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30" },
  review:{ label: "Revisar",        icon: AlertTriangle, cls: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
};

const TABS: { key: TabKey; label: string; hint: string }[] = [
  { key: "novos", label: "Novos", hint: "Recém capturados, aguardando decisão" },
  { key: "revisar", label: "Revisar", hint: "Possíveis duplicados ou data incerta" },
  { key: "criados", label: "Criados", hint: "Já viraram evento (rascunho ou publicado)" },
  { key: "ignorados", label: "Ignorados", hint: "Promoção, aviso, post antigo ou sem data" },
  { key: "arquivados", label: "Arquivados", hint: "Itens removidos da operação" },
];

interface AdvancedFilters {
  partner: string; // source_handle
  detected_type: string; // evento|promocao|aviso|menu|generico|desconhecido
  has_event: "any" | "yes" | "no";
  is_duplicate: "any" | "yes" | "no";
  status_raw: string;
  include_history: boolean;
}

const DEFAULT_FILTERS: AdvancedFilters = {
  partner: "",
  detected_type: "",
  has_event: "any",
  is_duplicate: "any",
  status_raw: "",
  include_history: false,
};

const RadarIA = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("novos");
  const [filters, setFilters] = useState<AdvancedFilters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Card | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkRunning, setBulkRunning] = useState(false);
  const [counts, setCounts] = useState<Record<TabKey, number>>({
    novos: 0, revisar: 0, criados: 0, ignorados: 0, arquivados: 0,
  });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function clearSelection() { setSelected(new Set()); }
  function selectAllVisible() {
    setSelected(new Set(cards.map((c) => c.scan.id)));
  }

  function categorize(card: Card): TabKey {
    const s = card.scan;
    if (s.permanently_ignored || s.hidden_from_radar) return "arquivados";

    const evStatus = card.event?.status;
    const reason = (s.reason || "").toLowerCase();
    const ext = s.extracted_json || {};
    const detectedType = (ext.detected_type || ext.type || "").toLowerCase();

    // Ignorados: promoção, aviso, post antigo, sem data
    if (
      s.status === "ignored" ||
      detectedType === "promotion" || detectedType === "promocao" ||
      detectedType === "announcement" || detectedType === "aviso" ||
      reason.includes("promo") || reason.includes("aviso") ||
      reason.includes("post antigo") || reason.includes("fora da janela") ||
      reason.includes("não é evento") || reason.includes("nao e evento")
    ) return "ignorados";

    // Revisar: duplicados, data insegura, confiança baixa
    if (
      s.status === "possible_duplicate" ||
      s.duplicate_of_event_id ||
      (s.ai_confidence || "").toLowerCase() === "low" ||
      reason.includes("data insegura") || reason.includes("classifica")
    ) return "revisar";

    // Criados: tem event_id e evento existe
    if (s.event_id && card.event && !s.created_event_deleted_at) {
      return "criados";
    }
    if (s.status === "skipped_duplicate" && evStatus === "published") return "criados";

    return "novos";
  }

  async function load() {
    setLoading(true);
    const { data: scans, error } = await supabase
      .from("instagram_scans" as any)
      .select("*")
      .order("last_seen_at", { ascending: false })
      .limit(500);

    if (error) {
      toast.error(`Erro: ${error.message}`);
      setLoading(false);
      return;
    }

    const scanRows = ((scans || []) as unknown) as ScanRow[];
    const eventIds = Array.from(new Set([
      ...scanRows.map((s) => s.event_id).filter(Boolean),
      ...scanRows.map((s) => s.duplicate_of_event_id).filter(Boolean),
    ])) as string[];

    let eventsMap = new Map<string, EventRow>();
    if (eventIds.length) {
      const { data: evs } = await supabase
        .from("events")
        .select("id,title,slug,date_time,venue_name,image_url,status,ai_confidence,instagram,dedupe_key,original_detected_title")
        .in("id", eventIds);
      (evs || []).forEach((e) => eventsMap.set(e.id, e as EventRow));
    }

    const allCards: Card[] = scanRows.map((scan) => ({
      scan,
      event: scan.event_id ? eventsMap.get(scan.event_id) || null : null,
      duplicateOf: scan.duplicate_of_event_id ? eventsMap.get(scan.duplicate_of_event_id) || null : null,
    }));

    // Categorize once
    const categorized = allCards.map((c) => ({ card: c, tab: categorize(c) }));

    const c: Record<TabKey, number> = {
      novos: 0, revisar: 0, criados: 0, ignorados: 0, arquivados: 0,
    };
    for (const { tab: t } of categorized) c[t]++;
    setCounts(c);

    // Apply tab filter
    let filtered = categorized.filter((x) => x.tab === tab).map((x) => x.card);

    // Apply advanced filters
    if (filters.partner.trim()) {
      const q = filters.partner.trim().toLowerCase();
      filtered = filtered.filter((x) => (x.scan.source_handle || "").toLowerCase().includes(q));
    }
    if (filters.detected_type) {
      filtered = filtered.filter((x) => {
        const ext = x.scan.extracted_json || {};
        const t = (ext.detected_type || ext.type || "").toLowerCase();
        return t === filters.detected_type;
      });
    }
    if (filters.has_event !== "any") {
      filtered = filtered.filter((x) =>
        filters.has_event === "yes" ? !!x.event : !x.event,
      );
    }
    if (filters.is_duplicate !== "any") {
      filtered = filtered.filter((x) => {
        const isDup = x.scan.status === "possible_duplicate" ||
          x.scan.status === "skipped_duplicate" ||
          !!x.scan.duplicate_of_event_id;
        return filters.is_duplicate === "yes" ? isDup : !isDup;
      });
    }
    if (filters.status_raw) {
      filtered = filtered.filter((x) => x.scan.status === filters.status_raw);
    }
    if (filters.include_history && tab !== "arquivados") {
      // include archived items belonging to same logical bucket
      const extras = categorized
        .filter((x) => x.card.scan.hidden_from_radar)
        .map((x) => x.card);
      filtered = [...filtered, ...extras];
    }

    // Hard time-window (apenas para abas operacionais: novos/revisar)
    // Janela: posts capturados nos últimos 2 dias OU eventos com data entre ontem e +30d
    if (tab === "novos" || tab === "revisar") {
      const TWO_DAYS = 1000 * 60 * 60 * 24 * 2;
      const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30;
      const now = Date.now();
      filtered = filtered.filter((x) => {
        const seen = x.scan.last_seen_at ? new Date(x.scan.last_seen_at).getTime() : 0;
        const recentPost = seen && (now - seen) <= TWO_DAYS;
        const ext = x.scan.extracted_json || {};
        const evDtStr = x.event?.date_time || parseEventDateTimeSP(ext);
        const evMs = evDtStr ? new Date(evDtStr).getTime() : 0;
        const futureEvent = evMs && !isNaN(evMs) && evMs >= (now - TWO_DAYS) && evMs <= (now + THIRTY_DAYS);
        // Sem data válida não derruba o item: mantém pelo last_seen_at recente.
        return recentPost || futureEvent;
      });
    }

    // Ordenar: música primeiro, depois revisar, food, ad por último
    const kindOrder: Record<string, number> = { music: 0, review: 1, food: 2, ad: 3 };
    filtered.sort((a, b) => {
      const ka = kindOrder[classifyContent(a.scan, a.scan.extracted_json || {})] ?? 5;
      const kb = kindOrder[classifyContent(b.scan, b.scan.extracted_json || {})] ?? 5;
      if (ka !== kb) return ka - kb;
      const sa = a.scan.last_seen_at ? new Date(a.scan.last_seen_at).getTime() : 0;
      const sb = b.scan.last_seen_at ? new Date(b.scan.last_seen_at).getTime() : 0;
      return sb - sa;
    });

    setCards(filtered);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab, filters]);
  useEffect(() => { clearSelection(); /* eslint-disable-next-line */ }, [tab]);

  async function triggerScan() {
    setScanning(true);
    const t = toast.loading("Varrendo Instagrams (OCR + IA)...");
    const { data, error } = await supabase.functions.invoke("automatic-event-hunter");
    toast.dismiss(t);
    setScanning(false);
    if (error) { toast.error(`Falha: ${error.message}`); return; }
    const d = data as any;
    toast.success(
      `Radar IA: ${d?.media_seen ?? 0} posts • ${d?.previews_found ?? 0} previews • ${d?.previews_missing ?? 0} sem imagem • ${d?.drafts_created ?? 0} novos`,
    );
    load();
  }

  async function resetRadar() {
    if (!confirm("Resetar Radar IA?\n\nVai arquivar scans antigos sem preview ou fora da janela.\nEventos já criados NÃO serão apagados.")) return;
    setScanning(true);
    const t = toast.loading("Resetando radar...");
    const { data: userData } = await supabase.auth.getUser();
    const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    // Arquiva: sem preview, OU sem evento e antigo (>2d), preservando os já vinculados a eventos publicados
    const { data, error } = await supabase
      .from("instagram_scans" as any)
      .update({
        hidden_from_radar: true,
        archived_at: new Date().toISOString(),
        archive_reason: "Reset manual para recaptura com preview",
        archived_by: userData.user?.id ?? null,
        status: "archived",
      })
      .eq("hidden_from_radar", false)
      .or(`preview_image_url.is.null,and(event_id.is.null,last_seen_at.lt.${cutoff})`)
      .select("id");
    toast.dismiss(t);
    setScanning(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Reset: ${data?.length ?? 0} scans arquivados. Agora dispare uma nova varredura.`);
    load();
  }

  async function runBackfillDuplicates(dry = false) {
    if (!dry && !confirm("Rodar backfill de duplicidade em eventos antigos?\n\nVai preencher dedupe_key, flyer_fingerprint e duplicate_group_id (alta confiança).\nNão apaga, não publica, não arquiva nada.")) return;
    setScanning(true);
    const t = toast.loading(dry ? "Analisando (dry-run)..." : "Rodando backfill...");
    const { data, error } = await supabase.functions.invoke("backfill-event-duplicates", {
      body: { dry_run: dry, only_missing: true, batch_size: 500 },
    });
    toast.dismiss(t);
    setScanning(false);
    if (error) { toast.error(`Falha: ${error.message}`); return; }
    const d = data as any;
    toast.success(
      `Backfill${dry ? " (dry)" : ""}: ${d?.analyzed ?? 0} analisados • ${d?.fingerprints_created ?? 0} fingerprints • ${d?.dedupe_keys_created ?? 0} dedupe_keys • ${d?.groups_created ?? 0} grupos • ${d?.confirmed_duplicates ?? 0} duplicados • ${d?.errors?.length ?? 0} erros`,
      { duration: 8000 },
    );
    console.log("[backfill-event-duplicates]", d);
  }

  async function archiveScan(scanId: string, reason = "manual") {
    setActing(scanId);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("instagram_scans" as any)
      .update({
        hidden_from_radar: true,
        archived_at: new Date().toISOString(),
        archive_reason: reason,
        archived_by: userData.user?.id ?? null,
      })
      .eq("id", scanId);
    setActing(null);
    if (error) toast.error(error.message);
    else { toast.success("Item arquivado."); load(); }
  }

  async function unarchiveScan(scanId: string) {
    setActing(scanId);
    const { error } = await supabase
      .from("instagram_scans" as any)
      .update({ hidden_from_radar: false, archived_at: null, archive_reason: null, archived_by: null })
      .eq("id", scanId);
    setActing(null);
    if (error) toast.error(error.message);
    else { toast.success("Restaurado."); load(); }
  }

  async function permanentlyIgnore(scanId: string) {
    setActing(scanId);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("instagram_scans" as any)
      .update({
        permanently_ignored: true,
        hidden_from_radar: true,
        archived_at: new Date().toISOString(),
        archive_reason: "Ignorado permanentemente pelo admin",
        archived_by: userData.user?.id ?? null,
      })
      .eq("id", scanId);
    setActing(null);
    if (error) toast.error(error.message);
    else { toast.success("Postagem ignorada permanentemente."); load(); }
  }

  // ===== BULK ACTIONS =====
  async function bulkArchive() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (!confirm(`Arquivar ${ids.length} item(ns) do Radar?`)) return;
    setBulkRunning(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("instagram_scans" as any)
      .update({
        hidden_from_radar: true,
        archived_at: new Date().toISOString(),
        archive_reason: "Arquivamento em lote pelo admin",
        archived_by: userData.user?.id ?? null,
      })
      .in("id", ids);
    setBulkRunning(false);
    if (error) toast.error(error.message);
    else { toast.success(`${ids.length} item(ns) arquivado(s).`); clearSelection(); load(); }
  }

  async function bulkPermanentIgnore() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (!confirm(`Ignorar permanentemente ${ids.length} item(ns)? Eles não voltarão em novas varreduras.`)) return;
    setBulkRunning(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("instagram_scans" as any)
      .update({
        permanently_ignored: true,
        hidden_from_radar: true,
        archived_at: new Date().toISOString(),
        archive_reason: "Ignorado permanentemente em lote",
        archived_by: userData.user?.id ?? null,
      })
      .in("id", ids);
    setBulkRunning(false);
    if (error) toast.error(error.message);
    else { toast.success(`${ids.length} item(ns) ignorado(s) permanentemente.`); clearSelection(); load(); }
  }

  async function bulkCreateEvents() {
    const targets = cards.filter((c) => selected.has(c.scan.id) && !c.event && !c.scan.permanently_ignored);
    if (!targets.length) { toast.info("Nenhum item selecionado pode virar evento."); return; }
    if (!confirm(`Criar rascunhos para ${targets.length} item(ns) selecionado(s)?`)) return;
    setBulkRunning(true);
    const t = toast.loading(`Criando ${targets.length} evento(s)...`);
    let ok = 0, fail = 0;
    for (const c of targets) {
      try { await createEventFromScan(c); ok++; } catch { fail++; }
    }
    toast.dismiss(t);
    setBulkRunning(false);
    toast.success(`Lote: ${ok} criado(s), ${fail} falha(s).`);
    clearSelection();
    load();
  }

  async function runRetention() {
    const t = toast.loading("Aplicando retenção inteligente...");
    const { data, error } = await supabase.rpc("archive_old_radar_scans");
    toast.dismiss(t);
    if (error) toast.error(error.message);
    else { toast.success(`${data ?? 0} itens arquivados automaticamente`); load(); }
  }

  async function createEventFromScan(card: Card) {
    const scan = card.scan;
    if (scan.event_id) { toast.info("Este item já possui evento vinculado."); return; }
    const ext = scan.extracted_json || {};
    const rawTitle = (ext.title || (scan.raw_caption || "").split("\n")[0] || `Evento @${scan.source_handle || ""}`).trim().slice(0, 200);
    const cleaned = cleanEventTitle(rawTitle) || rawTitle;
    const safeDt = parseEventDateTimeSP(ext);
    const fallbackDt = new Date(Date.now() + 2 * 86400000).toISOString();
    const dt = safeDt || fallbackDt;
    const venue = ext.venue_name || ext.venue || scan.source_handle || "A confirmar";
    const slug = slugifyScan(`${cleaned}-${(scan.media_id || scan.id).slice(-6)}`);
    const description = [
      Array.isArray(ext.artists) && ext.artists.length ? `Atrações: ${ext.artists.join(", ")}` : null,
      ext.price ? `Entrada: ${ext.price}` : null,
      ext.description,
      scan.raw_caption,
    ].filter(Boolean).join("\n\n").slice(0, 4000) || null;
    const imageUrl = scan.preview_image_url || ext.image_url || ext.flyer_url || null;

    setActing(scan.id);

    // === Guard de ingestão (OCR/data/escopo/duplicidade) ===
    const guard = await validateBeforePublish({
      source: "radar",
      title: cleaned,
      description,
      venue_name: venue,
      partner_id: scan.partner_id,
      date_time: dt,
      image_url: imageUrl,
      flyer_fingerprint: scan.flyer_fingerprint,
      raw_caption: scan.raw_caption,
      raw_ocr: scan.raw_ocr,
      scan_id: scan.id,
    });

    // Bloqueio duro (MESMO_FLYER / DUPLICATA) — não cria.
    const hardBlocks = guard.blockReasons.filter(
      (r) => r === "MESMO_FLYER" || r === "DUPLICATA" || r === "FORA_DO_ESCOPO" || r === "EVENTO_NO_PASSADO",
    );
    if (hardBlocks.length) {
      setActing(null);
      await persistValidationLog(guard.validationLog);
      toast.error(`Bloqueado: ${hardBlocks.map((r) => REASON_LABELS[r] || r).join(", ")}`);
      return;
    }

    const { data: inserted, error } = await supabase.from("events").insert({
      title: cleaned,
      original_detected_title: rawTitle,
      slug,
      date_time: dt,
      category: ext.category || "festa",
      sub_category: ext.sub_category || null,
      partner_id: scan.partner_id,
      venue_name: venue,
      address: ext.address || null,
      instagram: scan.permalink || null,
      description,
      status: "draft",
      verification_source: "radar-manual",
      image_url: imageUrl,
      ai_confidence: scan.ai_confidence || "medium",
      needs_review: !safeDt || guard.recommendedNeedsReview,
      dedupe_key: scan.dedupe_key || null,
      flyer_fingerprint: scan.flyer_fingerprint || null,
      duplicate_checked_at: new Date().toISOString(),
    } as any).select("id").single();

    if (error || !inserted) {
      setActing(null);
      toast.error(`Falha ao criar: ${error?.message || "desconhecido"}`);
      return;
    }

    await persistValidationLog(guard.validationLog, inserted.id);

    await supabase.from("instagram_scans" as any)
      .update({ event_id: inserted.id, status: "created_draft" })
      .eq("id", scan.id);

    setActing(null);
    const warnSuffix = guard.warnings.length ? ` ⚠ ${guard.badges.join(" · ")}` : "";
    toast.success((safeDt ? "Evento criado como rascunho. Revise e publique." : "Evento criado (data incerta — revise antes de publicar).") + warnSuffix);
    load();
  }

  async function approve(eventId: string, scanId: string, force = false) {
    setActing(eventId);

    // Busca título + dados do evento atual
    const { data: evCur } = await supabase
      .from("events")
      .select("id, title, original_detected_title, date_time, venue_name, partner_id, image_hash, instagram, flyer_fingerprint")
      .eq("id", eventId)
      .maybeSingle();

    // === Checagem de duplicidade antes de publicar (a menos que force=true) ===
    if (!force && evCur?.date_time) {
      const day = evCur.date_time.slice(0, 10);
      const fromDate = new Date(new Date(day + "T00:00:00-03:00").getTime() - 15 * 86400000).toISOString();
      const toDate = new Date(new Date(day + "T23:59:59-03:00").getTime() + 15 * 86400000).toISOString();
      const { data: nearby } = await supabase
        .from("events")
        .select("id,title,date_time,venue_name,partner_id,image_hash,instagram,flyer_fingerprint,dedupe_key,status")
        .eq("status", "published")
        .gte("date_time", fromDate)
        .lte("date_time", toDate)
        .neq("id", eventId)
        .limit(200);
      const dup = findPossibleDuplicateEvent(evCur as any, (nearby || []) as any[]);
      if (dup.decision === "confirmed" && dup.matched_event_id) {
        setActing(null);
        toast.error(`Duplicado de "${dup.matched_event_title}" (score ${Math.round(dup.duplicate_score)}). Vincule ou use forçar.`, {
          action: { label: "Publicar mesmo assim", onClick: () => approve(eventId, scanId, true) },
        });
        return;
      }
    }

    // === Guard de publicação ===
    if (!force && evCur) {
      const guard = await validateBeforePublish({
        source: "radar",
        title: evCur.title,
        venue_name: evCur.venue_name,
        partner_id: evCur.partner_id,
        date_time: evCur.date_time,
        image_hash: (evCur as any).image_hash,
        flyer_fingerprint: evCur.flyer_fingerprint,
        current_event_id: eventId,
        scan_id: scanId,
      });
      const hardBlocks = guard.blockReasons.filter(
        (r) => r === "EVENTO_NO_PASSADO" || r === "FORA_DO_ESCOPO" || r === "DATA_DIVERGENTE",
      );
      if (hardBlocks.length) {
        setActing(null);
        await persistValidationLog(guard.validationLog, eventId);
        toast.error(`Bloqueado para publicar: ${hardBlocks.map((r) => REASON_LABELS[r] || r).join(", ")}`, {
          action: { label: "Publicar mesmo assim", onClick: () => approve(eventId, scanId, true) },
        });
        return;
      }
      await persistValidationLog(guard.validationLog, eventId);
    }

    const updates: Record<string, any> = { status: "published", needs_review: false };
    let optimized = false;
    if (evCur?.title) {
      const cleaned = cleanEventTitle(evCur.title);
      if (cleaned && wasTitleOptimized(evCur.title, cleaned)) {
        updates.title = cleaned;
        if (!evCur.original_detected_title) {
          updates.original_detected_title = evCur.title;
        }
        optimized = true;
      }
    }

    const { error } = await supabase.from("events").update(updates as any).eq("id", eventId);
    if (!error) {
      await supabase.from("instagram_scans" as any)
        .update({ first_published_at: new Date().toISOString() })
        .eq("id", scanId)
        .is("first_published_at", null);
    }
    setActing(null);
    if (error) toast.error(error.message);
    else {
      toast.success(optimized ? "Evento publicado · título otimizado ✨" : "Evento publicado!");
      load();
    }
  }

  async function ignore(eventId: string, scanId: string) {
    setActing(eventId);
    const { error } = await supabase
      .from("events")
      .update({ status: "archived", needs_review: false })
      .eq("id", eventId);
    if (error) {
      setActing(null);
      toast.error(error.message);
      return;
    }
    await archiveScan(scanId, "ignorado manualmente");
  }

  async function deleteCreatedEvent(card: Card) {
    const ev = card.event;
    if (!ev || !card.scan.event_id) {
      toast.error("Este item ainda não possui evento vinculado.");
      return;
    }
    setActing(card.scan.id);
    const { data: userData } = await supabase.auth.getUser();

    const { error: delErr } = await supabase
      .from("events")
      .delete()
      .eq("id", ev.id);

    if (delErr && !/no rows/i.test(delErr.message)) {
      setActing(null);
      toast.error("Não foi possível remover o evento criado.");
      return;
    }

    const { error: scanErr } = await supabase
      .from("instagram_scans" as any)
      .update({
        event_id: null,
        status: "archived",
        created_event_deleted_at: new Date().toISOString(),
        created_event_deleted_by: userData.user?.id ?? null,
        deletion_reason: "Removido manualmente pelo admin via Radar IA",
      })
      .eq("id", card.scan.id);

    setActing(null);
    setDeleteTarget(null);

    if (scanErr) toast.error("Evento removido, mas falhou ao atualizar Radar.");
    else toast.success("Evento criado removido com sucesso.");
    load();
  }

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.partner.trim()) n++;
    if (filters.detected_type) n++;
    if (filters.has_event !== "any") n++;
    if (filters.is_duplicate !== "any") n++;
    if (filters.status_raw) n++;
    if (filters.include_history) n++;
    return n;
  }, [filters]);

  return (
    <div className="space-y-6">
      {/* Header simplificado */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Radar className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              <h1 className="text-xl md:text-2xl font-display font-black tracking-tight">Radar IA</h1>
              <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-full bg-primary/20 text-primary font-bold">
                <Sparkles className="inline h-3 w-3 mr-0.5" /> OCR + Vision
              </span>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground max-w-2xl">
              Aura captura flyers recentes, filtra posts antigos e cria rascunhos apenas para revisão humana.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={runRetention}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card text-xs font-bold hover:bg-muted/40 transition"
            >
              <History className="h-4 w-4" /> Aplicar retenção
            </button>
            <button
              onClick={() => runBackfillDuplicates(true)}
              disabled={scanning}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card text-xs font-bold text-muted-foreground hover:text-foreground hover:border-primary/30 disabled:opacity-50 transition"
              title="Analisa eventos antigos sem aplicar mudanças (dry-run)."
            >
              <History className="h-4 w-4" /> Analisar duplicados
            </button>
            <button
              onClick={() => runBackfillDuplicates(false)}
              disabled={scanning}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-primary/40 bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 disabled:opacity-50 transition"
              title="Preenche dedupe_key, flyer_fingerprint e marca grupos de alta confiança. Não apaga nada."
            >
              <RefreshCw className="h-4 w-4" /> Backfill duplicidade
            </button>
            <button
              onClick={resetRadar}
              disabled={scanning}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 disabled:opacity-50 transition"
              title="Arquiva scans sem preview ou antigos. Eventos criados são preservados."
            >
              <RefreshCw className="h-4 w-4" /> Resetar Radar IA
            </button>
            <button
              onClick={triggerScan}
              disabled={scanning}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-50 transition shadow-[0_0_20px_-5px_hsl(var(--primary)/0.5)]"
            >
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {scanning ? "Varrendo..." : "Disparar varredura"}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs + Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              title={t.hint}
              className={`px-3.5 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-all flex items-center gap-2 ${
                tab === t.key
                  ? "bg-primary text-primary-foreground shadow-[0_0_15px_-3px_hsl(var(--primary)/0.6)]"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
              }`}
            >
              {t.label}
              <span className={`text-[10px] px-1.5 rounded-full ${tab === t.key ? "bg-white/20" : "bg-primary/15 text-primary"}`}>
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>

        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <button className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filtros
              {activeFilterCount > 0 && (
                <span className="px-1.5 rounded-full bg-primary text-primary-foreground text-[10px]">{activeFilterCount}</span>
              )}
            </button>
          </SheetTrigger>
          <SheetContent className="bg-card border-border overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filtros avançados</SheetTitle>
              <SheetDescription>Refine a lista atual de "{TABS.find((t) => t.key === tab)?.label}".</SheetDescription>
            </SheetHeader>
            <div className="space-y-4 mt-6 text-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Parceiro / @handle</label>
                <input
                  type="text"
                  value={filters.partner}
                  onChange={(e) => setFilters((f) => ({ ...f, partner: e.target.value }))}
                  placeholder="ex: barxyz"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:border-primary outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Tipo detectado</label>
                <select
                  value={filters.detected_type}
                  onChange={(e) => setFilters((f) => ({ ...f, detected_type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:border-primary outline-none"
                >
                  <option value="">Todos</option>
                  <option value="event">Evento</option>
                  <option value="promotion">Promoção</option>
                  <option value="announcement">Aviso</option>
                  <option value="menu">Cardápio</option>
                  <option value="generic">Genérico</option>
                  <option value="unknown">Desconhecido</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Status original</label>
                <select
                  value={filters.status_raw}
                  onChange={(e) => setFilters((f) => ({ ...f, status_raw: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:border-primary outline-none"
                >
                  <option value="">Todos</option>
                  <option value="created_draft">created_draft</option>
                  <option value="possible_duplicate">possible_duplicate</option>
                  <option value="skipped_duplicate">skipped_duplicate</option>
                  <option value="ignored">ignored</option>
                  <option value="scanned">scanned</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Com evento criado?</label>
                <select
                  value={filters.has_event}
                  onChange={(e) => setFilters((f) => ({ ...f, has_event: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:border-primary outline-none"
                >
                  <option value="any">Indiferente</option>
                  <option value="yes">Sim</option>
                  <option value="no">Não</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Duplicado?</label>
                <select
                  value={filters.is_duplicate}
                  onChange={(e) => setFilters((f) => ({ ...f, is_duplicate: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:border-primary outline-none"
                >
                  <option value="any">Indiferente</option>
                  <option value="yes">Sim</option>
                  <option value="no">Não</option>
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={filters.include_history}
                  onChange={(e) => setFilters((f) => ({ ...f, include_history: e.target.checked }))}
                  className="rounded border-border accent-primary"
                />
                Incluir itens arquivados (histórico)
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="flex-1 px-3 py-2 rounded-lg border border-border text-xs font-bold hover:bg-muted/40"
                >
                  Limpar
                </button>
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Bulk action bar */}
      {!loading && cards.length > 0 && (
        <div className={`sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-xl border p-2.5 transition-all ${selected.size > 0 ? "bg-primary/10 border-primary/40 shadow-[0_0_25px_-8px_hsl(var(--primary)/0.5)]" : "bg-card border-border"}`}>
          <button
            onClick={selected.size === cards.length ? clearSelection : selectAllVisible}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-card border border-border hover:border-primary/40 transition"
          >
            <input
              type="checkbox"
              readOnly
              checked={selected.size > 0 && selected.size === cards.length}
              ref={(el) => { if (el) el.indeterminate = selected.size > 0 && selected.size < cards.length; }}
              className="accent-primary pointer-events-none"
            />
            {selected.size === cards.length ? "Limpar seleção" : "Selecionar todos"}
          </button>
          <span className="text-xs text-muted-foreground">
            {selected.size} de {cards.length} selecionado(s)
          </span>
          {selected.size > 0 && (
            <div className="flex flex-wrap gap-2 ml-auto">
              <button
                onClick={bulkCreateEvents}
                disabled={bulkRunning}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-bold hover:bg-emerald-500/25 disabled:opacity-40 border border-emerald-500/30"
              >
                {bulkRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Criar eventos ({selected.size})
              </button>
              <button
                onClick={bulkArchive}
                disabled={bulkRunning}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-600/20 text-zinc-300 text-xs font-bold hover:bg-zinc-600/30 disabled:opacity-40 border border-zinc-500/30"
              >
                <Archive className="h-3.5 w-3.5" /> Arquivar ({selected.size})
              </button>
              <button
                onClick={bulkPermanentIgnore}
                disabled={bulkRunning}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600/15 text-rose-300 text-xs font-bold hover:bg-rose-600/25 disabled:opacity-40 border border-rose-500/30"
              >
                <Ban className="h-3.5 w-3.5" /> Ignorar perm. ({selected.size})
              </button>
              <button
                onClick={clearSelection}
                disabled={bulkRunning}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <Radar className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum item nesta aba.</p>
          <p className="text-xs text-muted-foreground/60 mt-2">Clique em "Disparar varredura" para capturar novos flyers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cards.map((c) => {
            const ext = c.scan.extracted_json || {};
            const conf = (c.scan.ai_confidence || ext.confidence || "medium").toLowerCase();
            const ev = c.event;
            const detectedType = (ext.detected_type || ext.type || "").toLowerCase();
            const previewUrls = buildPreviewChain(c.scan, ev, ext);
            const title = ev?.title || ext.title || "—";
            const dt = ev?.date_time || (ext.date ? `${ext.date}T${ext.time || "22:00"}:00-03:00` : null);
            const venue = ev?.venue_name || ext.venue_name || c.scan.source_handle;
            const cat = categorize(c);
            const kind = classifyContent(c.scan, ext);
            const kindMeta = CONTENT_BADGE[kind];
            const KindIcon = kindMeta.icon;

            // Radar classifier metadata (vem da edge function)
            const radarScore: number | null = typeof ext.radar_score === "number" ? ext.radar_score : null;
            const radarReasons: string[] = Array.isArray(ext.radar_reasons) ? ext.radar_reasons : [];
            const radarMain = radarReasons[0] || null;
            const radarExt = ext.radar_extracted || {};
            const detectedDate: string | null = radarExt.date || ext.date || null;
            const detectedTime: string | null = radarExt.time || ext.time || null;
            const isDup = !!c.scan.duplicate_of_event_id || c.scan.status === "skipped_duplicate";

            // Badges Radar (EVENTO FORTE / PRECISA REVISAR / PROMOÇÃO / CARDÁPIO / etc)
            const radarBadges: { label: string; cls: string }[] = [];
            if (isDup) radarBadges.push({ label: "DUPLICADO", cls: "bg-rose-500/20 text-rose-200 border-rose-500/40" });
            if (detectedType === "menu") radarBadges.push({ label: "CARDÁPIO", cls: "bg-amber-500/20 text-amber-200 border-amber-500/40" });
            else if (detectedType === "food_promo" || detectedType === "promotion" || detectedType === "promocao")
              radarBadges.push({ label: "PROMOÇÃO", cls: "bg-orange-500/20 text-orange-200 border-orange-500/40" });
            else if (detectedType === "announcement" || detectedType === "aviso")
              radarBadges.push({ label: "AVISO", cls: "bg-zinc-500/25 text-zinc-200 border-zinc-500/40" });
            else if (detectedType === "old_post")
              radarBadges.push({ label: "POST ANTIGO", cls: "bg-zinc-600/25 text-zinc-300 border-zinc-500/40" });
            else if (radarScore !== null && radarScore >= 80)
              radarBadges.push({ label: "EVENTO FORTE", cls: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40" });
            else if (radarScore !== null && radarScore >= 60)
              radarBadges.push({ label: "PRECISA REVISAR", cls: "bg-amber-500/20 text-amber-200 border-amber-500/40" });
            if (!detectedDate && !ev?.date_time)
              radarBadges.push({ label: "SEM DATA", cls: "bg-rose-500/15 text-rose-200 border-rose-500/30" });



            return (
              <div
                key={c.scan.id}
                className="rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-all hover:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.4)] flex flex-col"
              >
                <div className="relative aspect-[4/5] bg-muted overflow-hidden">
                  <SmartPreview urls={previewUrls} alt={title} />
                  <label
                    className={`absolute top-2 right-2 z-10 flex items-center justify-center h-7 w-7 rounded-lg cursor-pointer transition-all border-2 ${selected.has(c.scan.id) ? "bg-primary border-primary shadow-[0_0_15px_-2px_hsl(var(--primary)/0.7)]" : "bg-black/60 border-white/30 hover:border-primary/70 backdrop-blur-sm"}`}
                    onClick={(e) => e.stopPropagation()}
                    title="Selecionar para ações em lote"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(c.scan.id)}
                      onChange={() => toggleSelect(c.scan.id)}
                      className="sr-only"
                    />
                    {selected.has(c.scan.id) && <CheckCircle2 className="h-4 w-4 text-primary-foreground" />}
                  </label>
                  <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border flex items-center gap-1 ${kindMeta.cls}`}>
                      <KindIcon className="h-3 w-3" /> {kindMeta.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${confBadge[conf] || confBadge.medium}`}>
                      {conf === "high" ? "Alta" : conf === "low" ? "Baixa" : "Média"}
                    </span>

                    {cat === "novos" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Evento provável
                      </span>
                    )}
                    {cat === "revisar" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-orange-500/20 text-orange-300 border border-orange-500/40 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {c.scan.duplicate_of_event_id ? "Possível duplicado" : "Revisar"}
                      </span>
                    )}
                    {cat === "criados" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Já virou evento
                      </span>
                    )}
                    {cat === "ignorados" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                        <Ban className="h-3 w-3" />
                        {detectedType === "promotion" ? "Promoção"
                          : detectedType === "announcement" ? "Aviso"
                          : "Ignorado"}
                      </span>
                    )}
                    {cat === "arquivados" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-zinc-600/30 text-zinc-300 border border-zinc-500/40 flex items-center gap-1">
                        <Archive className="h-3 w-3" /> Arquivado
                      </span>
                    )}

                    {c.scan.repost_count > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 flex items-center gap-1">
                        <Repeat2 className="h-3 w-3" /> ×{c.scan.repost_count}
                      </span>
                    )}

                    {radarBadges.map((b) => (
                      <span key={b.label} className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${b.cls}`}>
                        {b.label}
                      </span>
                    ))}
                  </div>
                </div>


                <div className="p-4 space-y-3 flex-1 flex flex-col">
                  <div className="space-y-1">
                    <h3 className="font-display font-bold text-base line-clamp-2 leading-snug">{title}</h3>
                    {ev?.original_detected_title && ev.original_detected_title !== ev.title && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30 flex items-center gap-1">
                          <Sparkles className="h-2.5 w-2.5" /> Título otimizado
                        </span>
                        <span className="text-[10px] text-muted-foreground/60 line-through line-clamp-1">
                          {ev.original_detected_title}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Evento: {formatDate(dt)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Post: {formatDate(c.scan.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate">{venue || "—"}</span>
                    </div>
                    {ext.price && (
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>{ext.price}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <ScanLine className="h-3.5 w-3.5 text-primary/70" />
                      <span className="text-primary/80">@{c.scan.source_handle || "?"}</span>
                    </div>
                    {detectedType && (
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                        Tipo detectado: {detectedType}
                      </div>
                    )}
                    {c.scan.reason && (
                      <p className="italic text-muted-foreground/70 line-clamp-2">{c.scan.reason}</p>
                    )}
                  </div>

                  {typeof c.scan.duplicate_score === "number" && c.scan.duplicate_score >= 60 && (
                    <div className={`rounded-lg p-2 text-xs border ${c.scan.duplicate_score >= 80 ? "bg-rose-500/10 border-rose-500/40 text-rose-200" : "bg-amber-500/10 border-amber-500/40 text-amber-200"}`}>
                      <div className="flex items-center gap-1.5 font-semibold">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {c.scan.duplicate_score >= 80 ? "Duplicado detectado" : "Possível duplicado"}
                        <span className="ml-auto text-[10px] opacity-80">score {Math.round(c.scan.duplicate_score)}</span>
                      </div>
                      {c.scan.duplicate_reason && (
                        <p className="mt-1 opacity-80 line-clamp-2">{c.scan.duplicate_reason}</p>
                      )}
                      {c.scan.event_id && (
                        <Link to={`/admin/eventos/${c.scan.event_id}/editar`} className="mt-1 inline-flex items-center gap-1 text-[11px] underline opacity-90">
                          <ExternalLink className="h-3 w-3" /> Abrir evento existente
                        </Link>
                      )}
                    </div>
                  )}

                  {c.duplicateOf && (
                    <div className="rounded-lg bg-orange-500/10 border border-orange-500/30 p-2 text-xs">
                      <div className="flex items-start gap-1.5 text-orange-300">
                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold">Possível duplicado de:</p>
                          <Link to={`/admin/eventos/${c.duplicateOf.id}/editar`} className="hover:underline">
                            {c.duplicateOf.title} ({c.duplicateOf.status})
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {c.scan.created_event_deleted_at && (
                    <div className="rounded-lg bg-rose-500/5 border border-rose-500/20 p-2 text-[10px] text-rose-300/80">
                      Evento criado foi removido em {formatDate(c.scan.created_event_deleted_at)}.
                    </div>
                  )}

                  {c.scan.permalink && (
                    <a
                      href={c.scan.permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Ver post original
                    </a>
                  )}

                  {ev && (
                    <Link
                      to={`/admin/eventos/${ev.id}/editar`}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Pencil className="h-3 w-3" /> Abrir evento criado
                    </Link>
                  )}

                  {/* Ações */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border mt-auto">
                    {!ev && !c.scan.permanently_ignored && !c.scan.hidden_from_radar && (
                      <button
                        onClick={() => createEventFromScan(c)}
                        disabled={acting === c.scan.id}
                        title="Criar rascunho de evento a partir deste post"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-bold hover:bg-emerald-500/25 disabled:opacity-40"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Criar evento
                      </button>
                    )}
                    {ev && cat !== "arquivados" && (
                      <>
                        {ev.status !== "published" && (
                          <button
                            onClick={() => approve(ev.id, c.scan.id)}
                            disabled={acting === ev.id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-bold hover:bg-emerald-500/25 disabled:opacity-40"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Publicar
                          </button>
                        )}
                        <Link
                          to={`/admin/eventos/${ev.id}/editar`}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-bold hover:bg-primary/25"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Link>
                        <button
                          onClick={() => ignore(ev.id, c.scan.id)}
                          disabled={acting === ev.id || ev.status === "archived"}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-300 text-xs font-bold hover:bg-rose-500/20 disabled:opacity-40"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Ignorar
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          disabled={acting === c.scan.id}
                          title="Excluir o evento criado a partir deste item"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-card border border-rose-500/20 text-rose-300/80 text-xs font-bold hover:bg-rose-500/15 hover:border-rose-500/40 disabled:opacity-40 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Excluir evento criado
                        </button>
                      </>
                    )}
                    {c.scan.hidden_from_radar ? (
                      <button
                        onClick={() => unarchiveScan(c.scan.id)}
                        disabled={acting === c.scan.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 text-xs font-bold hover:bg-cyan-500/20 disabled:opacity-40"
                      >
                        <ArchiveRestore className="h-3.5 w-3.5" /> Restaurar
                      </button>
                    ) : (
                      <button
                        onClick={() => archiveScan(c.scan.id)}
                        disabled={acting === c.scan.id}
                        title="Remove apenas da lista do Radar (não exclui o evento)"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-600/20 text-zinc-300 text-xs font-bold hover:bg-zinc-600/30 disabled:opacity-40"
                      >
                        <Archive className="h-3.5 w-3.5" /> Arquivar item
                      </button>
                    )}
                    {!c.scan.permanently_ignored && (
                      <button
                        onClick={() => permanentlyIgnore(c.scan.id)}
                        disabled={acting === c.scan.id}
                        title="Não voltar a aparecer mesmo em novas varreduras"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600/15 text-rose-300 text-xs font-bold hover:bg-rose-600/25 disabled:opacity-40 border border-rose-500/30"
                      >
                        <Ban className="h-3.5 w-3.5" /> Ignorar permanentemente
                      </button>
                    )}
                    {c.scan.permanently_ignored && (
                      <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-300/80 text-xs font-bold border border-rose-500/30">
                        <Ban className="h-3.5 w-3.5" /> Permanentemente ignorado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal confirmar exclusão de evento criado */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-300">
              <Trash2 className="h-5 w-5" /> Excluir evento criado?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  Essa ação remove o evento criado a partir deste item do Radar IA.
                  O item do Radar será mantido como histórico.
                </p>
                {deleteTarget?.event && (
                  <div className="rounded-lg bg-muted/30 border border-border p-3 text-xs space-y-1">
                    <div><span className="font-bold">Título:</span> {deleteTarget.event.title}</div>
                    <div><span className="font-bold">Local:</span> {deleteTarget.event.venue_name || "—"}</div>
                    <div><span className="font-bold">Data:</span> {formatDate(deleteTarget.event.date_time)}</div>
                    <div><span className="font-bold">Status:</span> {deleteTarget.event.status}</div>
                  </div>
                )}
                <p className="text-rose-300/80 text-xs">
                  Ação irreversível para o evento. O Radar mantém a referência para auditoria.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteCreatedEvent(deleteTarget)}
              className="bg-rose-500 text-white hover:bg-rose-600"
            >
              Sim, excluir evento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RadarIA;

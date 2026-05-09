import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
} from "lucide-react";

type FilterKey = "novo" | "possible_duplicate" | "approved" | "published" | "ignored" | "all";

interface ScanRow {
  id: string;
  media_id: string;
  permalink: string | null;
  source_handle: string | null;
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

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "novo", label: "Novo" },
  { key: "possible_duplicate", label: "Possível duplicado" },
  { key: "approved", label: "Aprovado" },
  { key: "published", label: "Já publicado" },
  { key: "ignored", label: "Ignorado" },
  { key: "all", label: "Todos" },
];

const RadarIA = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("novo");
  const [counts, setCounts] = useState<Record<FilterKey, number>>({} as any);

  async function load() {
    setLoading(true);
    // Pull recent scans (only ones with structured data)
    const { data: scans, error } = await supabase
      .from("instagram_scans" as any)
      .select("*")
      .order("last_seen_at", { ascending: false })
      .limit(300);

    if (error) {
      toast.error(`Erro: ${error.message}`);
      setLoading(false);
      return;
    }

    const scanRows = (scans || []) as ScanRow[];
    const eventIds = Array.from(new Set([
      ...scanRows.map((s) => s.event_id).filter(Boolean),
      ...scanRows.map((s) => s.duplicate_of_event_id).filter(Boolean),
    ])) as string[];

    let eventsMap = new Map<string, EventRow>();
    if (eventIds.length) {
      const { data: evs } = await supabase
        .from("events")
        .select("id,title,slug,date_time,venue_name,image_url,status,ai_confidence,instagram,dedupe_key")
        .in("id", eventIds);
      (evs || []).forEach((e) => eventsMap.set(e.id, e as EventRow));
    }

    const allCards: Card[] = scanRows.map((scan) => ({
      scan,
      event: scan.event_id ? eventsMap.get(scan.event_id) || null : null,
      duplicateOf: scan.duplicate_of_event_id ? eventsMap.get(scan.duplicate_of_event_id) || null : null,
    }));

    // Counts per filter
    const c: Record<FilterKey, number> = {
      novo: 0, possible_duplicate: 0, approved: 0, published: 0, ignored: 0, all: allCards.length,
    };
    for (const card of allCards) {
      const cat = categorize(card);
      if (cat) c[cat]++;
    }
    setCounts(c);

    const filtered = filter === "all"
      ? allCards
      : allCards.filter((card) => categorize(card) === filter);

    setCards(filtered);
    setLoading(false);
  }

  function categorize(card: Card): FilterKey | null {
    const s = card.scan.status;
    const evStatus = card.event?.status;
    if (s === "possible_duplicate") return "possible_duplicate";
    if (s === "skipped_duplicate") return "published";
    if (s === "created_draft") {
      if (evStatus === "published") return "approved";
      if (evStatus === "archived") return "ignored";
      return "novo";
    }
    return null;
  }

  useEffect(() => { load(); }, [filter]);

  async function triggerScan() {
    setScanning(true);
    const t = toast.loading("Varrendo Instagrams (OCR + IA)...");
    const { data, error } = await supabase.functions.invoke("automatic-event-hunter");
    toast.dismiss(t);
    setScanning(false);
    if (error) { toast.error(`Falha: ${error.message}`); return; }
    const d = data as any;
    toast.success(
      `Radar IA: ${d?.drafts_created ?? 0} novos • ${d?.possible_duplicate ?? 0} possíveis duplicados • ${d?.skipped_duplicate ?? 0} já existentes`,
    );
    load();
  }

  async function approve(eventId: string) {
    setActing(eventId);
    const { error } = await supabase
      .from("events")
      .update({ status: "published", needs_review: false })
      .eq("id", eventId);
    setActing(null);
    if (error) toast.error(error.message);
    else { toast.success("Evento publicado!"); load(); }
  }

  async function ignore(eventId: string) {
    setActing(eventId);
    const { error } = await supabase
      .from("events")
      .update({ status: "archived", needs_review: false })
      .eq("id", eventId);
    setActing(null);
    if (error) toast.error(error.message);
    else { toast.success("Ignorado."); load(); }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Radar className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-display font-black tracking-tight">Radar IA</h1>
              <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-full bg-primary/20 text-primary font-bold">
                <Sparkles className="inline h-3 w-3 mr-0.5" /> OCR + Vision
              </span>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              A Aura faz OCR real dos flyers, extrai título, artistas, data, local, preço e gêneros, e cria rascunhos só para revisão humana.
              Duplicidade bloqueada por <code className="text-primary/80">media_id</code>, permalink e dedupe_key.
            </p>
          </div>
          <button
            onClick={triggerScan}
            disabled={scanning}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {scanning ? "Varrendo..." : "Disparar varredura agora"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
            {counts[f.key] != null && (
              <span className={`text-[10px] px-1.5 rounded-full ${filter === f.key ? "bg-white/20" : "bg-primary/20 text-primary"}`}>
                {counts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <Radar className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum item neste filtro.</p>
          <p className="text-xs text-muted-foreground/60 mt-2">Clique em "Disparar varredura agora".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cards.map((c) => {
            const ext = c.scan.extracted_json || {};
            const conf = (c.scan.ai_confidence || ext.confidence || "medium").toLowerCase();
            const ev = c.event;
            const cat = categorize(c);
            const imageUrl = ev?.image_url || null;
            const title = ev?.title || ext.title || "—";
            const dt = ev?.date_time || (ext.date ? `${ext.date}T${ext.time || "22:00"}:00-03:00` : null);
            const venue = ev?.venue_name || ext.venue_name || c.scan.source_handle;

            return (
              <div
                key={c.scan.id}
                className="rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-all hover:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.4)]"
              >
                <div className="relative aspect-[4/5] bg-muted overflow-hidden">
                  {imageUrl ? (
                    <img src={imageUrl} alt={title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${confBadge[conf] || confBadge.medium}`}>
                      {conf === "high" ? "Alta" : conf === "low" ? "Baixa" : "Média"}
                    </span>
                    {cat === "novo" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Novo
                      </span>
                    )}
                    {cat === "possible_duplicate" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-orange-500/20 text-orange-300 border border-orange-500/40 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Possível duplicado
                      </span>
                    )}
                    {cat === "approved" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Aprovado
                      </span>
                    )}
                    {cat === "published" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/40">
                        Já publicado
                      </span>
                    )}
                    {cat === "ignored" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        Ignorado
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <h3 className="font-display font-bold text-base line-clamp-2 leading-snug">{title}</h3>

                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(dt)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate">{venue || "—"}</span>
                    </div>
                    {ext.artists?.length ? (
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span className="truncate">{ext.artists.slice(0, 3).join(", ")}</span>
                      </div>
                    ) : null}
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
                  </div>

                  {c.scan.keywords && c.scan.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {c.scan.keywords.map((k) => (
                        <span key={k} className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary uppercase tracking-wide">
                          {k.replace("_", " ")}
                        </span>
                      ))}
                    </div>
                  )}

                  {c.duplicateOf && (
                    <div className="rounded-lg bg-orange-500/10 border border-orange-500/30 p-2 text-xs">
                      <div className="flex items-start gap-1.5 text-orange-300">
                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <div className="space-y-1">
                          <p className="font-semibold">Possível duplicado de:</p>
                          <Link to={`/admin/eventos/${c.duplicateOf.id}/editar`} className="block hover:underline">
                            {c.duplicateOf.title} ({c.duplicateOf.status})
                          </Link>
                          {c.scan.reason && <p className="text-orange-300/70 italic">{c.scan.reason}</p>}
                        </div>
                      </div>
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

                  {c.scan.raw_ocr && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver OCR bruto</summary>
                      <pre className="mt-1 p-2 rounded bg-muted/30 text-[10px] whitespace-pre-wrap max-h-32 overflow-auto">{c.scan.raw_ocr}</pre>
                    </details>
                  )}

                  {/* Actions */}
                  {ev && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                      <button
                        onClick={() => approve(ev.id)}
                        disabled={acting === ev.id || ev.status === "published"}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-bold hover:bg-emerald-500/25 disabled:opacity-40"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
                      </button>
                      <Link
                        to={`/admin/eventos/${ev.id}/editar`}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-bold hover:bg-primary/25"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Link>
                      <button
                        onClick={() => ignore(ev.id)}
                        disabled={acting === ev.id || ev.status === "archived"}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-300 text-xs font-bold hover:bg-rose-500/20 disabled:opacity-40"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Ignorar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RadarIA;

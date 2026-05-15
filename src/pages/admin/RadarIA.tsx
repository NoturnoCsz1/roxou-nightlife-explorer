import { useEffect, useMemo, useState } from "react";
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
  Archive,
  ArchiveRestore,
  Repeat2,
  History,
  Pin,
  Ban,
  SlidersHorizontal,
  Trash2,
  Clock,
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
  const [counts, setCounts] = useState<Record<TabKey, number>>({
    novos: 0, revisar: 0, criados: 0, ignorados: 0, arquivados: 0,
  });

  function categorize(card: Card): TabKey {
    const s = card.scan;
    if (s.hidden_from_radar) return "arquivados";

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
        .select("id,title,slug,date_time,venue_name,image_url,status,ai_confidence,instagram,dedupe_key")
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

    setCards(filtered);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab, filters]);

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

  async function runRetention() {
    const t = toast.loading("Aplicando retenção inteligente...");
    const { data, error } = await supabase.rpc("archive_old_radar_scans");
    toast.dismiss(t);
    if (error) toast.error(error.message);
    else { toast.success(`${data ?? 0} itens arquivados automaticamente`); load(); }
  }

  async function approve(eventId: string, scanId: string) {
    setActing(eventId);
    const { error } = await supabase
      .from("events")
      .update({ status: "published", needs_review: false })
      .eq("id", eventId);
    if (!error) {
      await supabase.from("instagram_scans" as any)
        .update({ first_published_at: new Date().toISOString() })
        .eq("id", scanId)
        .is("first_published_at", null);
    }
    setActing(null);
    if (error) toast.error(error.message);
    else { toast.success("Evento publicado!"); load(); }
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
            const imageUrl = ev?.image_url || c.scan.preview_image_url || ext.image_url || null;
            const title = ev?.title || ext.title || "—";
            const dt = ev?.date_time || (ext.date ? `${ext.date}T${ext.time || "22:00"}:00-03:00` : null);
            const venue = ev?.venue_name || ext.venue_name || c.scan.source_handle;
            const cat = categorize(c);

            return (
              <div
                key={c.scan.id}
                className="rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-all hover:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.4)] flex flex-col"
              >
                <div className="relative aspect-[4/5] bg-muted overflow-hidden">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (img.src !== window.location.origin + "/placeholder.svg") {
                          img.src = "/placeholder.svg";
                          img.classList.add("opacity-40", "p-8");
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground/60 bg-gradient-to-br from-primary/5 to-purple-500/5">
                      <Radar className="h-10 w-10" />
                      <span className="text-[10px] uppercase tracking-wider">Sem preview</span>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-1.5">
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
                  </div>
                </div>

                <div className="p-4 space-y-3 flex-1 flex flex-col">
                  <h3 className="font-display font-bold text-base line-clamp-2 leading-snug">{title}</h3>

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

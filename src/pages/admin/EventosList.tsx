import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, CalendarDays, Check, CheckSquare, ChevronDown, Copy, Download, ExternalLink, Layers, Loader2, MousePointerClick, Plus, Search, Send, Sparkles, Square, Star, StarOff, Trash2, Wand2, X } from "lucide-react";
import { downloadEventsZip } from "@/lib/downloadEventsZip";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { getCategoryLabel } from "@/lib/categoryConfig";
import { spLocalToISO, isoToSpLocal } from "@/lib/dateUtils";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface EventRow {
  id: string;
  title: string;
  slug: string;
  venue_name: string | null;
  date_time: string;
  category: string;
  sub_category: string | null;
  status: string;
  featured: boolean;
  image_url: string | null;
  description: string | null;
  partner_id: string | null;
  created_at: string;
  verification_source: string | null;
}

type OriginFilter = "todos" | "ai" | "manual";

type DateQuickFilter = "todos" | "hoje" | "semana" | "futuros" | "passados";

type ChecklistKey = "title" | "date" | "description" | "flyer";
interface Checklist {
  title: boolean;
  date: boolean;
  description: boolean;
  flyer: boolean;
  complete: boolean;
}

function getChecklist(e: EventRow): Checklist {
  const titleText = (e.title || "").trim();
  const title = titleText.length >= 5 && !/[—–\-:|/]/.test(titleText);
  const date = !!e.date_time && new Date(e.date_time).getTime() > Date.now();
  const desc = (e.description || "").trim();
  // Persona V2 = HTML rica com checklist (📝 O QUE VOCÊ PRECISA SABER) ou ao menos <ul> + <strong> + 80+ chars
  const description =
    desc.length >= 80 &&
    /<(p|ul|li|strong)\b/i.test(desc) &&
    (/O QUE VOC[ÊE] PRECISA SABER/i.test(desc) || /<ul[\s>]/i.test(desc));
  const flyer = !!e.image_url && /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(e.image_url.trim());
  const complete = title && date && description && flyer;
  return { title, date, description, flyer, complete };
}

function normalizeAiTitle(title: string) {
  return title
    .replace(/\s*[—–\-:|/]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

const EventosList = () => {
  const navigate = useNavigate();
  const { cityFilter } = useAdminProfile();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<EventRow | null>(null);
  const [pastOpen, setPastOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [activePartner, setActivePartner] = useState<string>("todos");
  const [activeDateFilter, setActiveDateFilter] = useState<DateQuickFilter>("todos");
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [onlyNeedsReview, setOnlyNeedsReview] = useState(false);
  const [originFilter, setOriginFilter] = useState<OriginFilter>("todos");
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [zipping, setZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState({ current: 0, total: 0 });
  const [aiBusy, setAiBusy] = useState<Record<string, "title" | "desc" | null>>({});
  const [publishing, setPublishing] = useState(false);
  const [quickEdits, setQuickEdits] = useState<Record<string, { title: string; date_time: string; venue_name?: string }>>({});
  const [visibleCount, setVisibleCount] = useState(80);

  const isAiOrigin = (e: EventRow) => {
    const src = (e.verification_source || "").toLowerCase();
    return src.includes("instagram") || src.includes("ia") || src.includes("ai") || src.includes("eventou") || src.includes("flyer");
  };
  const needsReview = (e: EventRow) => {
    if (!e.date_time) return true;
    const d = new Date(e.date_time);
    const hh = d.toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo", hour12: false });
    // Default fallback 00:00 = AI couldn't read time
    if (hh === "00:00") return true;
    if (/\[REVISAR\]/i.test(e.title || "")) return true;
    return false;
  };

  async function handleDuplicate(eventId: string) {
    const { data } = await supabase.from("events").select("*").eq("id", eventId).single();
    if (!data) { toast.error("Erro ao carregar evento"); return; }
    navigate("/admin/eventos/novo", {
      state: {
        duplicate: {
          title: data.title,
          description: data.description || "",
          category: data.category,
          venue_name: data.venue_name || "",
          address: data.address || "",
          instagram: data.instagram || "",
          image_url: data.image_url || "",
          partner_id: data.partner_id || "",
          ticket_url: (data as any).ticket_url || "",
          _sub: (data as any).sub_category || data.category,
        },
      },
    });
  }

  useEffect(() => {
    loadEvents();
    loadClickCounts();
  }, []);

  async function loadEvents() {
    setLoading(true);
    let query = supabase
      .from("events")
      .select("id, title, slug, venue_name, date_time, category, sub_category, status, featured, image_url, description, partner_id, created_at, verification_source")
      .order("created_at", { ascending: false });
    if (cityFilter) query = query.eq("city", cityFilter);
    const { data } = await query;
    setEvents((data as any) || []);
    setLoading(false);
  }

  async function loadClickCounts() {
    const { data } = await supabase.from("ticket_clicks").select("event_id");
    if (!data) return;
    const counts: Record<string, number> = {};
    data.forEach((row) => {
      if (row.event_id) counts[row.event_id] = (counts[row.event_id] || 0) + 1;
    });
    setClickCounts(counts);
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const visibleIds = filtered.map(e => e.id);
    if (visibleIds.every(id => selectedIds.has(id)) && visibleIds.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleIds));
    }
  }

  async function handleDownloadZip() {
    const eventsToDownload = selectedIds.size > 0
      ? filtered.filter(e => selectedIds.has(e.id) && e.image_url)
      : filtered.filter(e => e.image_url);

    if (eventsToDownload.length === 0) {
      toast.error("Nenhum evento com imagem para baixar.");
      return;
    }

    setZipping(true);
    setZipProgress({ current: 0, total: eventsToDownload.length });

    try {
      await downloadEventsZip(eventsToDownload, (current, total) => {
        setZipProgress({ current, total });
      });
      toast.success(`ZIP com ${eventsToDownload.length} imagens baixado!`);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar ZIP.");
    } finally {
      setZipping(false);
    }
  }

  async function toggleFeatured(id: string, current: boolean) {
    await supabase.from("events").update({ featured: !current }).eq("id", id);
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, featured: !current } : e)));
    toast.success(!current ? "Marcado como destaque" : "Removido do destaque");
  }

  async function saveQuickEdit(e: EventRow) {
    const draft = quickEdits[e.id];
    if (!draft) return;
    const nextTitle = normalizeAiTitle(draft.title);
    // Persist datetime-local as São Paulo wall-clock — never use new Date().toISOString()
    // because it would shift by the browser's UTC offset.
    const nextDate = draft.date_time ? spLocalToISO(draft.date_time) : e.date_time;
    const nextVenue = (draft.venue_name ?? e.venue_name ?? "").trim();
    const venueChanged = nextVenue !== (e.venue_name || "").trim();
    if (nextTitle === e.title && nextDate === e.date_time && !venueChanged) return;
    if (nextTitle.length < 5) { toast.error("Título precisa ter pelo menos 5 caracteres."); return; }
    const patch: { title: string; date_time: string; venue_name?: string | null } = { title: nextTitle, date_time: nextDate };
    if (venueChanged) patch.venue_name = nextVenue || null;
    const { error } = await supabase.from("events").update(patch).eq("id", e.id);
    if (error) { toast.error("Erro ao salvar edição rápida."); return; }
    setEvents(prev => prev.map(x => x.id === e.id ? { ...x, title: nextTitle, date_time: nextDate, venue_name: venueChanged ? (nextVenue || null) : x.venue_name } : x));
    toast.success("Edição rápida salva");
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await supabase.from("events").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    if (error) {
      toast.error("Erro ao excluir evento. Tente novamente.");
    } else {
      toast.success("Evento excluído com sucesso.");
      loadEvents();
    }
  }

  async function regenerateTitle(e: EventRow) {
    if (!e.image_url) {
      toast.error("Sem flyer para gerar título.");
      return;
    }
    setAiBusy(p => ({ ...p, [e.id]: "title" }));
    try {
      const { data, error } = await supabase.functions.invoke("extract-flyer-metadata", {
        body: { image_url: e.image_url, current_year: new Date().getFullYear() },
      });
      if (error) throw error;
      const newTitle = normalizeAiTitle((data as any)?.title || "");
      if (!newTitle) throw new Error("IA não retornou título");
      await supabase.from("events").update({ title: newTitle }).eq("id", e.id);
      setEvents(prev => prev.map(x => x.id === e.id ? { ...x, title: newTitle } : x));
      toast.success("Título atualizado pela IA");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao gerar título");
    } finally {
      setAiBusy(p => ({ ...p, [e.id]: null }));
    }
  }

  async function regenerateDescription(e: EventRow) {
    if ((e.description || "").trim()) {
      toast.info("A descrição já existe. Edite manualmente ou apague para gerar outra.");
      return;
    }
    setAiBusy(p => ({ ...p, [e.id]: "desc" }));
    try {
      const { data, error } = await supabase.functions.invoke("generate-description", {
        body: {
          title: e.title,
          venue_name: e.venue_name,
          date_time: e.date_time,
          category: e.sub_category || e.category,
          image_url: e.image_url,
        },
      });
      if (error) throw error;
      const html = (data as any)?.descricao_rica || (data as any)?.description;
      if (!html) throw new Error("IA não retornou descrição");
      await supabase.from("events").update({ description: html }).eq("id", e.id);
      setEvents(prev => prev.map(x => x.id === e.id ? { ...x, description: html } : x));
      toast.success("Descrição rica gerada");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao gerar descrição");
    } finally {
      setAiBusy(p => ({ ...p, [e.id]: null }));
    }
  }

  async function handleBulkPublish() {
    const selected = events.filter(e => selectedIds.has(e.id));
    const ready = selected.filter(e => getChecklist(e).complete && e.status !== "published");
    const blocked = selected.length - ready.length - selected.filter(e => e.status === "published").length;

    if (ready.length === 0) {
      toast.error(`Nenhum evento pronto. ${blocked} bloqueado(s) por falta de informação.`);
      return;
    }
    setPublishing(true);
    try {
      const ids = ready.map(e => e.id);
      const { error } = await supabase.from("events").update({ status: "published" }).in("id", ids);
      if (error) throw error;
      setEvents(prev => prev.map(e => ids.includes(e.id) ? { ...e, status: "published" } : e));
      setSelectedIds(new Set());
      toast.success(`${ready.length} evento(s) publicado(s)!`);
      if (blocked > 0) {
        toast.warning(`${blocked} evento(s) não puderam ser postados por falta de informações.`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao publicar em lote");
    } finally {
      setPublishing(false);
    }
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const filtered = events
    .filter((e) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return [e.title, e.slug, e.id, e.venue_name || ""].some((value) => value.toLowerCase().includes(q));
    })
    .filter((e) => !activeCategory || e.category === activeCategory)
    .filter((e) => !activeStatus || e.status === activeStatus)
    .filter((e) => activePartner === "todos" || (activePartner === "sem-parceiro" ? !e.partner_id : e.partner_id === activePartner))
    .filter((e) => {
      if (activeDateFilter === "todos") return true;
      const eventDay = e.date_time.slice(0, 10);
      if (activeDateFilter === "hoje") return eventDay === todayStr;
      if (activeDateFilter === "futuros") return eventDay > todayStr;
      if (activeDateFilter === "passados") return eventDay < todayStr;
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() + 7);
      return eventDay >= todayStr && eventDay <= weekEnd.toISOString().slice(0, 10);
    })
    .filter((e) => !onlyIncomplete || !getChecklist(e).complete)
    .filter((e) => !onlyNeedsReview || needsReview(e))
    .filter((e) => originFilter === "todos" || (originFilter === "ai" ? isAiOrigin(e) : !isAiOrigin(e)));

  useEffect(() => {
    setVisibleCount(80);
  }, [search, activeCategory, activeStatus, activePartner, activeDateFilter, onlyIncomplete, onlyNeedsReview, originFilter]);

  const visibleFiltered = filtered.slice(0, visibleCount);

  const todayEvents = visibleFiltered.filter((e) => e.date_time.slice(0, 10) === todayStr);
  const upcomingEvents = visibleFiltered.filter((e) => e.date_time.slice(0, 10) > todayStr);
  const pastEvents = visibleFiltered.filter((e) => e.date_time.slice(0, 10) < todayStr);

  const CATEGORIES = ["balada", "show", "bar", "festival", "sertanejo", "funk", "eletronica", "festa"] as const;
  const categoryCounts = CATEGORIES.map((c) => ({
    key: c,
    label: c === "eletronica" ? "Eletrônica" : c.charAt(0).toUpperCase() + c.slice(1),
    count: events.filter((e) => e.category === c).length,
  }));

  const categoryBadge: Record<string, string> = {
    balada: "badge-balada",
    show: "badge-show",
    bar: "badge-bar",
    festival: "badge-festival",
    sertanejo: "badge-sertanejo",
    funk: "badge-funk",
    eletronica: "badge-eletronica",
    festa: "badge-balada",
  };

  const withImages = filtered.filter(e => e.image_url).length;
  const selectedCount = selectedIds.size;
  const zipPercent = zipProgress.total > 0 ? Math.round((zipProgress.current / zipProgress.total) * 100) : 0;
  const partnerOptions = Array.from(new Map(events.filter(e => e.partner_id && e.venue_name).map(e => [e.partner_id!, e.venue_name!])).entries());

  // Counters for drafts
  const draftEvents = events.filter(e => e.status === "draft");
  const draftsReady = draftEvents.filter(e => getChecklist(e).complete).length;
  const draftsAttention = draftEvents.length - draftsReady;
  const selectedReadyToPublish = events.filter(e => selectedIds.has(e.id) && getChecklist(e).complete && e.status === "draft").length;

  const ChecklistDot = ({ ok, label }: { ok: boolean; label: string }) => (
    <span
      title={`${label}: ${ok ? "OK" : "Faltando"}`}
      className={`inline-flex items-center justify-center h-4 w-4 rounded-full ${ok ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
    >
      {ok ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
    </span>
  );

  const renderEventRow = (e: EventRow) => {
    const cl = getChecklist(e);
    const busy = aiBusy[e.id];
    const isDraft = e.status === "draft";
    return (
      <div key={e.id} className={`flex items-center gap-2 rounded-2xl border p-3 backdrop-blur-xl ${isDraft && !cl.complete ? "border-destructive/40 bg-white/5" : "border-border/40 bg-white/5"}`}>
        <button onClick={() => toggleSelect(e.id)} className="shrink-0" title="Selecionar">
          {selectedIds.has(e.id)
            ? <CheckSquare className="h-4 w-4 text-primary" />
            : <Square className="h-4 w-4 text-muted-foreground" />}
        </button>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-1">
            <input
              value={quickEdits[e.id]?.title ?? e.title ?? ""}
              onChange={(ev) => setQuickEdits(prev => ({ ...prev, [e.id]: { title: ev.target.value, date_time: prev[e.id]?.date_time ?? isoToSpLocal(e.date_time), venue_name: prev[e.id]?.venue_name ?? (e.venue_name ?? "") } }))}
              onBlur={() => saveQuickEdit(e)}
              placeholder="Título do evento"
              className="block w-full rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-foreground outline-none transition hover:border-border/40 hover:bg-secondary/30 focus:border-primary/40 focus:bg-secondary/40"
            />
            <Link to={`/admin/eventos/${e.id}`} className="shrink-0 p-1 rounded hover:bg-primary/10 text-primary" title="Abrir edição completa">
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`${categoryBadge[e.category] || "bg-secondary"} rounded px-1.5 py-0.5 text-[9px] font-bold uppercase`}>
              {getCategoryLabel(e.category, e.sub_category)}
            </span>
            <input
              type="datetime-local"
              value={quickEdits[e.id]?.date_time ?? isoToSpLocal(e.date_time)}
              onChange={(ev) => setQuickEdits(prev => ({ ...prev, [e.id]: { title: prev[e.id]?.title ?? e.title, date_time: ev.target.value, venue_name: prev[e.id]?.venue_name ?? (e.venue_name ?? "") } }))}
              onBlur={() => saveQuickEdit(e)}
              className="rounded border border-transparent bg-transparent px-1 py-0.5 text-[10px] text-muted-foreground outline-none transition hover:border-border/40 hover:bg-secondary/30 focus:border-primary/40 focus:text-foreground"
            />
            <input
              value={quickEdits[e.id]?.venue_name ?? (e.venue_name ?? "")}
              onChange={(ev) => setQuickEdits(prev => ({ ...prev, [e.id]: { title: prev[e.id]?.title ?? e.title, date_time: prev[e.id]?.date_time ?? isoToSpLocal(e.date_time), venue_name: ev.target.value } }))}
              onBlur={() => saveQuickEdit(e)}
              placeholder="Local"
              className="rounded border border-transparent bg-transparent px-1 py-0.5 text-[10px] text-muted-foreground outline-none transition hover:border-border/40 hover:bg-secondary/30 focus:border-primary/40 focus:text-foreground min-w-[100px]"
            />
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${e.status === "published" ? "text-green-400 bg-green-400/10" : "text-yellow-400 bg-yellow-400/10"}`}>
              {e.status === "published" ? "Publicado" : "Rascunho"}
            </span>
            {isAiOrigin(e) && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary inline-flex items-center gap-0.5">
                <Sparkles className="h-2.5 w-2.5" /> IA
              </span>
            )}
            {needsReview(e) && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-yellow-400/10 text-yellow-400 inline-flex items-center gap-0.5">
                <AlertTriangle className="h-2.5 w-2.5" /> Revisar
              </span>
            )}
            {clickCounts[e.id] > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded text-primary bg-primary/10 flex items-center gap-0.5">
                <MousePointerClick className="h-2.5 w-2.5" />
                {clickCounts[e.id]}
              </span>
            )}
          </div>
          {/* Checklist row */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <ChecklistDot ok={cl.title} label="Título mínimo e sem traços" />
            <ChecklistDot ok={cl.date} label="Data futura" />
            <ChecklistDot ok={cl.description} label="Descrição rica" />
            <ChecklistDot ok={cl.flyer} label="Flyer funcional" />
            {!cl.complete && isDraft && (
              <span className="text-[9px] font-bold uppercase text-red-400 ml-1 inline-flex items-center gap-1">
                <AlertTriangle className="h-2.5 w-2.5" /> Incompleto
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center shrink-0 ml-2 gap-0.5">
          {isDraft && (
            <>
              <button
                onClick={() => regenerateTitle(e)}
                disabled={!!busy}
                className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-2 py-1.5 text-[10px] font-bold text-primary hover:bg-primary/20 transition disabled:opacity-50"
                title="Gerar título com IA"
              >
                {busy === "title" ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Sparkles className="h-4 w-4 text-primary" />}
                <span className="hidden sm:inline">Gerar Título</span>
              </button>
              <button
                onClick={() => regenerateDescription(e)}
                disabled={!!busy}
                className="inline-flex items-center gap-1 rounded-xl bg-secondary/60 px-2 py-1.5 text-[10px] font-bold text-secondary-foreground hover:bg-secondary transition disabled:opacity-50"
                title="Gerar legenda rica"
              >
                {busy === "desc" ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Wand2 className="h-4 w-4 text-primary" />}
                <span className="hidden sm:inline">Gerar Legenda</span>
              </button>
            </>
          )}
          <button onClick={() => handleDuplicate(e.id)} className="p-1.5 rounded-lg hover:bg-secondary/50 transition" title="Duplicar evento">
            <Copy className="h-4 w-4 text-muted-foreground" />
          </button>
          <Link to={`/v3/evento/${e.slug}`} target="_blank" className="p-1.5 rounded-lg hover:bg-primary/10 transition" title="Acesso rápido V3">
            <ExternalLink className="h-4 w-4 text-primary" />
          </Link>
          <button onClick={() => toggleFeatured(e.id, e.featured)} className="p-1.5 rounded-lg hover:bg-secondary/50 transition" title={e.featured ? "Remover destaque" : "Destacar"}>
            {e.featured ? <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" /> : <StarOff className="h-4 w-4 text-muted-foreground" />}
          </button>
          <button onClick={() => setDeleteTarget(e)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition" title="Excluir evento">
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-400" />
          </button>
        </div>
      </div>
    );
  };

  const renderSection = (title: string, items: EventRow[], emoji: string) => {
    if (items.length === 0) return null;
    return (
      <div>
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
          {emoji} {title} ({items.length})
        </h2>
        <div className="space-y-2">{items.map(renderEventRow)}</div>
      </div>
    );
  };

  return (
    <div className="space-y-4 md:ml-44">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Eventos</h1>
        <div className="flex items-center gap-1.5">
          <Link
            to="/admin/eventos/novo/lote"
            className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition"
          >
            <Layers className="h-3.5 w-3.5" /> Lote
          </Link>
          <Link
            to="/admin/eventos/novo"
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Novo
          </Link>
        </div>
      </div>

      {/* Drafts Counter */}
      {draftEvents.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-border/40 bg-white/5 px-3 py-2 text-[11px] backdrop-blur-xl flex-wrap">
          <span className="font-bold text-green-400 inline-flex items-center gap-1">
            <Check className="h-3 w-3" /> {draftsReady} prontos para publicação
          </span>
          <span className="w-px h-4 bg-border/40" />
          <span className="font-bold text-red-400 inline-flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> {draftsAttention} precisando de atenção
          </span>
          <span className="w-px h-4 bg-border/40" />
          <button
             onClick={() => { setActiveStatus("draft"); setOnlyIncomplete(!onlyIncomplete); }}
            className={`text-[10px] font-bold uppercase px-2 py-1 rounded transition ${onlyIncomplete ? "bg-primary text-primary-foreground" : "bg-secondary/50 hover:bg-secondary text-muted-foreground"}`}
          >
             {onlyIncomplete ? "Mostrando incompletos" : "Mostrar apenas rascunhos incompletos"}
          </button>
        </div>
      )}

      {/* Bulk action bar */}
      {(withImages > 0 || selectedCount > 0) && (
        <div className="flex items-center gap-2 flex-wrap rounded-2xl border border-border/40 bg-white/5 px-3 py-2 backdrop-blur-xl">
          <button onClick={toggleSelectAll} className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase hover:text-foreground transition">
            {selectedCount > 0 && selectedCount >= filtered.length ? <CheckSquare className="h-3.5 w-3.5 text-primary" /> : <Square className="h-3.5 w-3.5" />}
            {selectedCount > 0 ? `${selectedCount} selecionado${selectedCount > 1 ? "s" : ""}` : "Selecionar todos"}
          </button>
          <span className="w-px h-4 bg-border/40" />
          <button
            onClick={handleBulkPublish}
            disabled={publishing || selectedReadyToPublish === 0}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50 transition hover:bg-primary/90"
            title="Publicar selecionados (apenas válidos)"
          >
            {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Postar Selecionados {selectedReadyToPublish > 0 && `(${selectedReadyToPublish})`}
          </button>
          <button
            onClick={handleDownloadZip}
            disabled={zipping}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60 transition"
          >
            {zipping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {zipping ? `Baixando... ${zipPercent}%` : "📦 Baixar ZIP"}
          </button>
          {zipping && (
            <Progress value={zipPercent} className="h-1.5 flex-1 min-w-[80px]" />
          )}
        </div>
      )}

      <div className="rounded-2xl border border-border/40 bg-card/80 p-3 space-y-2 backdrop-blur-xl">
        <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-background/70 px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, slug, ID ou local..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <span className="hidden sm:inline text-[10px] font-bold text-muted-foreground whitespace-nowrap">Criados recentemente primeiro</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <select value={activeDateFilter} onChange={(e) => setActiveDateFilter(e.target.value as DateQuickFilter)} className="rounded-xl border border-border/40 bg-background/70 px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50">
            <option value="todos">Todas as datas</option>
            <option value="hoje">Hoje</option>
            <option value="semana">Próximos 7 dias</option>
            <option value="futuros">Futuros</option>
            <option value="passados">Passados</option>
          </select>
          <select value={activePartner} onChange={(e) => setActivePartner(e.target.value)} className="rounded-xl border border-border/40 bg-background/70 px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50">
            <option value="todos">Todos os parceiros</option>
            <option value="sem-parceiro">Sem parceiro</option>
            {partnerOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <button type="button" className="hidden sm:flex items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-[10px] font-bold uppercase text-primary">
            <CalendarDays className="h-3.5 w-3.5" /> Ordenação fixa
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {[
          { key: null, label: "Todos", count: events.length },
          { key: "published", label: "Publicado", count: events.filter((e) => e.status === "published").length },
          { key: "draft", label: "Rascunho", count: events.filter((e) => e.status === "draft").length },
        ].map((s) => (
          <button
            key={s.key ?? "all"}
            onClick={() => setActiveStatus(activeStatus === s.key ? null : s.key)}
            className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition ${
              activeStatus === s.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
            }`}
          >
            {s.label} <span className="ml-0.5 opacity-70">{s.count}</span>
          </button>
        ))}
        <span className="w-px h-4 bg-border/40 shrink-0 mx-0.5" />
        {categoryCounts.map((c) => (
          <button
            key={c.key}
            onClick={() => setActiveCategory(activeCategory === c.key ? null : c.key)}
            className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition ${
              activeCategory === c.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
            }`}
          >
            {c.label} <span className="ml-0.5 opacity-70">{c.count}</span>
          </button>
        ))}
        {(search || activeCategory || activeStatus || activePartner !== "todos" || activeDateFilter !== "todos" || onlyIncomplete) && (
          <>
            <span className="w-px h-4 bg-border/40 shrink-0 mx-0.5" />
            <button
                onClick={() => { setSearch(""); setActiveCategory(null); setActiveStatus(null); setActivePartner("todos"); setActiveDateFilter("todos"); setOnlyIncomplete(false); }}
              className="shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
            >
              <X className="h-3 w-3" /> Limpar
            </button>
          </>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-8">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">Nenhum evento encontrado.</p>
      ) : (
        <div className="space-y-6">
          {renderSection("Hoje", todayEvents, "📌")}
          {renderSection("Próximos", upcomingEvents, "🔜")}

          {pastEvents.length > 0 && (
            <Collapsible open={pastOpen} onOpenChange={setPastOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full group">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  📂 Eventos Passados ({pastEvents.length})
                </h2>
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${pastOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="space-y-2">{pastEvents.map(renderEventRow)}</div>
              </CollapsibleContent>
            </Collapsible>
          )}
          {visibleCount < filtered.length && (
            <button onClick={() => setVisibleCount((v) => v + 80)} className="mx-auto flex rounded-2xl border border-primary/30 bg-primary/10 px-5 py-2 text-xs font-black uppercase text-primary hover:bg-primary/20">
              Carregar mais {Math.min(80, filtered.length - visibleCount)} eventos
            </button>
          )}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>"{deleteTarget?.title}"</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EventosList;

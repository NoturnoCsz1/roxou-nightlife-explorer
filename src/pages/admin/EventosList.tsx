import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, Bot, CalendarDays, Check, CheckSquare, ChevronDown, Copy, ExternalLink, Flame, Layers, Link2, Loader2, MousePointerClick, Pencil, Plus, Search, Settings2, Sparkles, Square, Star, StarOff, Trash2, Wand2, X } from "lucide-react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import AuraCreateEventModal from "@/components/admin/AuraCreateEventModal";

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
  aura_pick: boolean;
  image_url: string | null;
  description: string | null;
  partner_id: string | null;
  created_at: string;
  verification_source: string | null;
  ai_confidence?: string | null;
  needs_review?: boolean | null;
  aura_badge?: string | null;
  aura_score?: number | null;
}

function getQualityScore(e: EventRow): number {
  let s = 0;
  if (e.image_url) s += 25;
  if (e.date_time && new Date(e.date_time).getTime() > Date.now()) s += 25;
  if (e.venue_name && e.venue_name.trim()) s += 25;
  if (e.category) s += 25;
  return s;
}

// Centralized route builder for the full event edit form.
// Use this everywhere instead of hardcoding paths to avoid divergences.
export const getEventEditPath = (id: string) => `/admin/eventos/${id}/editar`;

type OriginFilter = "todos" | "ai" | "manual";
type ExtraFilter = "todos" | "aura" | "destaques" | "sem-imagem" | "incompletos" | "em-alta" | "detectados-hoje" | "arquivados" | "prontos" | "revisar";

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
  const [extraFilter, setExtraFilter] = useState<ExtraFilter>("todos");
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [zipping, setZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState({ current: 0, total: 0 });
  const [aiBusy, setAiBusy] = useState<Record<string, "title" | "desc" | null>>({});
  const [publishing, setPublishing] = useState(false);
  const [quickEdits, setQuickEdits] = useState<Record<string, { title: string; date_time: string; venue_name?: string }>>({});
  const [visibleCount, setVisibleCount] = useState(80);
  const [auraModalOpen, setAuraModalOpen] = useState(false);
  const [triageMode, setTriageMode] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [bulkSafeOpen, setBulkSafeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"todos" | "hoje" | "rascunhos" | "problemas" | "destaques">("todos");
  const [searchInput, setSearchInput] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Debounce de busca (250ms)
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

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

  // Atalhos de teclado (Modo Triagem)
  useEffect(() => {
    if (!triageMode) return;
    const handler = (ev: KeyboardEvent) => {
      const tag = (ev.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;

      // Triage works across ALL filtered events (drafts, published, archived…)
      const list = filtered;
      if (list.length === 0) return;
      const currentIdx = focusedId ? list.findIndex(x => x.id === focusedId) : -1;
      const idx = currentIdx >= 0 ? currentIdx : 0;
      const cur = list[idx];
      const k = ev.key.toLowerCase();

      if (k === "arrowright") {
        ev.preventDefault();
        const next = list[Math.min(idx + 1, list.length - 1)];
        if (next) setFocusedId(next.id);
      } else if (k === "arrowleft") {
        ev.preventDefault();
        const prev = list[Math.max(idx - 1, 0)];
        if (prev) setFocusedId(prev.id);
      } else if (k === "a" && cur) {
        ev.preventDefault();
        if (cur.status === "published") { toast.info("Já publicado"); return; }
        handleQuickApprove(cur);
      } else if (k === "d" && cur) {
        ev.preventDefault();
        // Toggle destaque mesmo em publicados
        if (cur.status === "published") {
          supabase.from("events").update({ featured: !cur.featured }).eq("id", cur.id).then(({ error }) => {
            if (error) { toast.error("Falha ao alternar destaque"); return; }
            setEvents(prev => prev.map(x => x.id === cur.id ? { ...x, featured: !cur.featured } : x));
            toast.success(cur.featured ? "Destaque removido" : "🔥 Destaque ativado");
          });
        } else {
          handleQuickApprove(cur, { featured: true });
        }
      } else if (k === "u" && cur) {
        ev.preventDefault();
        if (cur.status === "published") {
          supabase.from("events").update({ aura_pick: !cur.aura_pick }).eq("id", cur.id).then(({ error }) => {
            if (error) { toast.error("Falha ao alternar Aura"); return; }
            setEvents(prev => prev.map(x => x.id === cur.id ? { ...x, aura_pick: !cur.aura_pick } : x));
            toast.success(cur.aura_pick ? "Aura Pick removido" : "🤖 Aura Pick");
          });
        } else {
          handleQuickApprove(cur, { auraPick: true });
        }
      } else if (k === "x" && cur) {
        ev.preventDefault();
        handleArchive(cur);
      } else if (k === "r" && cur) {
        ev.preventDefault();
        navigate(getEventEditPath(cur.id));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triageMode, focusedId, events, search, activeCategory, activeStatus, activePartner, activeDateFilter, onlyIncomplete, onlyNeedsReview, originFilter, extraFilter]);

  async function loadEvents() {
    setLoading(true);
    let query = supabase
      .from("events")
      .select("id, title, slug, venue_name, date_time, category, sub_category, status, featured, aura_pick, image_url, description, partner_id, created_at, verification_source, ai_confidence, needs_review, aura_badge, aura_score")
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
    toast.success(!current ? "🔥 Marcado como destaque" : "Removido do destaque");
  }

  async function toggleAuraPick(id: string, current: boolean) {
    const { error } = await supabase.from("events").update({ aura_pick: !current } as any).eq("id", id);
    if (error) { toast.error("Erro ao marcar Aura"); return; }
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, aura_pick: !current } : e)));
    toast.success(!current ? "🤖 Escolha da Aura ativada" : "Removido da Aura");
  }

  async function copyEventLink(e: EventRow) {
    const url = `${window.location.origin}/evento/${e.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("🔗 Link copiado");
    } catch {
      toast.error("Falha ao copiar link");
    }
  }

  async function handleBulkAura(value: boolean) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const { error } = await supabase.from("events").update({ aura_pick: value } as any).in("id", ids);
    if (error) { toast.error("Erro ao atualizar Aura"); return; }
    setEvents(prev => prev.map(e => ids.includes(e.id) ? { ...e, aura_pick: value } : e));
    toast.success(`${ids.length} evento(s) ${value ? "marcados como Aura" : "removidos da Aura"}`);
  }

  async function handleBulkFeatured(value: boolean) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const { error } = await supabase.from("events").update({ featured: value }).in("id", ids);
    if (error) { toast.error("Erro ao atualizar destaque"); return; }
    setEvents(prev => prev.map(e => ids.includes(e.id) ? { ...e, featured: value } : e));
    toast.success(`${ids.length} evento(s) ${value ? "destacados" : "sem destaque"}`);
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

  // === Aprovação rápida ===
  async function handleQuickApprove(e: EventRow, opts?: { featured?: boolean; auraPick?: boolean }) {
    const cl = getChecklist(e);
    if (!cl.complete) {
      toast.error("Evento incompleto: preencha título, data, local, descrição e flyer.");
      return;
    }
    const patch: { status: string; featured?: boolean; aura_pick?: boolean } = { status: "published" };
    if (opts?.featured) patch.featured = true;
    if (opts?.auraPick) patch.aura_pick = true;
    const { error } = await supabase.from("events").update(patch).eq("id", e.id);
    if (error) { toast.error("Falha ao aprovar"); return; }
    setEvents(prev => prev.map(x => x.id === e.id ? { ...x, ...patch } : x));
    const labels: string[] = ["Aprovado"];
    if (opts?.featured) labels.push("destaque");
    if (opts?.auraPick) labels.push("Aura Pick");
    toast.success(`✓ ${labels.join(" + ")}`);
  }

  async function handleArchive(e: EventRow) {
    const { error } = await supabase.from("events").update({ status: "archived" }).eq("id", e.id);
    if (error) { toast.error("Falha ao arquivar"); return; }
    setEvents(prev => prev.map(x => x.id === e.id ? { ...x, status: "archived" } : x));
    toast.success("🗃 Arquivado");
  }

  async function handleBulkApprove(opts?: { featured?: boolean; auraPick?: boolean }) {
    const ids = Array.from(selectedIds);
    const ready = events.filter(e => ids.includes(e.id) && getChecklist(e).complete && e.status !== "published");
    if (ready.length === 0) {
      toast.error("Nenhum dos selecionados está pronto para aprovação.");
      return;
    }
    const patch: { status: string; featured?: boolean; aura_pick?: boolean } = { status: "published" };
    if (opts?.featured) patch.featured = true;
    if (opts?.auraPick) patch.aura_pick = true;
    const readyIds = ready.map(e => e.id);
    const { error } = await supabase.from("events").update(patch).in("id", readyIds);
    if (error) { toast.error("Erro ao aprovar em lote"); return; }
    setEvents(prev => prev.map(e => readyIds.includes(e.id) ? { ...e, ...patch } : e));
    setSelectedIds(new Set());
    toast.success(`✓ ${ready.length} evento(s) aprovado(s)${opts?.featured ? " + destaque" : ""}${opts?.auraPick ? " + Aura" : ""}`);
  }

  async function handleBulkArchive() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const { error } = await supabase.from("events").update({ status: "archived" }).in("id", ids);
    if (error) { toast.error("Erro ao arquivar"); return; }
    setEvents(prev => prev.map(e => ids.includes(e.id) ? { ...e, status: "archived" } : e));
    setSelectedIds(new Set());
    toast.success(`🗃 ${ids.length} arquivado(s)`);
  }

  async function handleApproveAllSafe(visibleSafeIds: string[]) {
    if (visibleSafeIds.length === 0) {
      toast.error("Nenhum evento seguro encontrado nos filtros atuais.");
      return;
    }
    setPublishing(true);
    const { error } = await supabase
      .from("events")
      .update({ status: "published" })
      .in("id", visibleSafeIds);
    setPublishing(false);
    if (error) { toast.error("Erro ao publicar em lote"); return; }
    setEvents(prev => prev.map(e => visibleSafeIds.includes(e.id) ? { ...e, status: "published" } : e));
    setBulkSafeOpen(false);
    toast.success(`✅ ${visibleSafeIds.length} evento(s) seguros publicados`);
  }
  const spDateStr = (d: Date) =>
    new Intl.DateTimeFormat("sv-SE", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "America/Sao_Paulo" }).format(d);
  const todayStr = spDateStr(new Date());
  const weekEndStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return spDateStr(d);
  })();
  const eventDayStr = (e: EventRow) => (e.date_time ? spDateStr(new Date(e.date_time)) : "");

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
      const eventDay = eventDayStr(e);
      if (activeDateFilter === "hoje") return eventDay === todayStr;
      if (activeDateFilter === "futuros") return eventDay > todayStr;
      if (activeDateFilter === "passados") return eventDay < todayStr;
      return eventDay >= todayStr && eventDay <= weekEndStr;
    })
    .filter((e) => !onlyIncomplete || !getChecklist(e).complete)
    .filter((e) => !onlyNeedsReview || needsReview(e))
    .filter((e) => originFilter === "todos" || (originFilter === "ai" ? isAiOrigin(e) : !isAiOrigin(e)))
    .filter((e) => {
      if (extraFilter === "todos") return true;
      if (extraFilter === "aura") return e.aura_pick;
      if (extraFilter === "destaques") return e.featured;
      if (extraFilter === "sem-imagem") return !e.image_url;
      if (extraFilter === "incompletos") return getQualityScore(e) < 100;
      if (extraFilter === "em-alta") return e.aura_badge === "em_alta" || e.aura_badge === "viralizando" || e.aura_badge === "bombando";
      if (extraFilter === "detectados-hoje") return spDateStr(new Date(e.created_at)) === todayStr;
      if (extraFilter === "arquivados") return e.status === "archived";
      if (extraFilter === "prontos") return e.status !== "published" && e.status !== "archived" && getChecklist(e).complete;
      if (extraFilter === "revisar") return e.status !== "archived" && (needsReview(e) || !getChecklist(e).complete);
      return true;
    });

  useEffect(() => {
    setVisibleCount(80);
  }, [search, activeCategory, activeStatus, activePartner, activeDateFilter, onlyIncomplete, onlyNeedsReview, originFilter, extraFilter]);

  const visibleFiltered = filtered.slice(0, visibleCount);

  const auraEvents = visibleFiltered.filter((e) => e.aura_pick && eventDayStr(e) >= todayStr);
  const auraIds = new Set(auraEvents.map(e => e.id));
  const featuredTodayEvents = visibleFiltered.filter((e) => e.featured && !auraIds.has(e.id) && eventDayStr(e) === todayStr);
  const featuredIds = new Set(featuredTodayEvents.map(e => e.id));
  const todayEvents = visibleFiltered.filter((e) => eventDayStr(e) === todayStr && !auraIds.has(e.id) && !featuredIds.has(e.id));
  const upcomingEvents = visibleFiltered.filter((e) => eventDayStr(e) > todayStr && !auraIds.has(e.id));
  const pastEvents = visibleFiltered.filter((e) => eventDayStr(e) < todayStr);

  // Counter for header (sobre todos os eventos, não só os filtrados)
  const totalTodayCount = events.filter((e) => eventDayStr(e) === todayStr).length;

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
  // Triage counters across the entire current filter (all tabs)
  const readyInFiltered = filtered.filter(e => e.status !== "published" && e.status !== "archived" && getChecklist(e).complete).length;
  const reviewInFiltered = filtered.filter(e => e.status !== "archived" && (needsReview(e) || !getChecklist(e).complete)).length;

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
    const score = getQualityScore(e);
    const borderClass = e.aura_pick
      ? "border-primary/60 bg-primary/5 shadow-[0_0_18px_rgba(168,85,247,0.25)]"
      : e.featured
        ? "border-primary/40 bg-white/5 shadow-[0_0_10px_rgba(168,85,247,0.15)]"
        : isDraft && !cl.complete
          ? "border-destructive/40 bg-white/5"
          : "border-border/40 bg-white/5";
    const isFocused = triageMode && focusedId === e.id;
    const compactPad = triageMode ? "p-2" : "p-3";
    const focusRing = isFocused ? "ring-2 ring-primary/70 shadow-[0_0_22px_hsl(var(--primary)/0.5)]" : "";
    return (
      <div
        key={e.id}
        onClick={() => triageMode && setFocusedId(e.id)}
        className={`flex items-center gap-2 rounded-2xl border ${compactPad} backdrop-blur-xl transition-all hover:bg-white/[0.07] hover:-translate-y-0.5 ${borderClass} ${focusRing}`}
      >
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
              className="block w-full rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-sm lg:text-[13px] font-semibold text-foreground outline-none transition hover:border-border/40 hover:bg-secondary/30 focus:border-primary/40 focus:bg-secondary/40 truncate"
            />
            <Link
              to={getEventEditPath(e.id)}
              className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/15 px-2 py-1 text-[10px] font-bold uppercase text-primary hover:bg-primary/25 transition"
              title="Abrir edição completa do evento"
            >
              <Pencil className="h-3 w-3" />
              <span className="hidden sm:inline">Editar</span>
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
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${e.status === "published" ? "text-green-400 bg-green-400/10" : e.status === "archived" ? "text-muted-foreground bg-muted/20" : "text-yellow-400 bg-yellow-400/10"}`}>
              {e.status === "published" ? "Publicado" : e.status === "archived" ? "🗃 Arquivado" : "Rascunho"}
            </span>
            {e.aura_badge === "em_alta" && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30 inline-flex items-center gap-0.5">
                🔥 Em alta
              </span>
            )}
            {e.aura_badge === "viralizando" && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30 inline-flex items-center gap-0.5">
                🚀 Viralizando
              </span>
            )}
            {e.aura_badge === "bombando" && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 inline-flex items-center gap-0.5">
                💥 Bombando
              </span>
            )}
            {e.aura_pick && (
              <span title="Aura recomenda este evento como destaque do dia" className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-primary/25 text-primary border border-primary/40 inline-flex items-center gap-0.5">
                <Bot className="h-2.5 w-2.5" /> Escolha da Aura
              </span>
            )}
            {e.featured && !e.aura_pick && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-yellow-400/15 text-yellow-300 border border-yellow-400/30 inline-flex items-center gap-0.5">
                <Flame className="h-2.5 w-2.5" /> Destaque
              </span>
            )}
            {needsReview(e) && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-yellow-400/10 text-yellow-400 inline-flex items-center gap-0.5" title="Evento precisa revisão">
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
        <div className="flex items-center shrink-0 ml-2 gap-0.5 flex-wrap justify-end">
          {isDraft && (
            <>
              {/* Aprovação rápida */}
              <button
                onClick={() => handleQuickApprove(e)}
                disabled={!cl.complete}
                className="inline-flex items-center gap-1 rounded-lg border border-green-500/40 bg-green-500/15 px-2 py-1.5 text-[10px] font-bold uppercase text-green-400 hover:bg-green-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition"
                title={cl.complete ? "Aprovar (publicar)" : "Faltam dados para aprovar"}
              >
                <Check className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Aprovar</span>
              </button>
              <button
                onClick={() => handleQuickApprove(e, { featured: true })}
                disabled={!cl.complete}
                className="inline-flex items-center gap-1 rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-2 py-1.5 text-[10px] font-bold uppercase text-yellow-300 hover:bg-yellow-400/20 disabled:opacity-40 transition"
                title="Aprovar e destacar"
              >
                <Flame className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleQuickApprove(e, { auraPick: true })}
                disabled={!cl.complete}
                className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/15 px-2 py-1.5 text-[10px] font-bold uppercase text-primary hover:bg-primary/25 disabled:opacity-40 transition"
                title="Aprovar e marcar como Aura Pick"
              >
                <Bot className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleArchive(e)}
                className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-secondary/40 px-2 py-1.5 text-[10px] font-bold uppercase text-muted-foreground hover:bg-secondary/70 transition"
                title="Arquivar"
              >
                🗃
              </button>
              <button
                onClick={() => regenerateTitle(e)}
                disabled={!!busy}
                className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-2 py-1.5 text-[10px] font-bold text-primary hover:bg-primary/20 transition disabled:opacity-50"
                title="Gerar título com IA"
              >
                {busy === "title" ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Sparkles className="h-4 w-4 text-primary" />}
              </button>
              <button
                onClick={() => regenerateDescription(e)}
                disabled={!!busy}
                className="inline-flex items-center gap-1 rounded-xl bg-secondary/60 px-2 py-1.5 text-[10px] font-bold text-secondary-foreground hover:bg-secondary transition disabled:opacity-50"
                title="Gerar legenda rica"
              >
                {busy === "desc" ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Wand2 className="h-4 w-4 text-primary" />}
              </button>
            </>
          )}
          <Link
            to={getEventEditPath(e.id)}
            className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2 py-1.5 text-[10px] font-bold uppercase text-primary hover:bg-primary/20 transition"
            title="Editar tudo (formulário completo)"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Editar Tudo</span>
          </Link>
          <button onClick={() => handleDuplicate(e.id)} className="p-1.5 rounded-lg hover:bg-secondary/50 transition" title="Duplicar evento">
            <Copy className="h-4 w-4 text-muted-foreground" />
          </button>
          <Link to={`/evento/${e.slug}`} target="_blank" className="p-1.5 rounded-lg hover:bg-primary/10 transition" title="Acesso rápido V3">
            <ExternalLink className="h-4 w-4 text-primary" />
          </Link>
          <button onClick={() => toggleAuraPick(e.id, e.aura_pick)} className={`p-1.5 rounded-lg transition ${e.aura_pick ? "bg-primary/20 hover:bg-primary/30" : "hover:bg-primary/10"}`} title={e.aura_pick ? "Remover da Aura" : "Marcar como Escolha da Aura"}>
            <Bot className={`h-4 w-4 ${e.aura_pick ? "text-primary" : "text-muted-foreground"}`} />
          </button>
          <button onClick={() => toggleFeatured(e.id, e.featured)} className="p-1.5 rounded-lg hover:bg-secondary/50 transition" title={e.featured ? "Remover destaque" : "🎯 Destacar evento"}>
            {e.featured ? <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" /> : <StarOff className="h-4 w-4 text-muted-foreground" />}
          </button>
          <button onClick={() => copyEventLink(e)} className="p-1.5 rounded-lg hover:bg-secondary/50 transition" title="🔗 Copiar link público">
            <Link2 className="h-4 w-4 text-muted-foreground" />
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
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            onClick={() => setAuraModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary backdrop-blur-xl transition hover:bg-primary/20 hover:border-primary/60 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.5),0_0_18px_hsl(var(--primary)/0.35)]"
            title="Cole texto e a Aura organiza o evento"
          >
            <Bot className="h-3.5 w-3.5" /> Criar com Aura
          </button>
          <Link
            to="/admin/eventos/novo/lote"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-foreground/90 backdrop-blur-xl transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
          >
            <Layers className="h-3.5 w-3.5" /> Lote
          </Link>
          <Link
            to="/admin/eventos/novo"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.4),0_0_18px_hsl(var(--primary)/0.35)] transition hover:bg-primary/90 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.6),0_0_28px_hsl(var(--primary)/0.55)]"
          >
            <Plus className="h-4 w-4" /> Novo
          </Link>
        </div>
      </div>

      <AuraCreateEventModal open={auraModalOpen} onClose={() => setAuraModalOpen(false)} />

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

      <div className="sticky top-0 z-30 -mx-2 px-2 pt-2 pb-2 space-y-2 bg-background/85 backdrop-blur-xl border-b border-border/40">
      <div className="rounded-2xl border border-border/40 bg-card/80 p-3 space-y-2 backdrop-blur-xl">
        <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-background/70 px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, slug, ID ou local..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase whitespace-nowrap rounded-md bg-primary/15 text-primary px-2 py-1">
            <CalendarDays className="h-3 w-3" /> Hoje: {totalTodayCount}
          </span>
        </div>

        {/* Modo Triagem IA + Aprovar todos seguros */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setTriageMode(v => !v)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition border ${triageMode ? "bg-primary text-primary-foreground border-primary shadow-[0_0_18px_hsl(var(--primary)/0.45)]" : "bg-secondary/50 text-muted-foreground border-border/40 hover:bg-secondary"}`}
            title="Ativa cards compactos + atalhos de teclado (A/D/U/X/R/←/→)"
          >
            <Bot className="h-3.5 w-3.5" />
            {triageMode ? "Modo Triagem IA: ON" : "Modo Triagem IA"}
          </button>
          <button
            type="button"
            onClick={() => setBulkSafeOpen(true)}
            disabled={publishing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-green-500/40 bg-green-500/15 px-3 py-1.5 text-[11px] font-bold uppercase text-green-400 hover:bg-green-500/25 disabled:opacity-40 transition"
            title="Aprova de uma vez todos os rascunhos com checklist completo (sem flags críticas)"
          >
            <Check className="h-3.5 w-3.5" />
            Aprovar todos seguros
          </button>
          <span className="text-[10px] text-muted-foreground inline-flex items-center gap-2">
            <span className="text-green-400 font-bold">{readyInFiltered}</span> seguros
            <span className="text-yellow-400 font-bold">{reviewInFiltered}</span> p/ revisar
          </span>
          {triageMode && (
            <span className="text-[10px] text-primary/80 ml-auto hidden md:inline">
              ⌨ A=aprovar · D=destaque · U=Aura · X=arquivar · ←→ navegar
            </span>
          )}
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
          <select value={originFilter} onChange={(e) => setOriginFilter(e.target.value as OriginFilter)} className="rounded-xl border border-border/40 bg-background/70 px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50">
            <option value="todos">Origem: Todas</option>
            <option value="ai">Criados por IA</option>
            <option value="manual">Criados Manualmente</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {([
            { key: "todos", label: "Todos" },
            { key: "prontos", label: "✅ Prontos para publicar" },
            { key: "revisar", label: "👀 Revisar" },
            { key: "aura", label: "🤖 Aura" },
            { key: "destaques", label: "🔥 Destaques" },
            { key: "em-alta", label: "🚀 Em alta" },
            { key: "detectados-hoje", label: "📅 Hoje" },
            { key: "sem-imagem", label: "Sem imagem" },
            { key: "incompletos", label: "Incompletos" },
            { key: "arquivados", label: "🗃 Arquivados" },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setExtraFilter(key as ExtraFilter)}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition ${extraFilter === key ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"}`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOnlyNeedsReview(!onlyNeedsReview)}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition ${onlyNeedsReview ? "bg-yellow-400/20 text-yellow-400 border border-yellow-400/40" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"}`}
          >
            <AlertTriangle className="h-3 w-3" /> Eventos com erro de IA
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
        {(search || activeCategory || activeStatus || activePartner !== "todos" || activeDateFilter !== "todos" || onlyIncomplete || onlyNeedsReview || originFilter !== "todos" || extraFilter !== "todos") && (
          <>
            <span className="w-px h-4 bg-border/40 shrink-0 mx-0.5" />
            <button
                onClick={() => { setSearch(""); setActiveCategory(null); setActiveStatus(null); setActivePartner("todos"); setActiveDateFilter("todos"); setOnlyIncomplete(false); setOnlyNeedsReview(false); setOriginFilter("todos"); setExtraFilter("todos"); }}
              className="shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
            >
              <X className="h-3 w-3" /> Limpar
            </button>
          </>
        )}
      </div>
      </div>

      {/* Barra sticky de ações em lote */}
      {selectedCount > 0 && (
        <div className="sticky top-[140px] z-40 -mx-2 px-3 py-2 rounded-2xl border border-primary/40 bg-primary/10 backdrop-blur-xl flex items-center gap-2 flex-wrap shadow-[0_0_24px_hsl(var(--primary)/0.25)]">
          <span className="text-xs font-bold text-primary inline-flex items-center gap-1">
            <CheckSquare className="h-3.5 w-3.5" /> {selectedCount} selecionado(s)
          </span>
          <span className="text-[10px] text-muted-foreground">
            {selectedReadyToPublish} pronto(s) p/ publicar
          </span>
          <span className="w-px h-4 bg-border/40" />
          <button
            onClick={() => handleBulkApprove()}
            disabled={selectedReadyToPublish === 0 || publishing}
            className="inline-flex items-center gap-1 rounded-lg border border-green-500/40 bg-green-500/15 px-2.5 py-1 text-[10px] font-bold uppercase text-green-400 hover:bg-green-500/25 disabled:opacity-40 transition"
          >
            <Check className="h-3 w-3" /> Aprovar
          </button>
          <button
            onClick={() => handleBulkApprove({ featured: true })}
            disabled={selectedReadyToPublish === 0}
            className="inline-flex items-center gap-1 rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-2.5 py-1 text-[10px] font-bold uppercase text-yellow-300 hover:bg-yellow-400/20 disabled:opacity-40 transition"
          >
            <Flame className="h-3 w-3" /> + Destaque
          </button>
          <button
            onClick={() => handleBulkApprove({ auraPick: true })}
            disabled={selectedReadyToPublish === 0}
            className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/15 px-2.5 py-1 text-[10px] font-bold uppercase text-primary hover:bg-primary/25 disabled:opacity-40 transition"
          >
            <Bot className="h-3 w-3" /> + Aura
          </button>
          <button
            onClick={() => handleBulkAura(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase text-primary hover:bg-primary/20 transition"
          >
            🤖 Aura Pick
          </button>
          <button
            onClick={() => handleBulkArchive()}
            className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-secondary/40 px-2.5 py-1 text-[10px] font-bold uppercase text-muted-foreground hover:bg-secondary/70 transition"
          >
            🗃 Arquivar
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
          >
            <X className="h-3 w-3" /> Limpar seleção
          </button>
        </div>
      )}
      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-8">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">Nenhum evento encontrado.</p>
      ) : (
        <div className="space-y-6">
          {renderSection("Escolha da Aura", auraEvents, "🤖")}
          {renderSection("Destaques do dia", featuredTodayEvents, "🔥")}
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

      {/* Aprovar todos seguros */}
      <AlertDialog open={bulkSafeOpen} onOpenChange={setBulkSafeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar todos os eventos seguros?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const safe = filtered.filter(e => e.status !== "published" && e.status !== "archived" && getChecklist(e).complete);
                return (
                  <>
                    A Aura encontrou <strong className="text-green-400">{safe.length}</strong> evento(s) completo(s) nos filtros atuais (título, data futura, local, descrição rica e flyer). Eles serão publicados em lote.
                  </>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const safeIds = filtered.filter(e => e.status !== "published" && e.status !== "archived" && getChecklist(e).complete).map(e => e.id);
                handleApproveAllSafe(safeIds);
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Publicar agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EventosList;

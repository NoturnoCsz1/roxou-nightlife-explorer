// Hook central da listagem de eventos do admin (Fase 3B).
// Concentra TODO o estado, ações Supabase e derivações da página
// src/pages/admin/EventosList.tsx. Toda função de escrita foi copiada
// LITERALMENTE — mesmo SQL, mesmo payload, mesma ordem de execução.
// NUNCA alterar comportamento aqui sem aprovação explícita.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { spLocalToISO } from "@/lib/dateUtils";
import { downloadEventsZip } from "@/lib/downloadEventsZip";
import {
  CATEGORIES,
  type DateQuickFilter,
  type EventRow,
  type ExtraFilter,
  type OriginFilter,
  type TabKey,
  getEventEditPath,
} from "./types";
import {
  eventDayStr,
  getChecklist,
  isAiOrigin,
  needsReview,
  normalizeAiTitle,
  spDateStr,
} from "./helpers";

export function useEventosList() {
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
  const [quickEdits, setQuickEdits] = useState<
    Record<string, { title: string; date_time: string; venue_name?: string }>
  >({});
  const [visibleCount, setVisibleCount] = useState(80);
  const [auraModalOpen, setAuraModalOpen] = useState(false);
  const [triageMode, setTriageMode] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [bulkSafeOpen, setBulkSafeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("todos");
  const [searchInput, setSearchInput] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Debounce de busca (250ms)
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  async function handleDuplicate(eventId: string) {
    const { data } = await supabase.from("events").select("*").eq("id", eventId).single();
    if (!data) {
      toast.error("Erro ao carregar evento");
      return;
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadEvents() {
    setLoading(true);
    let query = supabase
      .from("events")
      .select(
        "id, title, slug, venue_name, address, date_time, category, sub_category, status, featured, aura_pick, image_url, description, partner_id, created_at, verification_source, ai_confidence, needs_review, aura_badge, aura_score"
      )
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
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const visibleIds = filtered.map((e) => e.id);
    if (visibleIds.every((id) => selectedIds.has(id)) && visibleIds.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleIds));
    }
  }

  async function handleDownloadZip() {
    const eventsToDownload =
      selectedIds.size > 0
        ? filtered.filter((e) => selectedIds.has(e.id) && e.image_url)
        : filtered.filter((e) => e.image_url);

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
    if (error) {
      toast.error("Erro ao marcar Aura");
      return;
    }
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
    if (error) {
      toast.error("Erro ao atualizar Aura");
      return;
    }
    setEvents((prev) => prev.map((e) => (ids.includes(e.id) ? { ...e, aura_pick: value } : e)));
    toast.success(`${ids.length} evento(s) ${value ? "marcados como Aura" : "removidos da Aura"}`);
  }

  async function handleBulkFeatured(value: boolean) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const { error } = await supabase.from("events").update({ featured: value }).in("id", ids);
    if (error) {
      toast.error("Erro ao atualizar destaque");
      return;
    }
    setEvents((prev) => prev.map((e) => (ids.includes(e.id) ? { ...e, featured: value } : e)));
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
    if (nextTitle.length < 5) {
      toast.error("Título precisa ter pelo menos 5 caracteres.");
      return;
    }
    const patch: { title: string; date_time: string; venue_name?: string | null } = {
      title: nextTitle,
      date_time: nextDate,
    };
    if (venueChanged) patch.venue_name = nextVenue || null;
    const { error } = await supabase.from("events").update(patch).eq("id", e.id);
    if (error) {
      toast.error("Erro ao salvar edição rápida.");
      return;
    }
    setEvents((prev) =>
      prev.map((x) =>
        x.id === e.id
          ? {
              ...x,
              title: nextTitle,
              date_time: nextDate,
              venue_name: venueChanged ? nextVenue || null : x.venue_name,
            }
          : x
      )
    );
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
    setAiBusy((p) => ({ ...p, [e.id]: "title" }));
    try {
      const { data, error } = await supabase.functions.invoke("extract-flyer-metadata", {
        body: { image_url: e.image_url, current_year: new Date().getFullYear() },
      });
      if (error) throw error;
      const newTitle = normalizeAiTitle((data as any)?.title || "");
      if (!newTitle) throw new Error("IA não retornou título");
      await supabase.from("events").update({ title: newTitle }).eq("id", e.id);
      setEvents((prev) => prev.map((x) => (x.id === e.id ? { ...x, title: newTitle } : x)));
      toast.success("Título atualizado pela IA");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao gerar título");
    } finally {
      setAiBusy((p) => ({ ...p, [e.id]: null }));
    }
  }

  async function regenerateDescription(e: EventRow) {
    if ((e.description || "").trim()) {
      toast.info("A descrição já existe. Edite manualmente ou apague para gerar outra.");
      return;
    }
    setAiBusy((p) => ({ ...p, [e.id]: "desc" }));
    try {
      const { data, error } = await supabase.functions.invoke("generate-description", {
        body: {
          title: e.title,
          venue_name: e.venue_name,
          address: e.address,
          date_time: e.date_time,
          category: e.category,
          sub_category: e.sub_category || undefined,
          partner_id: e.partner_id || undefined,
        },
      });
      if (error) throw error;
      const html = (data as any)?.descricao_rica || (data as any)?.description;
      if (!html) throw new Error("IA não retornou descrição");
      await supabase.from("events").update({ description: html }).eq("id", e.id);
      setEvents((prev) => prev.map((x) => (x.id === e.id ? { ...x, description: html } : x)));
      toast.success("Descrição rica gerada");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao gerar descrição");
    } finally {
      setAiBusy((p) => ({ ...p, [e.id]: null }));
    }
  }

  async function handleBulkPublish() {
    const selected = events.filter((e) => selectedIds.has(e.id));
    const ready = selected.filter((e) => getChecklist(e).complete && e.status !== "published");
    const blocked = selected.length - ready.length - selected.filter((e) => e.status === "published").length;

    if (ready.length === 0) {
      toast.error(`Nenhum evento pronto. ${blocked} bloqueado(s) por falta de informação.`);
      return;
    }
    setPublishing(true);
    try {
      const ids = ready.map((e) => e.id);
      const { error } = await supabase.from("events").update({ status: "published" }).in("id", ids);
      if (error) throw error;
      setEvents((prev) => prev.map((e) => (ids.includes(e.id) ? { ...e, status: "published" } : e)));
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
    if (error) {
      toast.error("Falha ao aprovar");
      return;
    }
    setEvents((prev) => prev.map((x) => (x.id === e.id ? { ...x, ...patch } : x)));
    const labels: string[] = ["Aprovado"];
    if (opts?.featured) labels.push("destaque");
    if (opts?.auraPick) labels.push("Aura Pick");
    toast.success(`✓ ${labels.join(" + ")}`);
  }

  async function handleArchive(e: EventRow) {
    const { error } = await supabase.from("events").update({ status: "archived" }).eq("id", e.id);
    if (error) {
      toast.error("Falha ao arquivar");
      return;
    }
    setEvents((prev) => prev.map((x) => (x.id === e.id ? { ...x, status: "archived" } : x)));
    toast.success("🗃 Arquivado");
  }

  async function handleBulkApprove(opts?: { featured?: boolean; auraPick?: boolean }) {
    const ids = Array.from(selectedIds);
    const ready = events.filter(
      (e) => ids.includes(e.id) && getChecklist(e).complete && e.status !== "published"
    );
    if (ready.length === 0) {
      toast.error("Nenhum dos selecionados está pronto para aprovação.");
      return;
    }
    const patch: { status: string; featured?: boolean; aura_pick?: boolean } = { status: "published" };
    if (opts?.featured) patch.featured = true;
    if (opts?.auraPick) patch.aura_pick = true;
    const readyIds = ready.map((e) => e.id);
    const { error } = await supabase.from("events").update(patch).in("id", readyIds);
    if (error) {
      toast.error("Erro ao aprovar em lote");
      return;
    }
    setEvents((prev) => prev.map((e) => (readyIds.includes(e.id) ? { ...e, ...patch } : e)));
    setSelectedIds(new Set());
    toast.success(
      `✓ ${ready.length} evento(s) aprovado(s)${opts?.featured ? " + destaque" : ""}${
        opts?.auraPick ? " + Aura" : ""
      }`
    );
  }

  async function handleBulkArchive() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const { error } = await supabase.from("events").update({ status: "archived" }).in("id", ids);
    if (error) {
      toast.error("Erro ao arquivar");
      return;
    }
    setEvents((prev) => prev.map((e) => (ids.includes(e.id) ? { ...e, status: "archived" } : e)));
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
    if (error) {
      toast.error("Erro ao publicar em lote");
      return;
    }
    setEvents((prev) =>
      prev.map((e) => (visibleSafeIds.includes(e.id) ? { ...e, status: "published" } : e))
    );
    setBulkSafeOpen(false);
    toast.success(`✅ ${visibleSafeIds.length} evento(s) seguros publicados`);
  }

  const todayStr = spDateStr(new Date());
  const weekEndStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return spDateStr(d);
  })();

  const filtered = events
    .filter((e) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return [e.title, e.slug, e.id, e.venue_name || ""].some((value) =>
        value.toLowerCase().includes(q)
      );
    })
    .filter((e) => !activeCategory || e.category === activeCategory)
    .filter((e) => !activeStatus || e.status === activeStatus)
    .filter(
      (e) =>
        activePartner === "todos" ||
        (activePartner === "sem-parceiro" ? !e.partner_id : e.partner_id === activePartner)
    )
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
      if (extraFilter === "incompletos") return getChecklist(e).complete === false ? true : false;
      if (extraFilter === "em-alta")
        return (
          e.aura_badge === "em_alta" || e.aura_badge === "viralizando" || e.aura_badge === "bombando"
        );
      if (extraFilter === "detectados-hoje") return spDateStr(new Date(e.created_at)) === todayStr;
      if (extraFilter === "arquivados") return e.status === "archived";
      if (extraFilter === "prontos")
        return e.status !== "published" && e.status !== "archived" && getChecklist(e).complete;
      if (extraFilter === "revisar")
        return e.status !== "archived" && (needsReview(e) || !getChecklist(e).complete);
      return true;
    })
    .filter((e) => {
      if (activeTab === "todos") return true;
      if (activeTab === "hoje") return eventDayStr(e) === todayStr;
      if (activeTab === "rascunhos") return e.status === "draft";
      if (activeTab === "problemas")
        return e.status !== "archived" && (needsReview(e) || !getChecklist(e).complete);
      if (activeTab === "destaques") return e.featured || e.aura_pick;
      return true;
    });

  useEffect(() => {
    setVisibleCount(80);
  }, [
    search,
    activeCategory,
    activeStatus,
    activePartner,
    activeDateFilter,
    onlyIncomplete,
    onlyNeedsReview,
    originFilter,
    extraFilter,
    activeTab,
  ]);

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
      const currentIdx = focusedId ? list.findIndex((x) => x.id === focusedId) : -1;
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
        if (cur.status === "published") {
          toast.info("Já publicado");
          return;
        }
        handleQuickApprove(cur);
      } else if (k === "d" && cur) {
        ev.preventDefault();
        // Toggle destaque mesmo em publicados
        if (cur.status === "published") {
          supabase
            .from("events")
            .update({ featured: !cur.featured })
            .eq("id", cur.id)
            .then(({ error }) => {
              if (error) {
                toast.error("Falha ao alternar destaque");
                return;
              }
              setEvents((prev) =>
                prev.map((x) => (x.id === cur.id ? { ...x, featured: !cur.featured } : x))
              );
              toast.success(cur.featured ? "Destaque removido" : "🔥 Destaque ativado");
            });
        } else {
          handleQuickApprove(cur, { featured: true });
        }
      } else if (k === "u" && cur) {
        ev.preventDefault();
        if (cur.status === "published") {
          supabase
            .from("events")
            .update({ aura_pick: !cur.aura_pick })
            .eq("id", cur.id)
            .then(({ error }) => {
              if (error) {
                toast.error("Falha ao alternar Aura");
                return;
              }
              setEvents((prev) =>
                prev.map((x) => (x.id === cur.id ? { ...x, aura_pick: !cur.aura_pick } : x))
              );
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
  }, [
    triageMode,
    focusedId,
    events,
    search,
    activeCategory,
    activeStatus,
    activePartner,
    activeDateFilter,
    onlyIncomplete,
    onlyNeedsReview,
    originFilter,
    extraFilter,
  ]);

  const visibleFiltered = filtered.slice(0, visibleCount);

  const auraEvents = visibleFiltered.filter((e) => e.aura_pick && eventDayStr(e) >= todayStr);
  const auraIds = new Set(auraEvents.map((e) => e.id));
  const featuredTodayEvents = visibleFiltered.filter(
    (e) => e.featured && !auraIds.has(e.id) && eventDayStr(e) === todayStr
  );
  const featuredIds = new Set(featuredTodayEvents.map((e) => e.id));
  const todayEvents = visibleFiltered.filter(
    (e) => eventDayStr(e) === todayStr && !auraIds.has(e.id) && !featuredIds.has(e.id)
  );
  const upcomingEvents = visibleFiltered.filter(
    (e) => eventDayStr(e) > todayStr && !auraIds.has(e.id)
  );
  const pastEvents = visibleFiltered.filter((e) => eventDayStr(e) < todayStr);

  // Counter for header (sobre todos os eventos, não só os filtrados)
  const totalTodayCount = events.filter((e) => eventDayStr(e) === todayStr).length;

  const categoryCounts = CATEGORIES.map((c) => ({
    key: c,
    label: c === "eletronica" ? "Eletrônica" : c.charAt(0).toUpperCase() + c.slice(1),
    count: events.filter((e) => e.category === c).length,
  }));

  const withImages = filtered.filter((e) => e.image_url).length;
  const selectedCount = selectedIds.size;
  const zipPercent =
    zipProgress.total > 0 ? Math.round((zipProgress.current / zipProgress.total) * 100) : 0;
  const partnerOptions = Array.from(
    new Map(
      events.filter((e) => e.partner_id && e.venue_name).map((e) => [e.partner_id!, e.venue_name!])
    ).entries()
  );

  // Counters for drafts
  const draftEvents = events.filter((e) => e.status === "draft");
  const draftsReady = draftEvents.filter((e) => getChecklist(e).complete).length;
  const draftsAttention = draftEvents.length - draftsReady;
  const selectedReadyToPublish = events.filter(
    (e) => selectedIds.has(e.id) && getChecklist(e).complete && e.status === "draft"
  ).length;
  // Triage counters across the entire current filter (all tabs)
  const readyInFiltered = filtered.filter(
    (e) => e.status !== "published" && e.status !== "archived" && getChecklist(e).complete
  ).length;
  const reviewInFiltered = filtered.filter(
    (e) => e.status !== "archived" && (needsReview(e) || !getChecklist(e).complete)
  ).length;

  const hasActiveAdvanced =
    !!activeCategory ||
    activeDateFilter !== "todos" ||
    onlyIncomplete ||
    onlyNeedsReview ||
    originFilter !== "todos" ||
    extraFilter !== "todos";

  return {
    // navegação
    navigate,
    // estado
    events,
    setEvents,
    search,
    setSearch,
    loading,
    deleteTarget,
    setDeleteTarget,
    pastOpen,
    setPastOpen,
    activeCategory,
    setActiveCategory,
    activeStatus,
    setActiveStatus,
    activePartner,
    setActivePartner,
    activeDateFilter,
    setActiveDateFilter,
    onlyIncomplete,
    setOnlyIncomplete,
    onlyNeedsReview,
    setOnlyNeedsReview,
    originFilter,
    setOriginFilter,
    extraFilter,
    setExtraFilter,
    clickCounts,
    selectedIds,
    setSelectedIds,
    zipping,
    zipProgress,
    aiBusy,
    publishing,
    quickEdits,
    setQuickEdits,
    visibleCount,
    setVisibleCount,
    auraModalOpen,
    setAuraModalOpen,
    triageMode,
    setTriageMode,
    focusedId,
    setFocusedId,
    bulkSafeOpen,
    setBulkSafeOpen,
    activeTab,
    setActiveTab,
    searchInput,
    setSearchInput,
    filtersOpen,
    setFiltersOpen,
    // ações
    handleDuplicate,
    loadEvents,
    loadClickCounts,
    toggleSelect,
    toggleSelectAll,
    handleDownloadZip,
    toggleFeatured,
    toggleAuraPick,
    copyEventLink,
    handleBulkAura,
    handleBulkFeatured,
    saveQuickEdit,
    handleDelete,
    regenerateTitle,
    regenerateDescription,
    handleBulkPublish,
    handleQuickApprove,
    handleArchive,
    handleBulkApprove,
    handleBulkArchive,
    handleApproveAllSafe,
    // derivados
    todayStr,
    weekEndStr,
    filtered,
    visibleFiltered,
    auraEvents,
    featuredTodayEvents,
    todayEvents,
    upcomingEvents,
    pastEvents,
    totalTodayCount,
    categoryCounts,
    withImages,
    selectedCount,
    zipPercent,
    partnerOptions,
    draftEvents,
    draftsReady,
    draftsAttention,
    selectedReadyToPublish,
    readyInFiltered,
    reviewInFiltered,
    hasActiveAdvanced,
  };
}

export type EventosListCtx = ReturnType<typeof useEventosList>;

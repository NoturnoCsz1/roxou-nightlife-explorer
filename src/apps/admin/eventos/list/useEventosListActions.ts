// Conjunto de ações (Supabase + UI) da listagem de eventos do admin (Fase 3B).
// Extraído de useEventosList.ts para manter cada arquivo abaixo de 500 LOC.
// TODAS as funções foram copiadas LITERALMENTE — mesmo SQL, mesmo payload,
// mesma ordem de execução, mesma mensagem de toast. Nunca alterar.

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Dispatch, SetStateAction } from "react";
import { useMemo } from "react";
import type { NavigateFunction } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { spLocalToISO } from "@/lib/dateUtils";
import { downloadEventsZip } from "@/lib/downloadEventsZip";
import type { EventRow } from "./types";
import { getChecklist, normalizeAiTitle } from "./helpers";

interface ActionsDeps {
  navigate: NavigateFunction;
  cityFilter: string | null | undefined;
  events: EventRow[];
  setEvents: Dispatch<SetStateAction<EventRow[]>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setClickCounts: Dispatch<SetStateAction<Record<string, number>>>;
  selectedIds: Set<string>;
  setSelectedIds: Dispatch<SetStateAction<Set<string>>>;
  filtered: EventRow[];
  setZipping: Dispatch<SetStateAction<boolean>>;
  setZipProgress: Dispatch<SetStateAction<{ current: number; total: number }>>;
  setAiBusy: Dispatch<SetStateAction<Record<string, "title" | "desc" | null>>>;
  setPublishing: Dispatch<SetStateAction<boolean>>;
  quickEdits: Record<string, { title: string; date_time: string; venue_name?: string }>;
  deleteTarget: EventRow | null;
  setDeleteTarget: Dispatch<SetStateAction<EventRow | null>>;
  setBulkSafeOpen: Dispatch<SetStateAction<boolean>>;
}

export function useEventosListActions(deps: ActionsDeps) {
  // useMemo garante que as referências não trocam a cada render — não muda
  // comportamento, mas evita gerar listeners duplicados no keyboard effect.
  return useMemo(() => {
    const {
      navigate,
      cityFilter,
      events,
      setEvents,
      setLoading,
      setClickCounts,
      selectedIds,
      setSelectedIds,
      filtered,
      setZipping,
      setZipProgress,
      setAiBusy,
      setPublishing,
      quickEdits,
      deleteTarget,
      setDeleteTarget,
      setBulkSafeOpen,
    } = deps;

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
      const blocked =
        selected.length - ready.length - selected.filter((e) => e.status === "published").length;

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
    async function handleQuickApprove(
      e: EventRow,
      opts?: { featured?: boolean; auraPick?: boolean }
    ) {
      const cl = getChecklist(e);
      if (!cl.complete) {
        toast.error("Evento incompleto: preencha título, data, local, descrição e flyer.");
        return;
      }
      const patch: { status: string; featured?: boolean; aura_pick?: boolean } = {
        status: "published",
      };
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
      const patch: { status: string; featured?: boolean; aura_pick?: boolean } = {
        status: "published",
      };
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

    return {
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
    };
  }, [deps]);
}

export type EventosListActions = ReturnType<typeof useEventosListActions>;

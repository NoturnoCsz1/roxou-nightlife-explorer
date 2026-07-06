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
import { hasEventDescription } from "@/lib/eventDescription";
import { classifyAiError } from "@/lib/aiGatewayError";

/**
 * Consome o retorno da Edge Function `generate-description` e monta um patch
 * apenas com os campos editoriais que estão vazios no evento (ou com todos
 * eles quando `force=true`). Aceita tanto o formato português (`descricao_rica`,
 * `chamada_site`) quanto o inglês (`description`, `title`, `instagram_caption`).
 */
function buildEditorialPatch(
  e: EventRow,
  data: unknown,
  opts: { force?: boolean } = {}
): Record<string, unknown> & { __anyChange: boolean } {
  const d = (data ?? {}) as Record<string, unknown>;
  const pick = (v: unknown): string =>
    typeof v === "string" ? v.trim() : "";
  const description =
    pick(d.description_html) || pick(d.descricao_rica) || pick(d.description);
  const instagramCaption = pick(d.instagram_caption) || pick(d.caption);
  const shortSummary = pick(d.short_summary) || pick(d.resumo_curto);
  const metaTitle = pick(d.meta_title);
  const metaDescription = pick(d.meta_description);

  const patch: Record<string, unknown> = {};
  const empty = (v: unknown) => !((typeof v === "string" ? v : "") || "").trim();
  if (description && (opts.force || empty(e.description))) patch.description = description;
  if (instagramCaption && (opts.force || empty(e.instagram_caption)))
    patch.instagram_caption = instagramCaption;
  if (shortSummary && (opts.force || empty(e.short_summary))) patch.short_summary = shortSummary;
  if (metaTitle && (opts.force || empty(e.meta_title))) patch.meta_title = metaTitle;
  if (metaDescription && (opts.force || empty(e.meta_description)))
    patch.meta_description = metaDescription;

  return { ...patch, __anyChange: Object.keys(patch).length > 0 };
}

/**
 * True quando o evento ainda precisa da IA para completar conteúdo editorial.
 * Considera-se completo quando existe descrição E legenda Instagram.
 */
export function eventNeedsAiContent(e: EventRow): boolean {
  const hasDesc = hasEventDescription(e as unknown as Record<string, unknown>);
  const hasCaption = !!(e.instagram_caption || "").trim();
  return !hasDesc || !hasCaption;
}

// Lock de reentrância do bulk IA — impede clique duplo no botão IA(N).
const bulkAiInflight = new Set<string>();

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
          "id, title, slug, venue_name, address, date_time, category, sub_category, status, featured, aura_pick, image_url, description, partner_id, created_at, verification_source, ai_confidence, needs_review, aura_badge, aura_score, instagram_caption, short_summary, meta_title, meta_description, time_is_unknown"
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
        if (error) {
          const c = await classifyAiError(error, data);
          if (c.kind === "credits") toast.error(`💳 ${c.message}`);
          else toast.error(c.message);
          return;
        }
        const newTitle = normalizeAiTitle((data as any)?.title || "");
        if (!newTitle) throw new Error("IA não retornou título");
        await supabase.from("events").update({ title: newTitle }).eq("id", e.id);
        setEvents((prev) => prev.map((x) => (x.id === e.id ? { ...x, title: newTitle } : x)));
        toast.success("Título atualizado pela IA");
      } catch (err: any) {
        const c = await classifyAiError(err);
        toast.error(c.message);
      } finally {
        setAiBusy((p) => ({ ...p, [e.id]: null }));
      }
    }

    async function regenerateDescription(e: EventRow, opts?: { force?: boolean }) {
      const alreadyHas = hasEventDescription(e as unknown as Record<string, unknown>);
      const hasCaption = !!(e.instagram_caption || "").trim();
      // Se já tem descrição E legenda, exige `force` para regerar.
      if (alreadyHas && hasCaption && !opts?.force) {
        toast.info("Este evento já possui descrição e legenda. Use 'Substituir' para regerar.");
        return;
      }
      setAiBusy((p) => ({ ...p, [e.id]: "desc" }));
      const startedAt = performance.now();
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
        if (error) {
          const c = await classifyAiError(error, data);
          if (c.kind === "credits") toast.error(`💳 ${c.message}`);
          else toast.error(c.message);
          return;
        }
        const patch = buildEditorialPatch(e, data, { force: !!opts?.force });
        if (!patch.__anyChange) throw new Error("IA não retornou conteúdo utilizável");
        const dbPatch = { ...patch } as Record<string, unknown>;
        delete dbPatch.__anyChange;
        await supabase.from("events").update(dbPatch as any).eq("id", e.id);
        setEvents((prev) =>
          prev.map((x) => (x.id === e.id ? { ...x, ...(dbPatch as Partial<EventRow>) } : x))
        );
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug("[regenerateDescription]", {
            id: e.id,
            ms: Math.round(performance.now() - startedAt),
            fields: Object.keys(dbPatch),
          });
        }
        toast.success("Conteúdo IA aplicado");
      } catch (err: any) {
        const c = await classifyAiError(err);
        toast.error(c.message);
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

    // === Excluir selecionados em lote (com confirmação no dialog do shell) ===
    async function handleBulkDelete(ids: string[]) {
      if (ids.length === 0) return;
      const { error } = await supabase.from("events").delete().in("id", ids);
      if (error) {
        toast.error("Erro ao excluir em lote");
        return;
      }
      setEvents((prev) => prev.filter((e) => !ids.includes(e.id)));
      setSelectedIds(new Set());
      toast.success(`🗑 ${ids.length} evento(s) excluído(s)`);
    }

    // === Marcar para revisão em lote ===
    async function handleBulkNeedsReview() {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;
      const { error } = await supabase
        .from("events")
        .update({ needs_review: true } as any)
        .in("id", ids);
      if (error) {
        toast.error("Erro ao marcar para revisão");
        return;
      }
      setEvents((prev) =>
        prev.map((e) => (ids.includes(e.id) ? { ...e, needs_review: true } : e))
      );
      setSelectedIds(new Set());
      toast.success(`✅ ${ids.length} enviado(s) para revisão`);
    }

    // === Aplicar categoria em lote ===
    async function handleBulkAssignCategory(category: string) {
      const ids = Array.from(selectedIds);
      if (ids.length === 0 || !category) return;
      const { error } = await supabase
        .from("events")
        .update({ category })
        .in("id", ids);
      if (error) {
        toast.error("Erro ao aplicar categoria");
        return;
      }
      setEvents((prev) => prev.map((e) => (ids.includes(e.id) ? { ...e, category } : e)));
      setSelectedIds(new Set());
      toast.success(`🏷 Categoria "${category}" aplicada a ${ids.length}`);
    }

    // === Aplicar parceiro/local em lote ===
    async function handleBulkAssignPartner(partnerId: string, venueName?: string | null) {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;
      const patch: { partner_id: string | null; venue_name?: string | null } = {
        partner_id: partnerId || null,
      };
      if (venueName !== undefined) patch.venue_name = venueName;
      const { error } = await supabase.from("events").update(patch).in("id", ids);
      if (error) {
        toast.error("Erro ao aplicar parceiro");
        return;
      }
      setEvents((prev) =>
        prev.map((e) => (ids.includes(e.id) ? { ...e, ...patch } : e))
      );
      setSelectedIds(new Set());
      toast.success(`👥 Parceiro aplicado a ${ids.length} evento(s)`);
    }

    // === Gerar conteúdo IA (descrição + legenda IG + SEO) para selecionados ===
    // Fila client-side com concorrência 2. Só chama IA para eventos que ainda
    // precisam de algum campo editorial (descrição OU legenda IG). Nunca
    // sobrescreve campo que já estava preenchido.
    async function handleBulkGenerateDescriptions(ids: string[]) {
      // Chave de reentrância: mesmo conjunto de ids não pode disparar 2×.
      const lockKey = [...ids].sort().join(",");
      if (bulkAiInflight.has(lockKey)) {
        toast.info("Geração IA já em andamento para esta seleção.");
        return;
      }
      bulkAiInflight.add(lockKey);

      const selected = events.filter((e) => ids.includes(e.id));
      const targets = selected.filter((e) => eventNeedsAiContent(e));
      const ignored = selected.length - targets.length;
      if (targets.length === 0) {
        bulkAiInflight.delete(lockKey);
        toast.info("Nenhum dos selecionados precisa da IA.");
        return;
      }

      const total = targets.length;
      const progressId = toast.loading(`Gerando conteúdo IA: 0 de ${total}…`);
      let ok = 0;
      let fail = 0;
      let skipped = 0;
      let done = 0;
      let aborted = false;
      let abortReason: string | null = null;

      const runOne = async (e: EventRow) => {
        setAiBusy((p) => ({ ...p, [e.id]: "desc" }));
        try {
          if (aborted) {
            skipped++;
            return;
          }
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
          if (error) {
            const c = await classifyAiError(error, data);
            if (c.fatalForBulk && !aborted) {
              aborted = true;
              abortReason = c.message;
            }
            fail++;
            return;
          }
          // Snapshot atualizado do evento (pode ter mudado por outro worker).
          const current = events.find((x) => x.id === e.id) ?? e;
          const patch = buildEditorialPatch(current, data);
          if (!patch.__anyChange) {
            skipped++;
            return;
          }
          const dbPatch = { ...patch } as Record<string, unknown>;
          delete dbPatch.__anyChange;
          const { error: upErr } = await supabase
            .from("events")
            .update(dbPatch as any)
            .eq("id", e.id);
          if (upErr) throw upErr;
          setEvents((prev) =>
            prev.map((x) => (x.id === e.id ? { ...x, ...(dbPatch as Partial<EventRow>) } : x))
          );
          ok++;
        } catch (err) {
          const c = await classifyAiError(err);
          if (c.fatalForBulk && !aborted) {
            aborted = true;
            abortReason = c.message;
          }
          fail++;
        } finally {
          setAiBusy((p) => ({ ...p, [e.id]: null }));
          done++;
          // done inclui ok + fail + skipped — contador nunca trava em 0/N nem X/N.
          toast.loading(`Gerando conteúdo IA: ${done} de ${total}…`, { id: progressId });
        }
      };

      try {
        const CONCURRENCY = 2;
        const queue = [...targets];
        const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
          while (queue.length > 0) {
            // Aborto suave: drena o restante como "skipped" para o contador fechar.
            if (aborted) {
              const remaining = queue.splice(0, queue.length);
              for (const r of remaining) {
                skipped++;
                done++;
                setAiBusy((p) => ({ ...p, [r.id]: null }));
                toast.loading(`Gerando conteúdo IA: ${done} de ${total}…`, { id: progressId });
              }
              break;
            }
            const next = queue.shift();
            if (!next) break;
            await runOne(next);
          }
        });
        await Promise.all(workers);
      } catch (err) {
        // Nunca deixa a UI travada — captura qualquer erro inesperado do orquestrador.
        const c = await classifyAiError(err);
        toast.error(c.message);
      } finally {
        bulkAiInflight.delete(lockKey);
        toast.dismiss(progressId);
      }

      const parts: string[] = [];
      if (ok > 0) parts.push(`${ok} atualizado(s)`);
      if (skipped > 0) parts.push(`${skipped} sem mudança`);
      if (ignored > 0) parts.push(`${ignored} já estavam completos`);
      if (fail > 0) parts.push(`${fail} falha(s)`);
      const summary = parts.join(" · ") || "Nada a fazer";
      if (aborted && abortReason) {
        toast.error(`⏹ ${abortReason} — ${summary}`);
      } else if (fail === 0 && ok > 0) {
        toast.success(`✨ ${summary}`);
      } else if (ok === 0 && fail > 0) {
        toast.error(summary);
      } else {
        toast.message(summary);
      }
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
      handleBulkDelete,
      handleBulkNeedsReview,
      handleBulkAssignCategory,
      handleBulkAssignPartner,
      handleBulkGenerateDescriptions,
    };
  }, [deps]);
}

export type EventosListActions = ReturnType<typeof useEventosListActions>;

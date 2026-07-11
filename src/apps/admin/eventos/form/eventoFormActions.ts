/* eslint-disable @typescript-eslint/no-explicit-any -- preservado do original EventoForm.tsx (Fase 3C1) */
import type React from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { classifyAiError } from "@shared/utils/aiGatewayError";
import { analyzeAndLinkEventTransmission } from "@/lib/sportsTransmission";
import { slugify } from "./utils";
import { buildHandleSubmit } from "./eventoFormSubmit";
import type { EventoFormState, Partner } from "./types";
import {
  type EventoFormActionDeps,
  softArchiveEvent,
  findDuplicateByImageHash,
  findDuplicateByTitleVenueDay,
} from "@modules/admin/events";

/**
 * Re-export do contrato compartilhado do formulário administrativo de
 * eventos. A definição vive em `@modules/admin/events` (Onda 13) para
 * eliminar o ciclo com `eventoFormSubmit.ts`. Mantido aqui como alias
 * para não quebrar consumidores externos que ainda importam desta rota.
 */
export type { EventoFormActionDeps };


export function createEventoFormActions(deps: EventoFormActionDeps) {
  async function softDeleteEvent() {
    const { id, setDeleting, navigate, setDeleteOpen } = deps;
    if (!id) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({ status: "archived", featured: false, needs_review: false })
        .eq("id", id);
      if (error) throw error;
      toast.success("Evento excluído (arquivado). Já saiu do site público.");
      navigate("/admin/eventos");
    } catch (e: any) {
      toast.error(e?.message || "Falha ao excluir evento");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  async function reprocessSportsTransmission() {
    const { id, form, setReprocessingSports } = deps;
    if (!id) {
      toast.error("Salve o evento antes de reprocessar.");
      return;
    }
    setReprocessingSports(true);
    try {
      const text = [form.title, form.description, form.venue_name, (form as any)._sub, form.category]
        .filter(Boolean)
        .join(" \n ");
      const refDate = form.date_time ? new Date(`${form.date_time}:00-03:00`) : null;
      const r = await analyzeAndLinkEventTransmission({
        eventId: id,
        text,
        partnerId: form.partner_id || null,
        referenceDate: refDate,
        source: "manual_reprocess",
      });
      if (r.linked)
        toast.success(`✅ Vínculo criado (${r.confidence}). Times: ${r.teams.join(", ") || "—"}`);
      else if (r.detected && r.matched_match_id)
        toast.message(`Jogo encontrado, mas confiança ${r.confidence}. Revise em /admin/jogos.`);
      else if (r.detected)
        toast.message(
          `Transmissão detectada (${r.teams.join(", ") || "sem times"}), sem jogo correspondente em sports_matches.`,
        );
      else toast.message("Nenhuma transmissão esportiva detectada no texto deste evento.");
    } catch (e: any) {
      toast.error(e?.message || "Falha ao reprocessar transmissão");
    } finally {
      setReprocessingSports(false);
    }
  }

  async function reprocessFlyerWithAi() {
    const { form, setForm, setReprocessing } = deps;
    if (!form.image_url) {
      toast.error("Adicione um flyer antes de re-processar com IA.");
      return;
    }
    setReprocessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-flyer-metadata", {
        body: { image_url: form.image_url, current_year: new Date().getFullYear() },
      });
      if (error) throw error;
      const meta: any = data || {};
      let nextDateTime = form.date_time;
      let nextTimeUnknown = (form as any).time_is_unknown ?? false;
      if (meta.date_iso) {
        nextDateTime = String(meta.date_iso).slice(0, 16);
        nextTimeUnknown = Boolean(meta.time_is_unknown);
      } else if (meta.date) {
        const hasRealTime = meta.time && /^\d{2}:\d{2}$/.test(meta.time);
        nextDateTime = `${meta.date}T${hasRealTime ? meta.time : "00:00"}`;
        nextTimeUnknown = !hasRealTime || Boolean(meta.time_is_unknown);
      }
      setForm((prev) => ({
        ...prev,
        title: meta.title ? String(meta.title).toUpperCase() : prev.title,
        date_time: nextDateTime,
        time_is_unknown: nextTimeUnknown,
        venue_name: meta.venue_name || prev.venue_name,
        category: meta.category || prev.category,
        ...(meta.sub_category ? { _sub: meta.sub_category } : {}),
        flyer_text: typeof meta.flyer_text === "string" ? meta.flyer_text : prev.flyer_text,
        artists: Array.isArray(meta.artists) ? meta.artists : prev.artists,
        price: typeof meta.price === "string" ? meta.price : prev.price,
        official_source_url:
          typeof meta.official_source_url === "string"
            ? meta.official_source_url
            : prev.official_source_url,
      } as any));
      toast.success(
        nextTimeUnknown
          ? "Flyer re-processado. ⚠ Horário não detectado — marcado como 'a confirmar'."
          : "Flyer re-processado pela IA. Revise os campos antes de salvar.",
      );
    } catch (err: any) {
      toast.error(err?.message || "Falha ao re-processar com IA");
    } finally {
      setReprocessing(false);
    }
  }

  async function generateDescription(info: {
    title: string;
    venue_name?: string;
    address?: string;
    date_time?: string;
    category?: string;
    sub_category?: string;
    partner_id?: string;
    image_url?: string;
    time_is_unknown?: boolean;
    flyer_text?: string;
    artists?: string[];
    price?: string;
    ticket_url?: string;
    instagram?: string;
    official_source_url?: string;
  }) {
    const { form, setForm, setGeneratingDesc } = deps;
    setGeneratingDesc(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-description", {
        body: {
          ...info,
          flyer_text: info.flyer_text ?? (form as any).flyer_text ?? "",
          artists: info.artists ?? (form as any).artists ?? [],
          price: info.price ?? (form as any).price ?? "",
          ticket_url: info.ticket_url ?? form.ticket_url ?? "",
          instagram: info.instagram ?? form.instagram ?? "",
          official_source_url: info.official_source_url ?? (form as any).official_source_url ?? "",
        },
      });
      if (error) {
        const c = await classifyAiError(error, data);
        if (c.kind === "credits") toast.error(`💳 ${c.message}`);
        else toast.error(c.message);
        return;
      }
      const rich: string = data?.description_html || data?.descricao_rica || data?.description || "";
      const chamada: string | undefined = data?.title || data?.chamada_site;
      const shortSummary: string = data?.short_summary || "";
      const metaTitle: string = data?.meta_title || "";
      const metaDescription: string = data?.meta_description || "";
      const igCaption: string = data?.instagram_caption || "";
      const warnings: string[] = Array.isArray(data?.warnings) ? data.warnings : [];
      const confidence: number | null =
        typeof data?.ai_confidence_score === "number" ? data.ai_confidence_score : null;

      setForm((prev) => ({
        ...prev,
        description: rich || prev.description,
        title: prev.title || chamada || prev.title,
        short_summary: shortSummary || prev.short_summary,
        meta_title: metaTitle || prev.meta_title,
        meta_description: metaDescription || prev.meta_description,
        instagram_caption: igCaption || prev.instagram_caption,
        ai_warnings: warnings,
        ai_confidence_score: confidence ?? prev.ai_confidence_score,
      }));

      if (warnings.length > 0) {
        toast.warning(
          `Copy gerada com ${warnings.length} aviso${warnings.length > 1 ? "s" : ""}. Revise antes de publicar.`,
        );
      } else if (chamada) {
        toast.success(`Copy gerada! Chamada: "${chamada}"`);
      } else {
        toast.success("Descrição gerada pela IA (gpt-5-mini).");
      }
    } catch (err: any) {
      const c = await classifyAiError(err);
      if (c.kind === "credits") toast.error(`💳 ${c.message}`);
      else toast.error(c.message);
    } finally {
      setGeneratingDesc(false);
    }
  }

  async function checkDuplicateEvent(next: Partial<EventoFormState>) {
    const { id, isEdit, form, setDuplicateCandidate, setAllowDuplicate } = deps;
    const draft = { ...form, ...next };
    const select = "id, title, slug, date_time, venue_name";
    let found: any = null;

    if (draft.image_hash) {
      const q = supabase.from("events").select(select).eq("image_hash", draft.image_hash).limit(1);
      const { data } = isEdit ? await q.neq("id", id!) : await q;
      found = data?.[0] || null;
    }

    if (!found && draft.title && draft.date_time && draft.venue_name) {
      const dayStart = `${draft.date_time.slice(0, 10)}T00:00:00-03:00`;
      const dayEnd = `${draft.date_time.slice(0, 10)}T23:59:59-03:00`;
      const q = supabase
        .from("events")
        .select(select)
        .ilike("title", draft.title.trim())
        .ilike("venue_name", draft.venue_name.trim())
        .gte("date_time", dayStart)
        .lte("date_time", dayEnd)
        .limit(1);
      const { data } = isEdit ? await q.neq("id", id!) : await q;
      found = data?.[0] || null;
    }

    setDuplicateCandidate(found);
    setAllowDuplicate(false);
    if (found)
      toast.warning("⚠️ Este evento já foi postado. Deseja editar o existente ou criar um duplicado?");
    return found;
  }

  // handleSubmit é extraído para `eventoFormSubmit.ts` por limite de LOC.
  // Toda a lógica de Supabase/Guard/Payload permanece inalterada.
  const handleSubmit = buildHandleSubmit(deps, checkDuplicateEvent);



  function handleInstagramImport(data: {
    title?: string;
    description?: string;
    date?: string;
    time?: string;
    category?: string;
    venue_name?: string;
    instagram?: string;
    ticket_url?: string;
    image_url?: string;
  }) {
    const { partners, setForm, setManualVenue, setSuggestedPartner } = deps;

    const igHasTime = Boolean(data.time && /^\d{2}:\d{2}$/.test(data.time));
    const dateTime =
      data.date && igHasTime
        ? `${data.date}T${data.time}`
        : data.date
          ? `${data.date}T00:00`
          : "";
    const igTimeIsUnknown = Boolean(data.date) && !igHasTime;

    let autoLinked: Partner | undefined;
    let suggested: Partner | undefined;

    if (data.instagram) {
      const igNorm = data.instagram.replace(/^@/, "").toLowerCase();
      autoLinked = partners.find(
        (p) => p.instagram && p.instagram.replace(/^@/, "").toLowerCase() === igNorm,
      );
    }

    if (!autoLinked && data.venue_name) {
      const vnNorm = data.venue_name.toLowerCase().trim();
      const exactMatch = partners.find((p) => p.name.toLowerCase().trim() === vnNorm);
      if (exactMatch) {
        autoLinked = exactMatch;
      } else {
        const similarMatches = partners.filter(
          (p) =>
            vnNorm.includes(p.name.toLowerCase().trim()) ||
            p.name.toLowerCase().trim().includes(vnNorm),
        );
        if (similarMatches.length === 1) {
          suggested = similarMatches[0];
        }
      }
    }

    setSuggestedPartner(null);

    setForm((prev) => ({
      ...prev,
      title: data.title || prev.title,
      slug: data.title ? slugify(data.title) : prev.slug,
      description: data.description || prev.description,
      date_time: dateTime || prev.date_time,
      time_is_unknown: dateTime ? igTimeIsUnknown : (prev as any).time_is_unknown,
      category: data.category || prev.category,
      venue_name: autoLinked?.name || data.venue_name || prev.venue_name,
      address: autoLinked?.address || prev.address,
      instagram: autoLinked?.instagram || data.instagram || prev.instagram,
      partner_id: autoLinked?.id || prev.partner_id,
      ticket_url: data.ticket_url || prev.ticket_url,
      image_url: data.image_url || prev.image_url,
      status: "draft",
      verification_source: "Instagram",
    }));

    if (autoLinked) {
      setManualVenue(false);
      toast.success(`Parceiro "${autoLinked.name}" vinculado automaticamente!`);
    } else {
      if (data.venue_name) setManualVenue(true);
      if (suggested) setSuggestedPartner(suggested);
    }
    toast.success("Dados importados! Revise e complete as informações.");
  }

  return {
    softDeleteEvent,
    reprocessSportsTransmission,
    reprocessFlyerWithAi,
    generateDescription,
    checkDuplicateEvent,
    handleSubmit,
    handleInstagramImport,
  };
}

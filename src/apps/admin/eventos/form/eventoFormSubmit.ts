/* eslint-disable @typescript-eslint/no-explicit-any -- preservado do original EventoForm.tsx (Fase 3C1) */
import type React from "react";
import { toast } from "sonner";
import { buildEventPayload } from "@/lib/adminEventPayload";
import { analyzeAndLinkEventTransmission } from "@/lib/sportsTransmission";
import {
  validateBeforePublish,
  persistValidationLog,
  REASON_LABELS,
} from "@/lib/eventIngestionGuard";
import { buildRoxouCaption } from "./utils";
import {
  type EventoFormActionDeps,
  insertEvent,
  updateEvent,
  linkEventouImport,
  insertContentGenerationPost,
  logAiEventFeedback,
} from "@modules/admin/events";

/**
 * `handleSubmit` extraído para arquivo próprio a fim de manter cada módulo
 * abaixo de 500 LOC. Comportamento idêntico ao original — nenhuma query
 * Supabase, nenhuma chamada de Edge Function e nenhum payload foi alterado.
 *
 * Recebe `checkDuplicateEvent` por injeção para evitar dependência circular
 * com `eventoFormActions.ts`.
 *
 * Onda 13: tipo `EventoFormActionDeps` e I/O Supabase agora vêm de
 * `@modules/admin/events`. Sem alteração de comportamento.
 */
export function buildHandleSubmit(
  deps: EventoFormActionDeps,
  checkDuplicateEvent: (next: Partial<EventoFormActionDeps["form"]>) => Promise<any>,
) {
  return async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const {
      id,
      isEdit,
      form,
      cityFilter,
      navigate,
      eventouImportId,
      originalSnapshot,
      duplicateCandidate,
      allowDuplicate,
      setSaving,
    } = deps;

    if (!form.title || !form.slug || !form.date_time) {
      toast.error("Título, slug e data são obrigatórios");
      return;
    }
    if (duplicateCandidate && !allowDuplicate) {
      toast.warning("Escolha editar o existente ou confirme criar um duplicado.");
      return;
    }
    if (!allowDuplicate) {
      const found = await checkDuplicateEvent({});
      if (found) {
        toast.warning("⚠️ Este evento já foi postado. Deseja editar o existente ou criar um duplicado?");
        return;
      }
    }

    setSaving(true);
    let payload = buildEventPayload(form as any, { city: cityFilter });

    const guard = await validateBeforePublish({
      source: "form",
      title: form.title,
      description: (form as any).description,
      venue_name: form.venue_name,
      partner_id: (form as any).partner_id || null,
      date_time: form.date_time,
      image_url: form.image_url,
      image_hash: (form as any).image_hash,
      current_event_id: id || null,
    });

    if (!guard.ok) {
      const reasons = guard.blockReasons.map((r) => REASON_LABELS[r] || r).join(", ");
      if ((form as any).status === "published") {
        const publishAnyway = confirm(
          `⚠ Guard detectou: ${reasons}.\n\nO evento foi revisado manualmente e pode ser publicado.\n\nOK → Publicar mesmo assim (ficará marcado para revisão)\nCancelar → Salvar como rascunho`,
        );
        if (publishAnyway) {
          payload = { ...payload, needs_review: true } as any;
        } else {
          payload = { ...payload, status: "draft", needs_review: true } as any;
        }
      } else {
        payload = { ...payload, needs_review: true } as any;
      }
    } else if (guard.recommendedNeedsReview) {
      payload = { ...payload, needs_review: true } as any;
    }
    await persistValidationLog(guard.validationLog, id || null);

    try {
      let savedEventId: string | undefined = id || undefined;
      if (isEdit) {
        await updateEvent(id!, payload);
        const orig = originalSnapshot.current;
        const newSub = (form as any)._sub || null;
        if (
          orig &&
          (orig.category !== form.category ||
            orig.sub_category !== newSub ||
            (orig.description || "") !== (form.description || ""))
        ) {
          await logAiEventFeedback({
            venue_name: form.venue_name || orig.venue_name,
            original_category: orig.category,
            corrected_category: form.category,
            original_sub_category: orig.sub_category,
            corrected_sub_category: newSub,
            original_description: orig.description,
            corrected_description: form.description || null,
          });
        }
        toast.success("Evento atualizado!");
      } else {
        const inserted = await insertEvent(payload);
        const eventId = inserted?.id;
        savedEventId = eventId;

        if (eventouImportId && eventId) {
          await linkEventouImport(eventouImportId, eventId);

          const imageUrl = form.image_url || null;
          const caption = buildRoxouCaption(form);

          await insertContentGenerationPost({
            source_id: eventId,
            title: form.title,
            generated_text: caption,
            image_url: imageUrl,
          });

          toast.success("Evento criado + post ROXOU preparado!");
        } else {
          toast.success("Evento criado!");
        }
      }

      if (savedEventId) {
        try {
          const text = [form.title, form.description, form.venue_name, (form as any)._sub, form.category]
            .filter(Boolean)
            .join(" \n ");
          const refDate = form.date_time ? new Date(`${form.date_time}:00-03:00`) : null;
          const r = await analyzeAndLinkEventTransmission({
            eventId: savedEventId,
            text,
            partnerId: form.partner_id || null,
            referenceDate: refDate,
            source: "manual",
          });
          if (r.linked) toast.success(`Transmissão vinculada ao jogo (${r.confidence}).`);
          else if (r.detected && r.confidence !== "high")
            toast.message("Possível transmissão detectada — revisar em /admin/jogos.");
        } catch (e) {
          console.warn("sports transmission link failed", e);
        }
      }

      navigate("/admin/eventos");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };
}

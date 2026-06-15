import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { buildEventPayload } from "@/lib/adminEventPayload";
import { isoToSpLocal } from "@/lib/dateUtils";
import { analyzeAndLinkEventTransmission } from "@/lib/sportsTransmission";
import {
  validateBeforePublish,
  persistValidationLog,
  REASON_LABELS,
} from "@/lib/eventIngestionGuard";
import { emptyTransmission, type TransmissionFields } from "@/components/admin/TransmissionSection";
import { buildRoxouCaption, slugify } from "./helpers";
import type { DuplicateCandidate, EventoFormState, Partner, SectionsState } from "./types";

/**
 * Hook orquestrador do EventoForm (Fase 3C1).
 *
 * ⚠️ Paridade total com `src/pages/admin/EventoForm.tsx` original (1051 LOC).
 * Nenhuma chamada Supabase / OpenAI / Edge Function foi alterada;
 * nenhum payload, nenhuma ordem de execução, nenhum toast foi modificado.
 */
export function useEventoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isCityEditor: _isCityEditor, cityFilter } = useAdminProfile();
  const duplicateData = (location.state as any)?.duplicate;
  const eventouImportId = (location.state as any)?.eventou_import_id;
  const isEdit = !!id;

  const [saving, setSaving] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessingSports, setReprocessingSports] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const originalSnapshot = useRef<{
    category: string;
    sub_category: string | null;
    description: string | null;
    venue_name: string | null;
  } | null>(null);

  const [partners, setPartners] = useState<Partner[]>([]);
  const [manualVenue, setManualVenue] = useState(false);
  const [sections, setSections] = useState<SectionsState>({ venue: true, content: true, media: true });
  const [igModalOpen, setIgModalOpen] = useState(false);
  const [suggestedPartner, setSuggestedPartner] = useState<Partner | null>(null);
  const [duplicateCandidate, setDuplicateCandidate] = useState<DuplicateCandidate>(null);
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  const [form, setForm] = useState<EventoFormState>({
    title: "",
    slug: "",
    date_time: "",
    category: "festa",
    partner_id: "",
    venue_name: "",
    address: "",
    instagram: "",
    description: "",
    status: "draft",
    verification_source: "Instagram",
    featured: false,
    image_url: "",
    video_url: "",
    ticket_url: "",
    image_hash: "",
    opportunity_tags: [] as string[],
    transport_reservation_enabled: false,
    time_is_unknown: false,
    short_summary: "",
    meta_title: "",
    meta_description: "",
    instagram_caption: "",
    ai_confidence_score: null as number | null,
    ai_warnings: [] as string[],
    flyer_text: "",
    artists: [] as string[],
    price: "",
    official_source_url: "",
    ...emptyTransmission(),
  });

  async function softDeleteEvent() {
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
      if (r.linked) toast.success(`✅ Vínculo criado (${r.confidence}). Times: ${r.teams.join(", ") || "—"}`);
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
          typeof meta.official_source_url === "string" ? meta.official_source_url : prev.official_source_url,
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
      if (error) throw error;
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
      console.error("Erro ao gerar descrição:", err);
      toast.error(err?.message || "Falha ao gerar descrição");
    } finally {
      setGeneratingDesc(false);
    }
  }

  useEffect(() => {
    loadPartners();
    if (isEdit) {
      loadEvent();
    } else if (duplicateData) {
      const hasDateFromImport = eventouImportId && duplicateData.date_time;
      const isGenericDesc =
        !duplicateData.description ||
        duplicateData.description.startsWith("Plataforma segura e intuitiva") ||
        duplicateData.description.length < 10;

      setForm((prev) => ({
        ...prev,
        ...duplicateData,
        slug: slugify(duplicateData.title) + "-" + Date.now().toString(36),
        date_time: hasDateFromImport ? duplicateData.date_time : "",
        description: isGenericDesc ? "" : duplicateData.description,
        status: "draft",
        featured: false,
      }));
      if (duplicateData.partner_id) {
        setManualVenue(false);
      } else if (duplicateData.venue_name || duplicateData.address) {
        setManualVenue(true);
      }
      toast.info(
        hasDateFromImport
          ? "Dados importados! Revise e publique."
          : "Evento duplicado. Defina a nova data antes de publicar.",
      );

      if (eventouImportId && isGenericDesc) {
        generateDescription({
          title: duplicateData.title,
          venue_name: duplicateData.venue_name,
          address: (duplicateData as any).address,
          date_time: hasDateFromImport ? duplicateData.date_time : "",
          category: duplicateData.category,
          sub_category: (duplicateData as any).sub_category,
          partner_id: duplicateData.partner_id || undefined,
          time_is_unknown: Boolean((duplicateData as any).time_is_unknown),
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadPartners() {
    let query = supabase.from("partners").select("*").eq("active", true).order("name");
    if (cityFilter) query = query.eq("city", cityFilter);
    const { data } = await query;
    setPartners(data || []);
  }

  async function loadEvent() {
    const { data } = await supabase.from("events").select("*").eq("id", id!).single();
    if (!data) return;
    if (cityFilter && (data as any).city && (data as any).city !== cityFilter) {
      toast.error("Você não tem permissão para editar este evento.");
      navigate("/admin/eventos");
      return;
    }

    const localDateTime = isoToSpLocal(data.date_time);

    setForm({
      title: data.title,
      slug: data.slug,
      date_time: localDateTime,
      category: data.category,
      partner_id: data.partner_id || "",
      venue_name: data.venue_name || "",
      address: data.address || "",
      instagram: data.instagram || "",
      description: data.description || "",
      status: data.status,
      verification_source: data.verification_source || "",
      featured: data.featured,
      image_url: data.image_url || "",
      video_url: (data as any).video_url || "",
      ticket_url: (data as any).ticket_url || "",
      image_hash: (data as any).image_hash || "",
      opportunity_tags: (data as any).opportunity_tags || [],
      transport_reservation_enabled: Boolean((data as any).transport_reservation_enabled),
      time_is_unknown: Boolean((data as any).time_is_unknown),
      _sub: (data as any).sub_category || data.category,
      is_sports_transmission: Boolean((data as any).is_sports_transmission),
      sports_match_id: (data as any).sports_match_id || null,
      transmission_channel: (data as any).transmission_channel || null,
      transmission_url: (data as any).transmission_url || null,
      transmission_notes: (data as any).transmission_notes || null,
      short_summary: (data as any).short_summary || "",
      meta_title: (data as any).meta_title || "",
      meta_description: (data as any).meta_description || "",
      instagram_caption: (data as any).instagram_caption || "",
      ai_confidence_score:
        typeof (data as any).ai_confidence_score === "number" ? (data as any).ai_confidence_score : null,
      ai_warnings: Array.isArray((data as any).ai_warnings) ? (data as any).ai_warnings : [],
      flyer_text: "",
      artists: [],
      price: "",
      official_source_url: "",
    } as any);
    if (!data.partner_id && (data.venue_name || data.address)) setManualVenue(true);
    originalSnapshot.current = {
      category: data.category,
      sub_category: (data as any).sub_category || null,
      description: data.description || null,
      venue_name: data.venue_name || null,
    };
  }

  function handleChange(key: string, value: string | boolean) {
    setForm((prev) => {
      const next: any = { ...prev, [key]: value };
      if (key === "title" && typeof value === "string") {
        next.title = value.toUpperCase();
        if (!isEdit) next.slug = slugify(value);
      }
      return next;
    });
  }

  function handlePartnerSelect(partnerId: string) {
    if (partnerId) {
      const p = partners.find((p) => p.id === partnerId);
      if (p) {
        setForm((prev) => ({
          ...prev,
          partner_id: partnerId,
          venue_name: p.name,
          address: p.address || "",
          instagram: p.instagram || "",
        }));
        setManualVenue(false);
      }
    } else {
      handleChange("partner_id", "");
      setManualVenue(true);
    }
  }

  async function checkDuplicateEvent(next: Partial<EventoFormState>) {
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
    if (found) toast.warning("⚠️ Este evento já foi postado. Deseja editar o existente ou criar um duplicado?");
    return found;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
        const { error } = await supabase.from("events").update(payload).eq("id", id!);
        if (error) throw error;
        const orig = originalSnapshot.current;
        const newSub = (form as any)._sub || null;
        if (
          orig &&
          (orig.category !== form.category ||
            orig.sub_category !== newSub ||
            (orig.description || "") !== (form.description || ""))
        ) {
          await supabase.from("ai_event_feedback_memory" as any).insert({
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
        const { data: inserted, error } = await supabase
          .from("events")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;

        const eventId = inserted?.id;
        savedEventId = eventId;

        if (eventouImportId && eventId) {
          await supabase
            .from("eventou_imports")
            .update({ import_status: "approved", event_id: eventId })
            .eq("id", eventouImportId);

          const imageUrl = form.image_url || null;
          const caption = buildRoxouCaption(form);

          await supabase.from("content_generations").insert({
            type: "post",
            source_type: "event",
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
  }

  /** Handler do Instagram Import (mantido idêntico ao original). */
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

  function applyTransmission(t: TransmissionFields) {
    setForm((prev) => ({ ...prev, ...t }) as any);
  }

  return {
    // identifiers
    id,
    isEdit,
    navigate,
    // form state
    form,
    setForm,
    partners,
    manualVenue,
    setManualVenue,
    sections,
    setSections,
    igModalOpen,
    setIgModalOpen,
    suggestedPartner,
    setSuggestedPartner,
    duplicateCandidate,
    allowDuplicate,
    setAllowDuplicate,
    // flags
    saving,
    generatingDesc,
    reprocessing,
    reprocessingSports,
    deleteOpen,
    setDeleteOpen,
    deleting,
    // actions
    softDeleteEvent,
    reprocessSportsTransmission,
    reprocessFlyerWithAi,
    generateDescription,
    handleChange,
    handlePartnerSelect,
    checkDuplicateEvent,
    handleSubmit,
    handleInstagramImport,
    applyTransmission,
  };
}

export type UseEventoFormReturn = ReturnType<typeof useEventoForm>;

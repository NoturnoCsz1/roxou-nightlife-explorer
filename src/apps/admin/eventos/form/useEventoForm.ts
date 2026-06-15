import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { isoToSpLocal } from "@/lib/dateUtils";
import { emptyTransmission, type TransmissionFields } from "@/components/admin/TransmissionSection";
import { slugify } from "./helpers";
import { createEventoFormActions } from "./eventoFormActions";
import type { DuplicateCandidate, EventoFormState, Partner, SectionsState } from "./types";

/**
 * Hook orquestrador do EventoForm (Fase 3C1).
 *
 * ⚠️ Paridade total com `src/pages/admin/EventoForm.tsx` original.
 * Actions ficam em `eventoFormActions.ts`; aqui só state + ciclo de vida.
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

  /**
   * Recriamos `actions` a cada render para que toda função enxergue
   * sempre o `form`/`partners` mais recentes — comportamento idêntico ao
   * código original (closures por render).
   */
  const actions = createEventoFormActions({
    id,
    isEdit,
    cityFilter,
    navigate,
    eventouImportId,
    form,
    setForm,
    partners,
    originalSnapshot,
    duplicateCandidate,
    allowDuplicate,
    setDuplicateCandidate,
    setAllowDuplicate,
    setManualVenue,
    setSuggestedPartner,
    setSaving,
    setGeneratingDesc,
    setReprocessing,
    setReprocessingSports,
    setDeleting,
    setDeleteOpen,
  });

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
        actions.generateDescription({
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
        typeof (data as any).ai_confidence_score === "number"
          ? (data as any).ai_confidence_score
          : null,
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

  function applyTransmission(t: TransmissionFields) {
    setForm((prev) => ({ ...prev, ...t }) as any);
  }

  return {
    id,
    isEdit,
    navigate,
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
    saving,
    generatingDesc,
    reprocessing,
    reprocessingSports,
    deleteOpen,
    setDeleteOpen,
    deleting,
    // actions (delegadas)
    softDeleteEvent: actions.softDeleteEvent,
    reprocessSportsTransmission: actions.reprocessSportsTransmission,
    reprocessFlyerWithAi: actions.reprocessFlyerWithAi,
    generateDescription: actions.generateDescription,
    checkDuplicateEvent: actions.checkDuplicateEvent,
    handleSubmit: actions.handleSubmit,
    handleInstagramImport: actions.handleInstagramImport,
    // handlers locais
    handleChange,
    handlePartnerSelect,
    applyTransmission,
  };
}

export type UseEventoFormReturn = ReturnType<typeof useEventoForm>;

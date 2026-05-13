import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Save, ChevronDown, ChevronUp, Instagram, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import ImageUpload from "@/components/admin/ImageUpload";
import InstagramImportModal from "@/components/admin/InstagramImportModal";
import { ADMIN_MAIN_CATEGORIES, ADMIN_MUSICAL_SUBS, supportsGenre, getCategoryLabel } from "@/lib/categoryConfig";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { buildEventPayload } from "@/lib/adminEventPayload";
import { isoToSpLocal } from "@/lib/dateUtils";
import { analyzeAndLinkEventTransmission } from "@/lib/sportsTransmission";
import DateTimePickerSP from "@/components/admin/DateTimePickerSP";

type Partner = Tables<"partners">;

function buildRoxouCaption(form: { title: string; date_time: string; venue_name: string; category: string; description: string }): string {
  const dt = form.date_time ? new Date(form.date_time + (form.date_time.includes("T") ? "" : "T00:00") + (form.date_time.includes("-03") ? "" : "-03:00")) : null;
  const weekday = dt ? dt.toLocaleDateString("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" }) : "";
  const date = dt ? dt.toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }) : "";
  const time = dt ? dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : "";
  const catLabel = getCategoryLabel(form.category);

  const lines: (string | false)[] = [
    `🔥 ${form.title.toUpperCase()}`,
    "",
    dt && `📅 ${weekday}, ${date}`,
    time && time !== "00:00" && `🕐 ${time}`,
    form.venue_name && `📍 ${form.venue_name}`,
    catLabel && `🎵 ${catLabel}`,
    "",
    form.description ? form.description.slice(0, 150).trim() + (form.description.length > 150 ? "…" : "") : false,
    form.description ? "" : false,
    "👉 Mais detalhes no Roxou — link na bio!",
    "",
    "#roxou #eventos #presidenteprudente #rolepp #balada",
  ];

  return lines.filter((l) => l !== false).join("\n");
}

function slugify(str: string) {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const EventoForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isCityEditor, cityFilter } = useAdminProfile();
  const duplicateData = (location.state as any)?.duplicate;
  const eventouImportId = (location.state as any)?.eventou_import_id;
  const isEdit = !!id;
  const [saving, setSaving] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessingSports, setReprocessingSports] = useState(false);
  const originalSnapshot = useRef<{ category: string; sub_category: string | null; description: string | null; venue_name: string | null } | null>(null);

  async function reprocessSportsTransmission() {
    if (!id) {
      toast.error("Salve o evento antes de reprocessar.");
      return;
    }
    setReprocessingSports(true);
    try {
      const text = [form.title, form.description, form.venue_name, (form as any)._sub, form.category]
        .filter(Boolean).join(" \n ");
      const refDate = form.date_time ? new Date(`${form.date_time}:00-03:00`) : null;
      const r = await analyzeAndLinkEventTransmission({
        eventId: id,
        text,
        partnerId: form.partner_id || null,
        referenceDate: refDate,
        source: "manual_reprocess",
      });
      if (r.linked) toast.success(`✅ Vínculo criado (${r.confidence}). Times: ${r.teams.join(", ") || "—"}`);
      else if (r.detected && r.matched_match_id) toast.message(`Jogo encontrado, mas confiança ${r.confidence}. Revise em /admin/jogos.`);
      else if (r.detected) toast.message(`Transmissão detectada (${r.teams.join(", ") || "sem times"}), sem jogo correspondente em sports_matches.`);
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
      // Date fallback: keep existing if AI uncertain; default time to 20:00
      let nextDateTime = form.date_time;
      if (meta.date) {
        const time = meta.time && /^\d{2}:\d{2}$/.test(meta.time) ? meta.time : "20:00";
        nextDateTime = `${meta.date}T${time}`;
      }
      setForm((prev) => ({
        ...prev,
        title: meta.title ? String(meta.title).toUpperCase() : prev.title,
        date_time: nextDateTime,
        venue_name: meta.venue_name || prev.venue_name,
        category: meta.category || prev.category,
        ...(meta.sub_category ? { _sub: meta.sub_category } : {}),
      } as any));
      toast.success("Flyer re-processado pela IA. Revise os campos antes de salvar.");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao re-processar com IA");
    } finally {
      setReprocessing(false);
    }
  }

  async function generateDescription(info: { title: string; venue_name?: string; address?: string; date_time?: string; category?: string; sub_category?: string; partner_id?: string; image_url?: string }) {
    setGeneratingDesc(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-description", {
        body: info,
      });
      if (error) throw error;
      const rich = data?.descricao_rica || data?.description;
      const chamada = data?.chamada_site as string | undefined;
      if (rich) {
        setForm((prev) => ({
          ...prev,
          description: prev.description || rich,
          // Sugere a chamada como título apenas se ainda estiver vazio
          title: prev.title || chamada || prev.title,
        }));
        if (chamada) {
          toast.success(`Copy gerada! Chamada sugerida: "${chamada}"`);
        } else {
          toast.success("Descrição gerada automaticamente!");
        }
      }
    } catch (err: any) {
      console.error("Erro ao gerar descrição:", err);
    } finally {
      setGeneratingDesc(false);
    }
  }
  const [partners, setPartners] = useState<Partner[]>([]);
  const [manualVenue, setManualVenue] = useState(false);
  const [sections, setSections] = useState({ venue: true, content: true, media: true });
  const [igModalOpen, setIgModalOpen] = useState(false);
  const [suggestedPartner, setSuggestedPartner] = useState<Partner | null>(null);
  const [duplicateCandidate, setDuplicateCandidate] = useState<{ id: string; title: string; slug: string; date_time: string; venue_name: string | null } | null>(null);
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  const [form, setForm] = useState({
    title: "", slug: "", date_time: "", category: "festa", partner_id: "",
    venue_name: "", address: "", instagram: "", description: "",
    status: "draft", verification_source: "Instagram", featured: false, image_url: "",
    video_url: "",
    ticket_url: "", image_hash: "", opportunity_tags: [] as string[],
  });

  useEffect(() => {
    loadPartners();
    if (isEdit) {
      loadEvent();
    } else if (duplicateData) {
      const hasDateFromImport = eventouImportId && duplicateData.date_time;
      const isGenericDesc = !duplicateData.description || 
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
      toast.info(hasDateFromImport ? "Dados importados! Revise e publique." : "Evento duplicado. Defina a nova data antes de publicar.");

      // Auto-generate description for Eventou imports with missing/generic descriptions
      if (eventouImportId && isGenericDesc) {
        generateDescription({
          title: duplicateData.title,
          venue_name: duplicateData.venue_name,
          address: (duplicateData as any).address,
          date_time: hasDateFromImport ? duplicateData.date_time : "",
          category: duplicateData.category,
          sub_category: (duplicateData as any).sub_category,
          partner_id: duplicateData.partner_id || undefined,
        });
      }
    }
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
      title: data.title, slug: data.slug,
      date_time: localDateTime,
      category: data.category, partner_id: data.partner_id || "",
      venue_name: data.venue_name || "", address: data.address || "",
      instagram: data.instagram || "", description: data.description || "",
      status: data.status, verification_source: data.verification_source || "",
      featured: data.featured, image_url: data.image_url || "",
      video_url: (data as any).video_url || "",
      ticket_url: (data as any).ticket_url || "",
      image_hash: (data as any).image_hash || "",
      opportunity_tags: (data as any).opportunity_tags || [],
      _sub: (data as any).sub_category || data.category,
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
        setForm((prev) => ({ ...prev, partner_id: partnerId, venue_name: p.name, address: p.address || "", instagram: p.instagram || "" }));
        setManualVenue(false);
      }
    } else {
      handleChange("partner_id", "");
      setManualVenue(true);
    }
  }

  async function checkDuplicateEvent(next: Partial<typeof form>) {
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
    const payload = buildEventPayload(form as any, { city: cityFilter });

    try {
      let savedEventId: string | undefined = id || undefined;
      if (isEdit) {
        const { error } = await supabase.from("events").update(payload).eq("id", id!);
        if (error) throw error;
        // 🎓 Salva memória de aprendizado se admin corrigiu categoria/gênero/descrição
        const orig = originalSnapshot.current;
        const newSub = (form as any)._sub || null;
        if (orig && (orig.category !== form.category || orig.sub_category !== newSub || (orig.description || "") !== (form.description || ""))) {
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
        const { data: inserted, error } = await supabase.from("events").insert(payload).select("id").single();
        if (error) throw error;

        const eventId = inserted?.id;
        savedEventId = eventId;

        // If from Eventou import, mark as approved and auto-create ROXOU post
        if (eventouImportId && eventId) {
          await supabase
            .from("eventou_imports")
            .update({ import_status: "approved", event_id: eventId })
            .eq("id", eventouImportId);

          // Auto-create content generation with imported image
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

      // 🏟️ Detecta transmissão de futebol e tenta vincular bar ao jogo
      if (savedEventId) {
        try {
          const text = [form.title, form.description, form.venue_name, (form as any)._sub, form.category]
            .filter(Boolean).join(" \n ");
          const refDate = form.date_time ? new Date(`${form.date_time}:00-03:00`) : null;
          const r = await analyzeAndLinkEventTransmission({
            eventId: savedEventId,
            text,
            partnerId: form.partner_id || null,
            referenceDate: refDate,
            source: "manual",
          });
          if (r.linked) toast.success(`Transmissão vinculada ao jogo (${r.confidence}).`);
          else if (r.detected && r.confidence !== "high") toast.message("Possível transmissão detectada — revisar em /admin/jogos.");
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

  const inputClass = "w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 transition";
  const sectionHeader = (key: keyof typeof sections, label: string) => (
    <button type="button" onClick={() => setSections((s) => ({ ...s, [key]: !s[key] }))} className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground uppercase tracking-wide py-1.5 border-b border-border/30">
      {label}
      {sections[key] ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
    </button>
  );

  return (
    <div className="md:ml-44 max-w-5xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </button>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-foreground">{isEdit ? "Editar Evento" : "Novo Evento"}</h1>
        {!isEdit && (
          <button
            type="button"
            onClick={() => setIgModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition"
          >
            <Instagram className="h-3.5 w-3.5" />
            Importar do Instagram
          </button>
        )}
        {isEdit && form.image_url && (
          <button
            type="button"
            onClick={reprocessFlyerWithAi}
            disabled={reprocessing}
            className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition disabled:opacity-50"
            title="Pedir para a IA reler o flyer (mantém 20:00 como fallback)"
          >
            {reprocessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {reprocessing ? "Re-processando..." : "Re-processar com IA"}
          </button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        <div className="space-y-2.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border/30 pb-1">Informações Principais</p>
          {form.opportunity_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {form.opportunity_tags.map((tag) => (
                <span key={tag} className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[10px] font-black uppercase text-accent">Oportunidade · {tag.replace("_", " ")}</span>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <label className="text-[11px] font-medium text-muted-foreground">Título *</label>
              <input
                className={`${inputClass} uppercase`}
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Qual o nome da fera?"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Slug</label>
              <input className={inputClass} value={form.slug} onChange={(e) => handleChange("slug", e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Data e Hora *</label>
              <DateTimePickerSP value={form.date_time} onChange={(v) => handleChange("date_time", v)} />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Categoria</label>
              <select
                className={`${inputClass} border-primary/40 bg-background/60 focus:border-primary/70 focus:ring-1 focus:ring-primary/30`}
                value={form.category}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((prev) => {
                    const next: any = { ...prev, category: value };
                    if (!supportsGenre(value)) next._sub = null;
                    return next;
                  });
                }}
              >
                {ADMIN_MAIN_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            {supportsGenre(form.category) && (
              <div className="animate-fade-in">
                <label className="text-[11px] font-medium text-muted-foreground">Gênero musical</label>
                <select
                  className={`${inputClass} border-primary/40 bg-background/60 focus:border-primary/70 focus:ring-1 focus:ring-primary/30`}
                  value={(form as any)._sub || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, _sub: e.target.value || null } as any))}
                >
                  <option value="">— Sem gênero —</option>
                  {ADMIN_MUSICAL_SUBS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}
            <div className={supportsGenre(form.category) ? "col-span-2" : ""}>
              <label className="text-[11px] font-medium text-muted-foreground">Parceiro</label>
              <select className={inputClass} value={form.partner_id} onChange={(e) => handlePartnerSelect(e.target.value)}>
                <option value="">— Sem parceiro —</option>
                {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {sectionHeader("venue", "Informações do Local")}
          {sections.venue && (
            <>
              {suggestedPartner && !form.partner_id && (
                <div className="flex items-center justify-between rounded-lg bg-primary/10 border border-primary/20 p-2.5 text-xs">
                  <p className="text-muted-foreground">
                    Possível parceiro encontrado: <strong className="text-foreground">{suggestedPartner.name}</strong>
                  </p>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        handlePartnerSelect(suggestedPartner.id);
                        setSuggestedPartner(null);
                      }}
                      className="rounded-md bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground hover:bg-primary/90 transition"
                    >
                      Vincular
                    </button>
                    <button
                      type="button"
                      onClick={() => setSuggestedPartner(null)}
                      className="rounded-md bg-secondary/50 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-secondary transition"
                    >
                      Ignorar
                    </button>
                  </div>
                </div>
              )}

              {form.partner_id && !manualVenue ? (
                <div className="rounded-lg bg-secondary/30 p-2.5 text-xs">
                  <p className="text-muted-foreground mb-1">Preenchido pelo parceiro: <strong className="text-foreground">{form.venue_name}</strong></p>
                  <button type="button" onClick={() => setManualVenue(true)} className="text-primary text-[11px] font-medium hover:underline">Editar local manualmente</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Nome do local</label>
                    <input className={inputClass} value={form.venue_name} onChange={(e) => handleChange("venue_name", e.target.value)} />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Instagram</label>
                    <input className={inputClass} value={form.instagram} onChange={(e) => handleChange("instagram", e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] font-medium text-muted-foreground">Endereço</label>
                    <input className={inputClass} value={form.address} onChange={(e) => handleChange("address", e.target.value)} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-2.5">
          {sectionHeader("content", "Conteúdo do Evento")}
          {sections.content && (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-muted-foreground">Descrição</label>
                  <button
                    type="button"
                    disabled={generatingDesc || !form.title}
                    onClick={() => generateDescription({
                      title: form.title,
                      venue_name: form.venue_name,
                      address: form.address,
                      date_time: form.date_time,
                      category: form.category,
                      sub_category: (form as any)._sub,
                      partner_id: form.partner_id || undefined,
                    })}
                    className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:text-primary/80 transition disabled:opacity-50"
                  >
                    {generatingDesc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {generatingDesc ? "Injetando hype..." : "✨ Gerar Hype"}
                  </button>
                </div>
                <textarea className={`${inputClass} min-h-[60px]`} value={form.description} onChange={(e) => handleChange("description", e.target.value)} placeholder={generatingDesc ? "Injetando hype..." : "Aguardando o toque da IA..."} />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Status</label>
                <select className={inputClass} value={form.status} onChange={(e) => handleChange("status", e.target.value)}>
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Fonte de verificação</label>
                <input className={inputClass} value={form.verification_source} onChange={(e) => handleChange("verification_source", e.target.value)} placeholder="Instagram, site..." />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] font-medium text-muted-foreground">Link de ingresso / reserva (opcional)</label>
                <input className={inputClass} value={form.ticket_url} onChange={(e) => handleChange("ticket_url", e.target.value)} placeholder="https://... ou link WhatsApp" />
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={form.featured} onChange={(e) => handleChange("featured", e.target.checked)} className="accent-primary" />
                  Evento em destaque
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2.5">
          {sectionHeader("media", "Mídia")}
          {sections.media && (
            <div className="space-y-2.5">
              <ImageUpload
                folder="events"
                currentUrl={form.image_url}
                onUploaded={(url, imageHash) => {
                  setForm((prev) => ({ ...prev, image_url: url, image_hash: imageHash || prev.image_hash }));
                  if (imageHash) checkDuplicateEvent({ image_url: url, image_hash: imageHash });
                }}
                label="Flyer do Evento"
              />
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  🎬 Vídeo POV (opcional · MP4 público) <span className="text-[10px] font-normal normal-case text-muted-foreground/70">— usado no card "Destaque da Semana"</span>
                </label>
                <input
                  type="url"
                  value={form.video_url || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, video_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-border/40 bg-background/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none"
                />
              </div>
              {duplicateCandidate && (
                <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-3 text-xs text-yellow-100 space-y-2">
                  <p className="font-bold flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> ⚠️ Este evento já foi postado.</p>
                  <p className="text-muted-foreground">{duplicateCandidate.title} • {duplicateCandidate.venue_name || "Sem local"}</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => navigate(`/admin/eventos/${duplicateCandidate.id}`)} className="rounded-lg bg-primary px-3 py-1.5 text-[10px] font-bold text-primary-foreground">Editar existente</button>
                    <button type="button" onClick={() => setAllowDuplicate(true)} className="rounded-lg bg-secondary px-3 py-1.5 text-[10px] font-bold text-secondary-foreground">Criar duplicado</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <button type="submit" disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50">
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </form>

      <aside className="hidden lg:block">
        <div className="sticky top-20 rounded-2xl border border-primary/20 bg-card/80 p-3 shadow-[0_0_24px_hsl(var(--primary)/0.12)] backdrop-blur-xl">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-primary">Sticky Preview</p>
          <div className="overflow-hidden rounded-xl border border-border/40 bg-background/50">
            {form.image_url ? (
              <img src={form.image_url} alt={form.title || "Flyer do evento"} className="aspect-[4/5] w-full object-cover" />
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center text-xs text-muted-foreground">Sem flyer</div>
            )}
          </div>
          <h2 className="mt-3 line-clamp-2 font-display text-sm font-black text-foreground">{form.title || "Evento sem título"}</h2>
          <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{form.venue_name || "Local não informado"}</p>
        </div>
      </aside>
      </div>

      <InstagramImportModal
        open={igModalOpen}
        onClose={() => setIgModalOpen(false)}
        onImport={(data) => {
          const dateTime = data.date && data.time ? `${data.date}T${data.time}` : data.date ? `${data.date}T22:00` : "";

          let autoLinked: Partner | undefined;
          let suggested: Partner | undefined;

          if (data.instagram) {
            const igNorm = data.instagram.replace(/^@/, "").toLowerCase();
            autoLinked = partners.find(
              (p) => p.instagram && p.instagram.replace(/^@/, "").toLowerCase() === igNorm
            );
          }

          if (!autoLinked && data.venue_name) {
            const vnNorm = data.venue_name.toLowerCase().trim();
            const exactMatch = partners.find((p) => p.name.toLowerCase().trim() === vnNorm);
            if (exactMatch) {
              autoLinked = exactMatch;
            } else {
              const similarMatches = partners.filter(
                (p) => vnNorm.includes(p.name.toLowerCase().trim()) || p.name.toLowerCase().trim().includes(vnNorm)
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
        }}
      />
    </div>
  );
};

export default EventoForm;

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import ImageUpload from "@/components/admin/ImageUpload";

type Partner = Tables<"partners">;

function slugify(str: string) {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const CATEGORIES = ["balada", "show", "bar", "festival", "sertanejo", "funk", "eletronica", "festa"];

const EventoForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [saving, setSaving] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [manualVenue, setManualVenue] = useState(false);
  const [sections, setSections] = useState({ venue: true, content: true, media: true });

  const [form, setForm] = useState({
    title: "", slug: "", date_time: "", category: "festa", partner_id: "",
    venue_name: "", address: "", instagram: "", description: "",
    status: "draft", verification_source: "", featured: false, image_url: "",
  });

  useEffect(() => { loadPartners(); if (isEdit) loadEvent(); }, [id]);

  async function loadPartners() {
    const { data } = await supabase.from("partners").select("*").eq("active", true).order("name");
    setPartners(data || []);
  }

  async function loadEvent() {
    const { data } = await supabase.from("events").select("*").eq("id", id!).single();
    if (data) {
      setForm({
        title: data.title, slug: data.slug,
        date_time: data.date_time ? data.date_time.slice(0, 16) : "",
        category: data.category, partner_id: data.partner_id || "",
        venue_name: data.venue_name || "", address: data.address || "",
        instagram: data.instagram || "", description: data.description || "",
        status: data.status, verification_source: data.verification_source || "",
        featured: data.featured, image_url: data.image_url || "",
      });
      if (!data.partner_id && (data.venue_name || data.address)) setManualVenue(true);
    }
  }

  function handleChange(key: string, value: string | boolean) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "title" && !isEdit) next.slug = slugify(value as string);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.slug || !form.date_time) { toast.error("Título, slug e data são obrigatórios"); return; }
    setSaving(true);
    const payload = { ...form, partner_id: form.partner_id || null };
    try {
      if (isEdit) {
        const { error } = await supabase.from("events").update(payload).eq("id", id!);
        if (error) throw error;
        toast.success("Evento atualizado!");
      } else {
        const { error } = await supabase.from("events").insert(payload);
        if (error) throw error;
        toast.success("Evento criado!");
      }
      navigate("/admin/eventos");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally { setSaving(false); }
  }

  const inputClass = "w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 transition";
  const sectionHeader = (key: keyof typeof sections, label: string) => (
    <button type="button" onClick={() => setSections((s) => ({ ...s, [key]: !s[key] }))} className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground uppercase tracking-wide py-1.5 border-b border-border/30">
      {label}
      {sections[key] ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
    </button>
  );

  return (
    <div className="md:ml-44 max-w-xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </button>
      <h1 className="text-lg font-bold text-foreground mb-4">{isEdit ? "Editar Evento" : "Novo Evento"}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Main info */}
        <div className="space-y-2.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border/30 pb-1">Informações Principais</p>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <label className="text-[11px] font-medium text-muted-foreground">Título *</label>
              <input className={inputClass} value={form.title} onChange={(e) => handleChange("title", e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Slug</label>
              <input className={inputClass} value={form.slug} onChange={(e) => handleChange("slug", e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Data e Hora *</label>
              <input type="datetime-local" className={inputClass} value={form.date_time} onChange={(e) => handleChange("date_time", e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Categoria</label>
              <select className={inputClass} value={form.category} onChange={(e) => handleChange("category", e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Parceiro</label>
              <select className={inputClass} value={form.partner_id} onChange={(e) => handlePartnerSelect(e.target.value)}>
                <option value="">— Sem parceiro —</option>
                {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Venue */}
        <div className="space-y-2.5">
          {sectionHeader("venue", "Informações do Local")}
          {sections.venue && (
            <>
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

        {/* Content */}
        <div className="space-y-2.5">
          {sectionHeader("content", "Conteúdo do Evento")}
          {sections.content && (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="col-span-2">
                <label className="text-[11px] font-medium text-muted-foreground">Descrição</label>
                <textarea className={`${inputClass} min-h-[60px]`} value={form.description} onChange={(e) => handleChange("description", e.target.value)} />
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
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={form.featured} onChange={(e) => handleChange("featured", e.target.checked)} className="accent-primary" />
                  Evento em destaque
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Media */}
        <div className="space-y-2.5">
          {sectionHeader("media", "Mídia")}
          {sections.media && (
            <ImageUpload
              folder="events"
              currentUrl={form.image_url}
              onUploaded={(url) => handleChange("image_url", url)}
              label="Flyer do Evento"
            />
          )}
        </div>

        <button type="submit" disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50">
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </div>
  );
};

export default EventoForm;

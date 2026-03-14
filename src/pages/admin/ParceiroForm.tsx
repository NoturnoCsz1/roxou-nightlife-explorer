import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ImageUpload from "@/components/admin/ImageUpload";
import { ADMIN_PARTNER_TYPE_OPTIONS } from "@/lib/categoryConfig";

const ParceiroForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", slug: "", type: "bar", address: "",
    city: "Presidente Prudente", instagram: "", whatsapp: "",
    short_description: "", full_description: "", logo_url: "",
    verified_partner: false, active: true,
  });

  useEffect(() => { if (isEdit) loadPartner(); }, [id]);

  async function loadPartner() {
    const { data } = await supabase.from("partners").select("*").eq("id", id!).single();
    if (data) setForm({
      name: data.name, slug: data.slug, type: data.type,
      address: data.address || "",
      city: data.city, instagram: data.instagram || "", whatsapp: data.whatsapp || "",
      short_description: data.short_description || "", full_description: data.full_description || "",
      logo_url: data.logo_url || "", verified_partner: data.verified_partner, active: data.active,
    });
  }

  function handleChange(key: string, value: string | boolean) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && !isEdit) next.slug = slugify(value as string);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.slug) { toast.error("Nome e slug são obrigatórios"); return; }
    setSaving(true);
    try {
      if (isEdit) {
        const { error } = await supabase.from("partners").update(form).eq("id", id!);
        if (error) throw error;
        toast.success("Parceiro atualizado!");
      } else {
        const { error } = await supabase.from("partners").insert(form);
        if (error) throw error;
        toast.success("Parceiro criado!");
      }
      navigate("/admin/parceiros");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally { setSaving(false); }
  }

  const inputClass = "w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 transition";

  return (
    <div className="md:ml-44 max-w-xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </button>
      <h1 className="text-lg font-bold text-foreground mb-4">{isEdit ? "Editar Parceiro" : "Novo Parceiro"}</h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="col-span-2 sm:col-span-1">
            <label className="text-[11px] font-medium text-muted-foreground">Nome *</label>
            <input className={inputClass} value={form.name} onChange={(e) => handleChange("name", e.target.value)} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="text-[11px] font-medium text-muted-foreground">Slug</label>
            <input className={inputClass} value={form.slug} onChange={(e) => handleChange("slug", e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Tipo</label>
            <select className={inputClass} value={form.type} onChange={(e) => handleChange("type", e.target.value)}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-[11px] font-medium text-muted-foreground">Endereço</label>
            <input className={inputClass} value={form.address} onChange={(e) => handleChange("address", e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Cidade</label>
            <input className={inputClass} value={form.city} onChange={(e) => handleChange("city", e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Instagram</label>
            <input className={inputClass} value={form.instagram} onChange={(e) => handleChange("instagram", e.target.value)} placeholder="@handle" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">WhatsApp</label>
            <input className={inputClass} value={form.whatsapp} onChange={(e) => handleChange("whatsapp", e.target.value)} />
          </div>
          <div className="col-span-2">
            <ImageUpload
              folder="partners"
              currentUrl={form.logo_url}
              onUploaded={(url) => handleChange("logo_url", url)}
              label="Logo do Parceiro"
            />
          </div>
          <div className="col-span-2">
            <label className="text-[11px] font-medium text-muted-foreground">Descrição curta</label>
            <input className={inputClass} value={form.short_description} onChange={(e) => handleChange("short_description", e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="text-[11px] font-medium text-muted-foreground">Descrição completa</label>
            <textarea className={`${inputClass} min-h-[60px]`} value={form.full_description} onChange={(e) => handleChange("full_description", e.target.value)} />
          </div>
        </div>

        <div className="flex items-center gap-4 pt-1">
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={form.verified_partner} onChange={(e) => handleChange("verified_partner", e.target.checked)} className="accent-primary" />
            Verificado
          </label>
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={form.active} onChange={(e) => handleChange("active", e.target.checked)} className="accent-primary" />
            Ativo
          </label>
        </div>

        <button type="submit" disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50">
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </div>
  );
};

export default ParceiroForm;

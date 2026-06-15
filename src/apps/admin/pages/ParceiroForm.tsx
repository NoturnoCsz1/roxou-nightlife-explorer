/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps -- preservado do original (Fase 6D) */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Building2, Music2, Trophy, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ImageUpload from "@/components/admin/ImageUpload";
import PartnerInstagramAura from "@/components/admin/PartnerInstagramAura";
import {
  ADMIN_PARTNER_TYPE_OPTIONS,
  PARTNER_MUSIC_STYLES,
  SPORTS_COMPETITIONS,
} from "@/lib/categoryConfig";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { normalizeInstagramHandle, validateInstagramHandle } from "@/lib/instagramHandle";

function slugify(str: string) {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const MAX_SECONDARY_STYLES = 2;

const ParceiroForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isCityEditor, cityFilter } = useAdminProfile();
  const isEdit = !!id;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", slug: "", type: "bar", address: "",
    city: cityFilter || "Presidente Prudente", instagram: "", whatsapp: "",
    short_description: "", full_description: "", logo_url: "",
    verified_partner: false, active: true, featured_home: false, supports_sports: false,
    music_style_primary: "" as string,
    music_styles_secondary: [] as string[],
    sports_competitions: [] as string[],
  });

  useEffect(() => { if (isEdit) loadPartner(); }, [id]);

  async function loadPartner() {
    const { data } = await supabase.from("partners").select("*").eq("id", id!).single();
    if (!data) return;
    if (cityFilter && data.city !== cityFilter) {
      toast.error("Você não tem permissão para editar este parceiro.");
      navigate("/admin/parceiros");
      return;
    }
    setForm({
      name: data.name, slug: data.slug, type: data.type,
      address: data.address || "",
      city: data.city, instagram: data.instagram || "", whatsapp: data.whatsapp || "",
      short_description: data.short_description || "", full_description: data.full_description || "",
      logo_url: data.logo_url || "", verified_partner: data.verified_partner, active: data.active,
      featured_home: (data as any).featured_home ?? false,
      supports_sports: (data as any).supports_sports ?? false,
      music_style_primary: (data as any).music_style_primary ?? "",
      music_styles_secondary: Array.isArray((data as any).music_styles_secondary)
        ? (data as any).music_styles_secondary
        : [],
      sports_competitions: Array.isArray((data as any).sports_competitions)
        ? (data as any).sports_competitions
        : [],
    });
  }

  function handleChange(key: string, value: string | boolean | string[]) {
    setForm((prev) => {
      const next: any = { ...prev, [key]: value };
      if (key === "name" && !isEdit) next.slug = slugify(value as string);
      return next;
    });
  }

  function toggleSecondaryStyle(value: string) {
    setForm((prev) => {
      const exists = prev.music_styles_secondary.includes(value);
      if (exists) {
        return { ...prev, music_styles_secondary: prev.music_styles_secondary.filter((v) => v !== value) };
      }
      if (prev.music_styles_secondary.length >= MAX_SECONDARY_STYLES) {
        toast.error(`Máximo de ${MAX_SECONDARY_STYLES} estilos secundários.`);
        return prev;
      }
      if (prev.music_style_primary === value) {
        toast.error("Esse estilo já é o principal.");
        return prev;
      }
      return { ...prev, music_styles_secondary: [...prev.music_styles_secondary, value] };
    });
  }

  function toggleCompetition(value: string) {
    setForm((prev) => {
      const exists = prev.sports_competitions.includes(value);
      return {
        ...prev,
        sports_competitions: exists
          ? prev.sports_competitions.filter((v) => v !== value)
          : [...prev.sports_competitions, value],
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.slug) { toast.error("Nome e slug são obrigatórios"); return; }

    const igCheck = validateInstagramHandle(form.instagram);
    if (!igCheck.ok) {
      toast.error(igCheck.error || "Instagram inválido");
      return;
    }

    // Garante consistência: principal não pode estar nos secundários
    const cleanedSecondary = form.music_styles_secondary
      .filter((v) => v && v !== form.music_style_primary)
      .slice(0, MAX_SECONDARY_STYLES);

    const payload = {
      ...form,
      instagram: igCheck.handle,
      music_style_primary: form.music_style_primary || null,
      music_styles_secondary: cleanedSecondary,
      sports_competitions: form.supports_sports ? form.sports_competitions : [],
    };

    setSaving(true);
    try {
      if (isEdit) {
        const { error } = await supabase.from("partners").update(payload).eq("id", id!);
        if (error) throw error;
        toast.success("Parceiro atualizado!");
      } else {
        const { error } = await supabase.from("partners").insert(payload);
        if (error) throw error;
        toast.success("Parceiro criado!");
      }
      navigate("/admin/parceiros");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally { setSaving(false); }
  }

  const inputClass = "w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 transition";
  const cardClass = "rounded-xl border border-border/50 bg-card/50 backdrop-blur p-4 space-y-3";
  const cardHeaderClass = "flex items-center gap-2 text-sm font-semibold text-foreground";

  // Estilos disponíveis para o secundário = todos menos o principal
  const availableSecondary = PARTNER_MUSIC_STYLES.filter(
    (s) => s.value !== form.music_style_primary,
  );

  return (
    <div className="md:ml-44 max-w-2xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </button>
      <h1 className="text-lg font-bold text-foreground mb-4">{isEdit ? "Editar Parceiro" : "Novo Parceiro"}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 🏢 Informações do Local */}
        <section className={cardClass}>
          <h2 className={cardHeaderClass}>
            <Building2 className="h-4 w-4 text-primary" /> Informações do Local
          </h2>

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
              <label className="text-[11px] font-medium text-muted-foreground">Categoria principal</label>
              <select className={inputClass} value={form.type} onChange={(e) => handleChange("type", e.target.value)}>
                {ADMIN_PARTNER_TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                {/* Garante que valores legados não sumam visualmente */}
                {!ADMIN_PARTNER_TYPE_OPTIONS.some((t) => t.value === form.type) && form.type && (
                  <option value={form.type}>{form.type} (legado)</option>
                )}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Cidade</label>
              <input className={inputClass} value={form.city} onChange={(e) => handleChange("city", e.target.value)} disabled={isCityEditor} />
              {isCityEditor && <p className="text-[10px] text-muted-foreground mt-0.5">Cidade definida pelo seu perfil</p>}
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-medium text-muted-foreground">Endereço</label>
              <input className={inputClass} value={form.address} onChange={(e) => handleChange("address", e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Instagram</label>
              <input
                className={inputClass}
                value={form.instagram}
                onChange={(e) => handleChange("instagram", e.target.value)}
                onBlur={(e) => {
                  const h = normalizeInstagramHandle(e.target.value);
                  if (h !== form.instagram) handleChange("instagram", h);
                }}
                placeholder="@handle ou link do perfil"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Aceita @usuario, usuario ou instagram.com/usuario — salvo limpo.
              </p>
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

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
            <label className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" checked={form.verified_partner} onChange={(e) => handleChange("verified_partner", e.target.checked)} className="accent-primary" />
              Verificado
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" checked={form.active} onChange={(e) => handleChange("active", e.target.checked)} className="accent-primary" />
              Ativo
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" checked={form.featured_home} onChange={(e) => handleChange("featured_home", e.target.checked)} className="accent-primary" />
              ⭐ Destaque na Home
            </label>
          </div>
        </section>

        {/* 🎵 Identidade Musical */}
        <section className={cardClass}>
          <h2 className={cardHeaderClass}>
            <Music2 className="h-4 w-4 text-primary" /> Identidade Musical
          </h2>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Estilo musical principal</label>
            <select
              className={inputClass}
              value={form.music_style_primary}
              onChange={(e) => {
                const v = e.target.value;
                // Se virar principal, remove dos secundários
                setForm((prev) => ({
                  ...prev,
                  music_style_primary: v,
                  music_styles_secondary: prev.music_styles_secondary.filter((s) => s !== v),
                }));
              }}
            >
              <option value="">— Nenhum —</option>
              {PARTNER_MUSIC_STYLES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-muted-foreground">
                Estilos secundários (máx. {MAX_SECONDARY_STYLES})
              </label>
              <span className="text-[10px] text-muted-foreground">
                {form.music_styles_secondary.length}/{MAX_SECONDARY_STYLES}
              </span>
            </div>

            {form.music_styles_secondary.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {form.music_styles_secondary.map((v) => {
                  const meta = PARTNER_MUSIC_STYLES.find((s) => s.value === v);
                  return (
                    <span
                      key={v}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary border border-primary/30 px-2 py-0.5 text-[11px]"
                    >
                      {meta?.label ?? v}
                      <button
                        type="button"
                        onClick={() => toggleSecondaryStyle(v)}
                        className="hover:opacity-70"
                        aria-label={`Remover ${meta?.label ?? v}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 mt-2">
              {availableSecondary.map((s) => {
                const selected = form.music_styles_secondary.includes(s.value);
                const disabled =
                  !selected && form.music_styles_secondary.length >= MAX_SECONDARY_STYLES;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => toggleSecondaryStyle(s.value)}
                    disabled={disabled}
                    className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ⚽ Futebol e Transmissões */}
        <section className={cardClass}>
          <h2 className={cardHeaderClass}>
            <Trophy className="h-4 w-4 text-primary" /> Futebol e Transmissões
          </h2>

          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={form.supports_sports}
              onChange={(e) => handleChange("supports_sports", e.target.checked)}
              className="accent-primary"
            />
            ⚽ Este local transmite futebol
          </label>

          {form.supports_sports && (
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">
                Competições transmitidas
              </label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {SPORTS_COMPETITIONS.map((c) => {
                  const selected = form.sports_competitions.includes(c.value);
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => toggleCompetition(c.value)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {selected ? "☑ " : ""}{c.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <button type="submit" disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50">
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </form>

      {isEdit && id && (
        <div className="mt-5">
          <PartnerInstagramAura partnerId={id} onApplied={loadPartner} />
        </div>
      )}
    </div>
  );
};

export default ParceiroForm;

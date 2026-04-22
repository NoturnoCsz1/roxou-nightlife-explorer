import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2, Sparkles, Loader2, Eye, Code2 } from "lucide-react";
import * as DOMPurifyNS from "dompurify";
const DOMPurify: any = (DOMPurifyNS as any).default ?? DOMPurifyNS;
import type { Tables } from "@/integrations/supabase/types";
import ImageUpload from "@/components/admin/ImageUpload";
import { ADMIN_MAIN_CATEGORIES, ADMIN_MUSICAL_SUBS, supportsGenre } from "@/lib/categoryConfig";

type Partner = Tables<"partners">;

export type EventFormData = {
  title: string;
  slug: string;
  date_time: string;
  category: string;
  partner_id: string;
  venue_name: string;
  address: string;
  instagram: string;
  description: string;
  status: string;
  verification_source: string;
  featured: boolean;
  image_url: string;
  ticket_url: string;
};

export const emptyEventForm = (): EventFormData => ({
  title: "", slug: "", date_time: "", category: "festa", partner_id: "",
  venue_name: "", address: "", instagram: "", description: "",
  status: "draft", verification_source: "instagram", featured: false, image_url: "",
  ticket_url: "",
});

export function slugify(str: string) {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

interface EventFormBlockProps {
  index: number;
  form: EventFormData;
  partners: Partner[];
  onChange: (index: number, form: EventFormData) => void;
  onRemove?: (index: number) => void;
  showRemove?: boolean;
  onGenerateDescription?: (index: number) => void;
  generatingDesc?: boolean;
}

const EventFormBlock = ({ index, form, partners, onChange, onRemove, showRemove, onGenerateDescription, generatingDesc }: EventFormBlockProps) => {
  const [manualVenue, setManualVenue] = useState(!form.partner_id && (!!form.venue_name || !!form.address || !form.partner_id));
  const [sections, setSections] = useState({ venue: true, content: true, media: true });
  const [descMode, setDescMode] = useState<"preview" | "html">("preview");

  function handleChange(key: string, value: string | boolean) {
    const next: any = { ...form, [key]: value };
    if (key === "title" && typeof value === "string") {
      next.title = value.toUpperCase();
      next.slug = slugify(value);
    }
    onChange(index, next);
  }

  function handlePartnerSelect(partnerId: string) {
    if (partnerId) {
      const p = partners.find((p) => p.id === partnerId);
      if (p) {
        onChange(index, { ...form, partner_id: partnerId, venue_name: p.name, address: p.address || "", instagram: p.instagram || "" });
        setManualVenue(false);
      }
    } else {
      onChange(index, { ...form, partner_id: "" });
      setManualVenue(true);
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
    <div className="rounded-xl border border-border/40 bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-foreground">Evento {index + 1}{form.title ? ` — ${form.title}` : ""}</p>
        {showRemove && (
          <button type="button" onClick={() => onRemove?.(index)} className="admin-glow-destructive flex items-center gap-1 rounded-md border border-destructive/30 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 transition">
            <Trash2 className="h-3.5 w-3.5" /> Remover
          </button>
        )}
      </div>

      {/* Main info */}
      <div className="space-y-2.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border/30 pb-1">Informações Principais</p>
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
            <input type="datetime-local" className={inputClass} value={form.date_time} onChange={(e) => handleChange("date_time", e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Categoria</label>
            <select
              className={inputClass}
              value={form.category}
              onChange={(e) => {
                const value = e.target.value;
                const next: any = { ...form, category: value };
                // clear musical sub when category no longer supports it
                if (!supportsGenre(value)) next._sub = null;
                onChange(index, next);
              }}
            >
              {ADMIN_MAIN_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          {supportsGenre(form.category) && (
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Gênero musical</label>
              <select
                className={inputClass}
                value={(form as any)._sub || ""}
                onChange={(e) => onChange(index, { ...form, _sub: e.target.value || null } as any)}
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
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-medium text-muted-foreground">Descrição</label>
                <div className="flex items-center gap-2">
                  {form.description && (
                    <div className="flex items-center rounded-md border border-border/50 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setDescMode("preview")}
                        className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium transition ${descMode === "preview" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        <Eye className="h-2.5 w-2.5" /> Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => setDescMode("html")}
                        className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium transition ${descMode === "html" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        <Code2 className="h-2.5 w-2.5" /> HTML
                      </button>
                    </div>
                  )}
                  {onGenerateDescription && (
                    <button
                      type="button"
                      disabled={generatingDesc || !form.title}
                      onClick={() => onGenerateDescription(index)}
                      className="admin-glow flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/20 transition disabled:opacity-50"
                    >
                      {generatingDesc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      {generatingDesc ? "Injetando hype..." : "✨ Gerar Hype"}
                    </button>
                  )}
                </div>
              </div>
              {form.description && descMode === "preview" ? (
                <div
                  onClick={() => setDescMode("html")}
                  className="prose prose-sm prose-invert max-w-none min-h-[60px] cursor-text rounded-lg border border-border/50 bg-background px-3 py-2 text-sm [&_p]:my-1 [&_ul]:my-1 [&_ul]:pl-4 [&_ul]:list-disc [&_strong]:text-foreground [&_strong]:font-semibold"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(form.description, {
                      ALLOWED_TAGS: ["p", "strong", "em", "ul", "ol", "li", "br"],
                      ALLOWED_ATTR: [],
                    }),
                  }}
                  title="Clique para editar HTML"
                />
              ) : (
                <textarea className={`${inputClass} min-h-[60px] font-mono text-[11px]`} value={form.description} onChange={(e) => handleChange("description", e.target.value)} placeholder={generatingDesc ? "Injetando hype..." : "Aguardando o toque da IA..."} />
              )}
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Fonte de verificação</label>
              <input className={inputClass} value={form.verification_source} onChange={(e) => handleChange("verification_source", e.target.value)} placeholder="Instagram, site..." />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Link de ingresso (opcional)</label>
              <input className={inputClass} value={form.ticket_url} onChange={(e) => handleChange("ticket_url", e.target.value)} placeholder="https://..." />
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
    </div>
  );
};

export default EventFormBlock;

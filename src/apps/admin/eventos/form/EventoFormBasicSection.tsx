/* eslint-disable @typescript-eslint/no-explicit-any -- preservado do original EventoForm.tsx (Fase 3C1) */
import DateTimePickerSP from "@/components/admin/DateTimePickerSP";
import {
  ADMIN_MAIN_CATEGORIES,
  ADMIN_MUSICAL_SUBS,
  supportsGenre,
} from "@/lib/categoryConfig";
import { INPUT_CLASS } from "./constants";
import type { UseEventoFormReturn } from "./useEventoForm";

interface Props {
  ctx: UseEventoFormReturn;
}

export default function EventoFormBasicSection({ ctx }: Props) {
  const { form, setForm, partners, handleChange, handlePartnerSelect } = ctx;

  return (
    <div className="space-y-2.5">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border/30 pb-1">
        Informações Principais
      </p>
      {form.opportunity_tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {form.opportunity_tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[10px] font-black uppercase text-accent"
            >
              Oportunidade · {tag.replace("_", " ")}
            </span>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="col-span-2">
          <label className="text-[11px] font-medium text-muted-foreground">Título *</label>
          <input
            className={`${INPUT_CLASS} uppercase`}
            value={form.title}
            onChange={(e) => handleChange("title", e.target.value)}
            placeholder="Qual o nome da fera?"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground">Slug</label>
          <input
            className={INPUT_CLASS}
            value={form.slug}
            onChange={(e) => handleChange("slug", e.target.value)}
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground">Data e Hora *</label>
          <DateTimePickerSP
            value={form.date_time}
            onChange={(v) => handleChange("date_time", v)}
            timeIsUnknown={Boolean((form as any).time_is_unknown)}
            onTimeIsUnknownChange={(v) =>
              setForm((prev) => ({ ...prev, time_is_unknown: v } as any))
            }
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground">Categoria</label>
          <select
            className={`${INPUT_CLASS} border-primary/40 bg-background/60 focus:border-primary/70 focus:ring-1 focus:ring-primary/30`}
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
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        {supportsGenre(form.category) && (
          <div className="animate-fade-in">
            <label className="text-[11px] font-medium text-muted-foreground">Gênero musical</label>
            <select
              className={`${INPUT_CLASS} border-primary/40 bg-background/60 focus:border-primary/70 focus:ring-1 focus:ring-primary/30`}
              value={(form as any)._sub || ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, _sub: e.target.value || null } as any))
              }
            >
              <option value="">— Sem gênero —</option>
              {ADMIN_MUSICAL_SUBS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className={supportsGenre(form.category) ? "col-span-2" : ""}>
          <label className="text-[11px] font-medium text-muted-foreground">Parceiro</label>
          <select
            className={INPUT_CLASS}
            value={form.partner_id}
            onChange={(e) => handlePartnerSelect(e.target.value)}
          >
            <option value="">— Sem parceiro —</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

import EventoFormSectionHeader from "./EventoFormSectionHeader";
import EventoFormAiSection from "./EventoFormAiSection";
import EventoFormSeoSection from "./EventoFormSeoSection";
import { INPUT_CLASS } from "./types";
import type { UseEventoFormReturn } from "./useEventoForm";

interface Props {
  ctx: UseEventoFormReturn;
}

/**
 * "Conteúdo do Evento" — agrupa Descrição/IA, SEO/IG e os campos de
 * publicação (status, fonte, ticket, destaque, reserva de carona).
 * Equivale ao slot `EventoFormScheduleSection` do plano, agregando a
 * configuração que rege a publicação do evento.
 */
export default function EventoFormScheduleSection({ ctx }: Props) {
  const { form, handleChange, sections, setSections } = ctx;

  return (
    <div className="space-y-2.5">
      <EventoFormSectionHeader
        sectionKey="content"
        label="Conteúdo do Evento"
        sections={sections}
        setSections={setSections}
      />
      {sections.content && (
        <div className="grid grid-cols-2 gap-2.5">
          <EventoFormAiSection ctx={ctx} />
          <EventoFormSeoSection ctx={ctx} />
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Status</label>
            <select
              className={INPUT_CLASS}
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value)}
            >
              <option value="draft">Rascunho</option>
              <option value="published">Publicado</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Fonte de verificação</label>
            <input
              className={INPUT_CLASS}
              value={form.verification_source}
              onChange={(e) => handleChange("verification_source", e.target.value)}
              placeholder="Instagram, site..."
            />
          </div>
          <div className="col-span-2">
            <label className="text-[11px] font-medium text-muted-foreground">
              Link de ingresso / reserva (opcional)
            </label>
            <input
              className={INPUT_CLASS}
              value={form.ticket_url}
              onChange={(e) => handleChange("ticket_url", e.target.value)}
              placeholder="https://... ou link WhatsApp"
            />
          </div>
          <div className="col-span-2">
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => handleChange("featured", e.target.checked)}
                className="accent-primary"
              />
              Evento em destaque
            </label>
          </div>
          <div className="col-span-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean((form as any).transport_reservation_enabled)}
                onChange={(e) =>
                  handleChange("transport_reservation_enabled" as any, e.target.checked)
                }
                className="accent-primary mt-0.5"
              />
              <span className="flex-1">
                <span className="font-semibold text-foreground">🚗 Ativar reserva de carona</span>
                <span className="block text-[10px] text-muted-foreground mt-0.5">
                  Mostra o botão de reserva/carona na página pública deste evento.
                </span>
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

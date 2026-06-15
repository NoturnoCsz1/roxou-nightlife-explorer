import EventoFormSectionHeader from "./EventoFormSectionHeader";
import { INPUT_CLASS } from "./types";
import type { UseEventoFormReturn } from "./useEventoForm";

interface Props {
  ctx: UseEventoFormReturn;
}

export default function EventoFormPartnerSection({ ctx }: Props) {
  const {
    form,
    handleChange,
    handlePartnerSelect,
    manualVenue,
    setManualVenue,
    suggestedPartner,
    setSuggestedPartner,
    sections,
    setSections,
  } = ctx;

  return (
    <div className="space-y-2.5">
      <EventoFormSectionHeader
        sectionKey="venue"
        label="Informações do Local"
        sections={sections}
        setSections={setSections}
      />
      {sections.venue && (
        <>
          {suggestedPartner && !form.partner_id && (
            <div className="flex items-center justify-between rounded-lg bg-primary/10 border border-primary/20 p-2.5 text-xs">
              <p className="text-muted-foreground">
                Possível parceiro encontrado:{" "}
                <strong className="text-foreground">{suggestedPartner.name}</strong>
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
              <p className="text-muted-foreground mb-1">
                Preenchido pelo parceiro:{" "}
                <strong className="text-foreground">{form.venue_name}</strong>
              </p>
              <button
                type="button"
                onClick={() => setManualVenue(true)}
                className="text-primary text-[11px] font-medium hover:underline"
              >
                Editar local manualmente
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[11px] font-medium text-muted-foreground">Nome do local</label>
                <input
                  className={INPUT_CLASS}
                  value={form.venue_name}
                  onChange={(e) => handleChange("venue_name", e.target.value)}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[11px] font-medium text-muted-foreground">Instagram</label>
                <input
                  className={INPUT_CLASS}
                  value={form.instagram}
                  onChange={(e) => handleChange("instagram", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] font-medium text-muted-foreground">Endereço</label>
                <input
                  className={INPUT_CLASS}
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any -- preservado do original EventoForm.tsx (Fase 3C1) */
import InstagramImportModal from "@/components/admin/InstagramImportModal";
import TransmissionSection, { type TransmissionFields } from "@/components/admin/TransmissionSection";
import { Save } from "lucide-react";
import EventoFormHeader from "./EventoFormHeader";
import EventoFormBasicSection from "./EventoFormBasicSection";
import EventoFormPartnerSection from "./EventoFormPartnerSection";
import EventoFormScheduleSection from "./EventoFormScheduleSection";
import EventoFormMediaSection from "./EventoFormMediaSection";
import { useEventoForm } from "./useEventoForm";

export default function EventoFormShell() {
  const ctx = useEventoForm();
  const { form, saving, igModalOpen, setIgModalOpen, handleInstagramImport, handleSubmit, applyTransmission } = ctx;

  return (
    <div className="md:ml-44 max-w-5xl">
      <EventoFormHeader ctx={ctx} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
          <EventoFormBasicSection ctx={ctx} />
          <EventoFormPartnerSection ctx={ctx} />
          <EventoFormScheduleSection ctx={ctx} />
          <EventoFormMediaSection ctx={ctx} />

          <TransmissionSection
            eventDateTime={form.date_time}
            value={{
              is_sports_transmission: Boolean((form as any).is_sports_transmission),
              sports_match_id: (form as any).sports_match_id || null,
              transmission_channel: (form as any).transmission_channel || null,
              transmission_url: (form as any).transmission_url || null,
              transmission_notes: (form as any).transmission_notes || null,
            }}
            onChange={(t: TransmissionFields) => applyTransmission(t)}
          />

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </form>

        <aside className="hidden lg:block">
          <div className="sticky top-20 rounded-2xl border border-primary/20 bg-card/80 p-3 shadow-[0_0_24px_hsl(var(--primary)/0.12)] backdrop-blur-xl">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
              Sticky Preview
            </p>
            <div className="overflow-hidden rounded-xl border border-border/40 bg-background/50">
              {form.image_url ? (
                <img
                  src={form.image_url}
                  alt={form.title || "Flyer do evento"}
                  className="aspect-[4/5] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/5] items-center justify-center text-xs text-muted-foreground">
                  Sem flyer
                </div>
              )}
            </div>
            <h2 className="mt-3 line-clamp-2 font-display text-sm font-black text-foreground">
              {form.title || "Evento sem título"}
            </h2>
            <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
              {form.venue_name || "Local não informado"}
            </p>
          </div>
        </aside>
      </div>

      <InstagramImportModal
        open={igModalOpen}
        onClose={() => setIgModalOpen(false)}
        onImport={handleInstagramImport}
      />
    </div>
  );
}

import ImageUpload from "@/components/admin/ImageUpload";
import EventoFormSectionHeader from "./EventoFormSectionHeader";
import EventoFormWarningsSection from "./EventoFormWarningsSection";
import type { UseEventoFormReturn } from "./useEventoForm";

interface Props {
  ctx: UseEventoFormReturn;
}

export default function EventoFormMediaSection({ ctx }: Props) {
  const { form, setForm, sections, setSections, checkDuplicateEvent } = ctx;

  return (
    <div className="space-y-2.5">
      <EventoFormSectionHeader
        sectionKey="media"
        label="Mídia"
        sections={sections}
        setSections={setSections}
      />
      {sections.media && (
        <div className="space-y-2.5">
          <ImageUpload
            folder="events"
            currentUrl={form.image_url}
            onUploaded={(url, imageHash) => {
              setForm((prev) => ({
                ...prev,
                image_url: url,
                image_hash: imageHash || prev.image_hash,
              }));
              if (imageHash) checkDuplicateEvent({ image_url: url, image_hash: imageHash });
            }}
            label="Flyer do Evento"
          />
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              🎬 Vídeo POV (opcional · MP4 público){" "}
              <span className="text-[10px] font-normal normal-case text-muted-foreground/70">
                — usado no card "Destaque da Semana"
              </span>
            </label>
            <input
              type="url"
              value={form.video_url || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, video_url: e.target.value }))}
              placeholder="https://..."
              className="w-full rounded-lg border border-border/40 bg-background/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none"
            />
          </div>
          <EventoFormWarningsSection ctx={ctx} />
        </div>
      )}
    </div>
  );
}

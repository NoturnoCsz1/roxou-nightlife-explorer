import { toast } from "sonner";
import type { Establishment, ManualCoordsState } from "./types";
import { parseMapsUrl } from "./geocoding";

interface Props {
  e: Establishment;
  state: ManualCoordsState;
  busy: boolean;
  onChange: (next: ManualCoordsState) => void;
  onSave: (lat: number, lng: number) => Promise<void>;
  onCancel: () => void;
}

export function EstabelecimentosManualCoords({ e: _e, state, busy, onChange, onSave, onCancel }: Props) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5 space-y-2">
      <p className="text-[10px] uppercase tracking-wide text-primary font-bold">Coordenadas manuais</p>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text" inputMode="decimal" placeholder="Latitude (-22.1234)"
          value={state.lat}
          onChange={ev => onChange({ ...state, lat: ev.target.value })}
          className="rounded-md border border-border/40 bg-card px-2 py-1 text-[11px] outline-none"
        />
        <input
          type="text" inputMode="decimal" placeholder="Longitude (-51.1234)"
          value={state.lng}
          onChange={ev => onChange({ ...state, lng: ev.target.value })}
          className="rounded-md border border-border/40 bg-card px-2 py-1 text-[11px] outline-none"
        />
      </div>
      <div className="flex gap-1.5">
        <input
          type="text" placeholder="Cole o link do Google Maps"
          value={state.url}
          onChange={ev => {
            const v = ev.target.value;
            const parsed = parseMapsUrl(v);
            if (parsed) {
              onChange({ lat: parsed.lat.toString(), lng: parsed.lng.toString(), url: v });
              toast.success("Coordenadas extraídas do link");
            } else {
              onChange({ ...state, url: v });
            }
          }}
          className="flex-1 rounded-md border border-border/40 bg-card px-2 py-1 text-[11px] outline-none"
        />
      </div>
      <div className="flex gap-1.5">
        <button
          disabled={busy}
          onClick={async () => {
            const lat = parseFloat(state.lat.replace(",", "."));
            const lng = parseFloat(state.lng.replace(",", "."));
            await onSave(lat, lng);
          }}
          className="rounded-md bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          Salvar coordenadas
        </button>
        <button
          onClick={onCancel}
          className="rounded-md bg-secondary/60 px-2.5 py-1 text-[10px] font-semibold hover:bg-secondary"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

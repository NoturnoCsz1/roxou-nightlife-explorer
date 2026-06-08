import { useEffect, useState } from "react";
import { Tv, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface TransmissionFields {
  is_sports_transmission: boolean;
  sports_match_id: string | null;
  transmission_channel: string | null;
  transmission_url: string | null;
  transmission_notes: string | null;
}

export const emptyTransmission = (): TransmissionFields => ({
  is_sports_transmission: false,
  sports_match_id: null,
  transmission_channel: null,
  transmission_url: null,
  transmission_notes: null,
});

const CHANNELS = ["GE TV", "CazéTV", "SporTV", "Premiere", "YouTube", "TV aberta", "Outro"];

interface MatchOption {
  id: string;
  home_team: string;
  away_team: string;
  match_time: string;
  league_label: string | null;
}

interface Props {
  /** Data string (YYYY-MM-DDTHH:mm) usada como referência pra sugerir jogos próximos. */
  eventDateTime?: string;
  value: TransmissionFields;
  onChange: (next: TransmissionFields) => void;
  inputClass?: string;
}

/**
 * Seção opcional do admin para vincular evento a jogo + transmissão.
 * Não interfere em campos existentes; tudo nullable.
 */
export default function TransmissionSection({ eventDateTime, value, onChange, inputClass }: Props) {
  const [matches, setMatches] = useState<MatchOption[]>([]);
  const [loading, setLoading] = useState(false);

  const input =
    inputClass ||
    "w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 transition";

  useEffect(() => {
    if (!value.is_sports_transmission) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Janela: -1d / +2d em torno da data do evento. Sem data → próximos 7d.
        const ref = eventDateTime ? new Date(`${eventDateTime}:00-03:00`) : new Date();
        const from = new Date(ref.getTime() - 24 * 3600_000).toISOString();
        const to = new Date(ref.getTime() + 48 * 3600_000).toISOString();
        const { data } = await supabase
          .from("sports_matches")
          .select("id, home_team, away_team, match_time, league_label")
          .gte("match_time", from)
          .lte("match_time", to)
          .neq("status", "cancelled")
          .order("match_time", { ascending: true })
          .limit(80);
        if (!cancelled) setMatches((data as MatchOption[]) || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value.is_sports_transmission, eventDateTime]);

  function patch(p: Partial<TransmissionFields>) {
    onChange({ ...value, ...p });
  }

  function fmt(iso: string) {
    try {
      return new Date(iso).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className="space-y-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
      <label className="flex items-center justify-between gap-2 cursor-pointer">
        <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-200 uppercase tracking-wide">
          <Tv className="h-3.5 w-3.5" /> Transmissão de jogo
        </span>
        <input
          type="checkbox"
          checked={value.is_sports_transmission}
          onChange={(e) =>
            patch({
              is_sports_transmission: e.target.checked,
              ...(e.target.checked
                ? {}
                : {
                    sports_match_id: null,
                    transmission_channel: null,
                    transmission_url: null,
                    transmission_notes: null,
                  }),
            })
          }
          className="accent-emerald-400 h-4 w-4"
        />
      </label>

      {value.is_sports_transmission && (
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div className="col-span-2">
            <label className="text-[11px] font-medium text-muted-foreground">
              Jogo {loading && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}
            </label>
            <select
              className={input}
              value={value.sports_match_id || ""}
              onChange={(e) => patch({ sports_match_id: e.target.value || null })}
            >
              <option value="">
                {matches.length === 0 && !loading
                  ? "— Nenhum jogo na janela do evento —"
                  : "— Selecione um jogo —"}
              </option>
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.home_team} × {m.away_team} · {fmt(m.match_time)}
                  {m.league_label ? ` · ${m.league_label}` : ""}
                </option>
              ))}
            </select>
            {value.sports_match_id && !matches.find((m) => m.id === value.sports_match_id) && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                Jogo vinculado fora da janela atual. Mantido como está.
              </p>
            )}
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Canal</label>
            <select
              className={input}
              value={value.transmission_channel || ""}
              onChange={(e) => patch({ transmission_channel: e.target.value || null })}
            >
              <option value="">— Selecione —</option>
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Link da transmissão</label>
            <input
              type="url"
              className={input}
              value={value.transmission_url || ""}
              onChange={(e) => patch({ transmission_url: e.target.value || null })}
              placeholder="https://youtube.com/..."
            />
          </div>

          <div className="col-span-2">
            <label className="text-[11px] font-medium text-muted-foreground">Observação</label>
            <textarea
              className={`${input} min-h-[48px] text-[12px]`}
              value={value.transmission_notes || ""}
              onChange={(e) => patch({ transmission_notes: e.target.value || null })}
              placeholder="Ex: telão de 100 polegadas, áudio ambiente, reserva sugerida..."
            />
          </div>
        </div>
      )}
    </div>
  );
}

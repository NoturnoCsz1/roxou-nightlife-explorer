import { Tv } from "lucide-react";

/**
 * Seção simplificada de "Transmite futebol?" no cadastro de evento.
 *
 * Regra atual (Onda hotfix):
 *  - Único dado obrigatório: booleano `is_sports_transmission`.
 *  - Campo opcional livre: confronto (ex: "Corinthians x Palmeiras"),
 *    persistido em `transmission_notes` para preservar o schema existente.
 *  - Não consulta `sports_matches`, não usa canal/link/match_id.
 *  - Data/horário reaproveitam a própria data do evento na Agenda.
 */
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

interface Props {
  /** Mantido por compatibilidade de assinatura — não é mais usado. */
  eventDateTime?: string;
  value: TransmissionFields;
  onChange: (next: TransmissionFields) => void;
  inputClass?: string;
}

export default function TransmissionSection({ value, onChange, inputClass }: Props) {
  const input =
    inputClass ||
    "w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 transition";

  function toggle(checked: boolean) {
    onChange({
      is_sports_transmission: checked,
      sports_match_id: null,
      transmission_channel: null,
      transmission_url: null,
      transmission_notes: checked ? value.transmission_notes ?? null : null,
    });
  }

  function setConfronto(text: string) {
    onChange({
      ...value,
      is_sports_transmission: true,
      sports_match_id: null,
      transmission_channel: null,
      transmission_url: null,
      transmission_notes: text.trim() ? text : null,
    });
  }

  return (
    <div className="space-y-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
      <label className="flex items-center justify-between gap-2 cursor-pointer">
        <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-200 uppercase tracking-wide">
          <Tv className="h-3.5 w-3.5" /> 📺 Transmite futebol?
        </span>
        <input
          type="checkbox"
          checked={value.is_sports_transmission}
          onChange={(e) => toggle(e.target.checked)}
          className="accent-emerald-400 h-4 w-4"
        />
      </label>

      {value.is_sports_transmission && (
        <div className="pt-1">
          <label className="text-[11px] font-medium text-muted-foreground">
            Jogo / confronto (opcional)
          </label>
          <input
            type="text"
            className={input}
            value={value.transmission_notes || ""}
            onChange={(e) => setConfronto(e.target.value)}
            placeholder="Ex: Corinthians x Palmeiras"
            maxLength={120}
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            Data e horário são os do próprio evento. Deixe em branco para exibir apenas
            "📺 Transmissão de futebol".
          </p>
        </div>
      )}
    </div>
  );
}

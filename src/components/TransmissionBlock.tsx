import { Tv } from "lucide-react";

interface Props {
  eventId?: string;
  isSportsTransmission?: boolean | null;
  /** @deprecated mantido por compatibilidade — não é mais consultado. */
  sportsMatchId?: string | null;
  /** @deprecated mantido por compatibilidade — não é mais exibido. */
  channel?: string | null;
  /** @deprecated mantido por compatibilidade — não é mais exibido. */
  url?: string | null;
  /** Confronto livre (texto). Ex: "Corinthians x Palmeiras". */
  notes?: string | null;
  compact?: boolean;
}

/**
 * Bloco simples de "Transmissão de futebol" para páginas/cards de evento.
 * Não consulta `sports_matches` nem exibe canal/link/placar.
 */
export default function TransmissionBlock({
  isSportsTransmission,
  notes,
  compact = false,
}: Props) {
  if (!isSportsTransmission) return null;

  const confronto = notes?.trim() || null;

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
        <Tv className="h-3 w-3" />
        Transmite futebol
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5">
      <div className="flex items-center gap-2 text-emerald-300">
        <Tv className="h-4 w-4" />
        <span className="text-[11px] font-black uppercase tracking-wider">
          📺 Transmissão de futebol
        </span>
      </div>
      {confronto && (
        <p className="mt-1.5 text-sm font-semibold text-foreground leading-tight">
          {confronto}
        </p>
      )}
    </div>
  );
}

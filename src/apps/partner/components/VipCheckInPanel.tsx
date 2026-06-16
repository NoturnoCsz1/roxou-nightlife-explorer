import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import type { PartnerVipEntry } from "../services/partnerVipLists";

interface Props {
  entries: PartnerVipEntry[];
  onCheckIn: (entry: PartnerVipEntry) => void | Promise<void>;
  /** Modo portaria: layout maior, mobile-first, foco em velocidade. */
  doormanMode?: boolean;
}

/**
 * Painel de check-in rápido: busca por nome/telefone e marca presença.
 */
export function VipCheckInPanel({ entries, onCheckIn, doormanMode }: Props) {
  const [q, setQ] = useState("");
  const filtered = q.trim()
    ? entries.filter((e) => {
        const s = q.toLowerCase();
        return (
          e.name.toLowerCase().includes(s) ||
          (e.phone ?? "").toLowerCase().includes(s) ||
          (e.email ?? "").toLowerCase().includes(s) ||
          (e.promoter_name_snapshot ?? "").toLowerCase().includes(s)
        );
      })
    : entries.filter(
        (e) => e.status !== "checked_in" && e.status !== "cancelled",
      );

  return (
    <div className="space-y-3">
      <Input
        placeholder="Buscar por nome, telefone ou promoter..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className={doormanMode ? "h-14 text-lg" : ""}
      />
      <div className="max-h-[70vh] space-y-2 overflow-y-auto">
        {filtered.map((e) => (
          <div
            key={e.id}
            className={`min-w-0 flex items-center justify-between gap-3 rounded-md border p-3 ${doormanMode ? "p-4" : ""}`}
          >
            <div className="min-w-0 flex-1 break-words">
              <p className={`font-semibold ${doormanMode ? "text-lg" : ""}`}>
                {e.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {e.phone ?? e.email ?? "—"} · {e.people_count}p
                {e.promoter_name_snapshot
                  ? ` · Promoter: ${e.promoter_name_snapshot}`
                  : ""}
              </p>
            </div>
            <Button
              size={doormanMode ? "lg" : "sm"}
              disabled={e.status === "checked_in"}
              onClick={() => void onCheckIn(e)}
              className={doormanMode ? "min-w-[140px] text-base" : ""}
            >
              {e.status === "checked_in" ? "Presente" : "Confirmar entrada"}
            </Button>
          </div>
        ))}
        {!filtered.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum convidado encontrado.
          </p>
        ) : null}
      </div>
    </div>
  );
}

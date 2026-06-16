import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import type { PartnerVipEntry } from "../services/partnerVipLists";

interface Props {
  entries: PartnerVipEntry[];
  onCheckIn: (entry: PartnerVipEntry) => void | Promise<void>;
}

/**
 * Painel de check-in rápido: busca por nome/telefone e marca presença.
 */
export function VipCheckInPanel({ entries, onCheckIn }: Props) {
  const [q, setQ] = useState("");
  const filtered = q.trim()
    ? entries.filter((e) => {
        const s = q.toLowerCase();
        return (
          e.name.toLowerCase().includes(s) ||
          (e.phone ?? "").toLowerCase().includes(s) ||
          (e.email ?? "").toLowerCase().includes(s)
        );
      })
    : entries.filter((e) => e.status !== "checked_in" && e.status !== "cancelled");

  return (
    <div className="space-y-3">
      <Input
        placeholder="Buscar convidado por nome ou telefone..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="max-h-[60vh] space-y-2 overflow-y-auto">
        {filtered.map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between rounded-md border p-3"
          >
            <div>
              <p className="font-medium">{e.name}</p>
              <p className="text-xs text-muted-foreground">
                {e.phone ?? e.email ?? "—"} · {e.people_count}p
              </p>
            </div>
            <Button
              size="sm"
              disabled={e.status === "checked_in"}
              onClick={() => void onCheckIn(e)}
            >
              {e.status === "checked_in" ? "Presente" : "Check-in"}
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

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { searchPilotPartners, type PilotPartner } from "../partnerPilotService";

interface Props {
  onSelect: (partner: PilotPartner) => void;
  selectedId?: string | null;
}

export default function PartnerPilotSearch({ onSelect, selectedId }: Props) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<PilotPartner[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchPilotPartners(query);
        setRows(data);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="space-y-3">
      <Input
        placeholder="Buscar por nome, Instagram, cidade ou categoria…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="space-y-1 max-h-[360px] overflow-y-auto rounded-lg border border-border/40">
        {loading && <div className="p-3 text-xs text-muted-foreground">Carregando…</div>}
        {!loading && rows.length === 0 && (
          <div className="p-3 text-xs text-muted-foreground">Nenhum parceiro encontrado.</div>
        )}
        {rows.map((p) => {
          const active = p.id === selectedId;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className={`w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-muted/30 transition ${
                active ? "bg-primary/10" : ""
              }`}
            >
              {p.logo_url ? (
                <img src={p.logo_url} alt="" className="h-8 w-8 rounded object-cover" />
              ) : (
                <div className="h-8 w-8 rounded bg-muted" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{p.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {[p.type, p.city, p.instagram].filter(Boolean).join(" · ")}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

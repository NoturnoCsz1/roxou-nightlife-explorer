/**
 * PartnerSorteiosPage — interface LIMITADA sobre o módulo oficial de
 * Sorteios & Campanhas da Roxou. Somente leitura: engine, ledger,
 * antifraude e apuração continuam no Admin Roxou.
 */
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Gift, RefreshCw, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PartnerScreen } from "../components/PartnerScreen";
import { usePartnerSessionContext } from "../contexts/PartnerSessionContext";
import {
  countGiveawayParticipants,
  listGiveawayDraws,
  listVenueGiveaways,
  readWinners,
  type OfficialGiveaway,
} from "@modules/partner/growth/converged/giveawaysOfficialService";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  active: "Ativo",
  paused: "Pausado",
  closed: "Encerrado",
  drawn: "Sorteado",
  cancelled: "Cancelado",
};

const formatRange = (g: OfficialGiveaway) => {
  const fmt = (v: string | null) =>
    v
      ? new Date(v).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
      : "—";
  return `${fmt(g.starts_at)} → ${fmt(g.ends_at)}`;
};

const PartnerSorteiosPage = () => {
  const { scope, isLoading: sessionLoading } = usePartnerSessionContext();
  const [items, setItems] = useState<OfficialGiveaway[]>([]);
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [winners, setWinners] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!scope?.venueId) return;
    setLoading(true);
    try {
      const rows = await listVenueGiveaways(scope);
      setItems(rows);
      const entries = await Promise.all(
        rows.map(async (g) => [g.id, await countGiveawayParticipants(g.id)] as const),
      );
      setCounts(Object.fromEntries(entries));

      const drawn = rows.filter((g) => g.status === "drawn");
      const drawEntries = await Promise.all(
        drawn.map(async (g) => {
          try {
            const draws = await listGiveawayDraws(g.id);
            const names = draws.flatMap((d) =>
              readWinners(d).map(
                (w) =>
                  `${w.kind === "winner" ? "Ganhador" : "Suplente"} ${w.position}: ${w.display_name}`,
              ),
            );
            return [g.id, names] as const;
          } catch {
            return [g.id, []] as const;
          }
        }),
      );
      setWinners(Object.fromEntries(drawEntries));
    } catch (err) {
      toast.error("Não foi possível carregar os sorteios", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (sessionLoading) {
    return (
      <PartnerScreen title="Sorteios">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </PartnerScreen>
    );
  }

  if (!scope?.venueId) {
    return (
      <PartnerScreen title="Sorteios">
        <p className="text-sm text-muted-foreground">
          Nenhum estabelecimento ativo na sua conta.
        </p>
      </PartnerScreen>
    );
  }

  return (
    <PartnerScreen
      title="Sorteios"
      subtitle="Campanhas do seu estabelecimento"
      right={
        <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      }
    >
      {items.length === 0 && !loading ? (
        <p className="rounded-xl border border-dashed border-border/50 p-6 text-center text-sm text-muted-foreground">
          Nenhum sorteio vinculado ao seu estabelecimento. A criação de
          campanhas é feita pela equipe Roxou.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((g) => (
            <div
              key={g.id}
              className="space-y-2 rounded-xl border border-border/50 bg-card/40 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{g.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatRange(g)}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {STATUS_LABEL[g.status] ?? g.status}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Gift className="h-3.5 w-3.5" /> {g.prize_title ?? "Prêmio a definir"}
                </span>
                {counts[g.id] != null && (
                  <span>{counts[g.id]} participantes</span>
                )}
                {g.draw_date && (
                  <span>
                    Sorteio:{" "}
                    {new Date(g.draw_date).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                      timeZone: "America/Sao_Paulo",
                    })}
                  </span>
                )}
              </div>
              {winners[g.id]?.length ? (
                <div className="rounded-lg border border-border/40 bg-background/40 p-2">
                  <p className="mb-1 inline-flex items-center gap-1 text-[11px] font-medium">
                    <Trophy className="h-3.5 w-3.5 text-amber-400" /> Resultado
                  </p>
                  <ul className="space-y-0.5 text-[11px] text-muted-foreground">
                    {winners[g.id].map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {g.slug && (
                <Button asChild size="sm" variant="outline">
                  <a
                    href={`https://roxou.com.br/sorteio/${g.slug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Página pública
                  </a>
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </PartnerScreen>
  );
};

export default PartnerSorteiosPage;

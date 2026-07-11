/**
 * PartnerListasHistoricoPage — FASE 6B
 * Timeline cronológica das sessões de listas VIP.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { History, Copy, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

import { PartnerScreen } from "../components/PartnerScreen";
import { PartnerEmptyState } from "../components/PartnerEmptyState";
import { usePartnerAuth } from "../hooks/usePartnerAuth";
import {
  deriveVipListState,
  listVipLists,
  type PartnerVipList,
} from "@modules/partner/vip";

const formatDay = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })
    : "—";

const PartnerListasHistoricoPage = () => {
  const { selectedPartner } = usePartnerAuth();
  const partnerId = selectedPartner?.id ?? null;
  const navigate = useNavigate();
  const [lists, setLists] = useState<PartnerVipList[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeep, setShowDeep] = useState(false);

  const load = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      setLists(await listVipLists(partnerId));
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo(() => {
    const DAY = 24 * 60 * 60 * 1000;
    const now = Date.now();
    return lists
      .filter((l) => {
        const ageDays =
          (now - new Date(l.updated_at ?? l.created_at).getTime()) / DAY;
        if (!showDeep && ageDays > 180) return false;
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.starts_at ?? b.created_at).getTime() -
          new Date(a.starts_at ?? a.created_at).getTime(),
      );
  }, [lists, showDeep]);

  if (!partnerId) {
    return (
      <PartnerScreen title="Histórico">
        <PartnerEmptyState ctaLabel="Voltar" ctaTo="/listas" />
      </PartnerScreen>
    );
  }

  return (
    <PartnerScreen
      title="Histórico de sessões"
      subtitle={selectedPartner?.name ?? undefined}
    >
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setShowDeep((v) => !v)}
      >
        {showDeep
          ? "Ocultar arquivamento profundo"
          : "Mostrar arquivamento profundo (180+ dias)"}
      </Button>

      {loading && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center space-y-2">
            <History className="h-8 w-8 mx-auto text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              Nenhuma sessão registrada.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ol className="space-y-2">
          {items.map((l) => {
            const op = deriveVipListState(l, 0, null);
            return (
              <li key={l.id}>
                <Card>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {formatDay(l.starts_at ?? l.created_at)} · {l.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Atualizada em {formatDay(l.updated_at)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-white/5 text-[10px] uppercase shrink-0"
                    >
                      {op}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => navigate(`/lista-vip/${l.id}`)}
                      aria-label="Abrir"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
      )}

      <p className="text-[11px] text-muted-foreground text-center">
        Para duplicar uma sessão, use "Listas fechadas".
        <Copy className="inline h-3 w-3 ml-1 align-middle" />
      </p>
    </PartnerScreen>
  );
};

export default PartnerListasHistoricoPage;

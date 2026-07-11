/**
 * PartnerListasAbertasPage — FASE 6B
 * Abas Hoje · Semana · Todas. Busca por nome.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

import { PartnerScreen } from "../components/PartnerScreen";
import { PartnerEmptyState } from "../components/PartnerEmptyState";
import { VipListTable, VipListEmptyState } from "../components";
import { usePartnerAuth } from "../hooks/usePartnerAuth";
import {
  deriveVipListState,
  listVipLists,
  type PartnerVipList,
} from "@modules/partner/vip";
import { closeDuePartnerVipLists } from "../services/partnerMaintenance";

type Range = "today" | "week" | "all";

const startOfTodaySP = () => {
  const sp = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  sp.setHours(0, 0, 0, 0);
  return sp.getTime();
};
const DAY = 24 * 60 * 60 * 1000;

const PartnerListasAbertasPage = () => {
  const navigate = useNavigate();
  const { selectedPartner } = usePartnerAuth();
  const partnerId = selectedPartner?.id ?? null;
  const [lists, setLists] = useState<PartnerVipList[]>([]);
  const [range, setRange] = useState<Range>("today");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      await closeDuePartnerVipLists();
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

  const filtered = useMemo(() => {
    const today = startOfTodaySP();
    const week = today + 7 * DAY;
    const q = search.trim().toLowerCase();
    return lists.filter((l) => {
      const op = deriveVipListState(l, 0, null);
      if (op !== "open" && op !== "sold_out") return false;
      const ts = new Date(l.starts_at ?? l.created_at).getTime();
      if (range === "today" && (ts < today || ts >= today + DAY)) return false;
      if (range === "week" && (ts < today || ts >= week)) return false;
      if (q && !l.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [lists, range, search]);

  if (!partnerId) {
    return (
      <PartnerScreen title="Listas abertas">
        <PartnerEmptyState ctaLabel="Voltar" ctaTo="/listas" />
      </PartnerScreen>
    );
  }

  return (
    <PartnerScreen
      title="Listas abertas"
      subtitle={selectedPartner?.name ?? undefined}
    >
      <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
        <TabsList className="grid w-full grid-cols-3 bg-white/5 border border-white/8">
          <TabsTrigger value="today" className="text-xs">
            Hoje
          </TabsTrigger>
          <TabsTrigger value="week" className="text-xs">
            Semana
          </TabsTrigger>
          <TabsTrigger value="all" className="text-xs">
            Todas
          </TabsTrigger>
        </TabsList>

        <div className="mt-3 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome…"
            className="pl-8 h-10"
          />
        </div>

        <TabsContent value={range} className="mt-3">
          {loading && lists.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">Carregando…</p>
          ) : filtered.length === 0 ? (
            <VipListEmptyState />
          ) : (
            <VipListTable
              lists={filtered}
              onOpen={(l) => navigate(`/lista-vip/${l.id}`)}
            />
          )}
        </TabsContent>
      </Tabs>
    </PartnerScreen>
  );
};

export default PartnerListasAbertasPage;

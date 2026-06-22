/**
 * PartnerFilaPage — Fila Partner Pro.
 *
 * Tabs: Mesas · Bistrôs · Camarotes · Lista de Espera.
 * Reaproveita listReservations + WaitlistManager existentes.
 */
import { useEffect, useMemo, useState } from "react";
import { Hourglass, Users, Clock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import { usePartnerAuth } from "../hooks/usePartnerAuth";
import { PartnerScreen } from "../components/PartnerScreen";
import { PartnerEmptyState } from "../components/PartnerEmptyState";
import { WaitlistManager } from "../components/WaitlistManager";
import {
  listReservations,
  listReservationTypes,
  type PartnerReservationRow,
  type PartnerReservationType,
  type PartnerReservationTypeKind,
} from "../services/partnerReservations";
import { formatDateTimeSP } from "@/lib/dateUtils";

type Tab = "table" | "bistro" | "box" | "waitlist";

const KIND_LABEL: Record<PartnerReservationTypeKind, string> = {
  table: "Mesas",
  bistro: "Bistrôs",
  box: "Camarotes",
};

function minutesUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60000);
}

function fmtRemaining(mins: number): string {
  if (mins < -60) return `Atrasado ${Math.abs(Math.round(mins / 60))}h`;
  if (mins < 0) return `Atrasado ${Math.abs(mins)}min`;
  if (mins < 60) return `Em ${mins}min`;
  const h = Math.floor(mins / 60);
  return `Em ${h}h ${mins % 60}min`;
}

function ClientCard({
  row,
  type,
}: {
  row: PartnerReservationRow;
  type?: PartnerReservationType;
}) {
  const mins = minutesUntil(row.reservation_date);
  const initials = (row.name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  const toneClass =
    row.status === "pending" || row.status === "pending_payment"
      ? "border-amber-400/30 bg-amber-400/5"
      : row.status === "confirmed"
        ? "border-emerald-400/20 bg-emerald-400/5"
        : "border-white/8 bg-white/[0.03]";

  return (
    <Card className={`${toneClass} overflow-hidden`}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-white/8 flex items-center justify-center text-sm font-semibold text-foreground/90">
          {initials || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {row.name ?? "Sem nome"}
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {row.status}
            </Badge>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {row.people_count} pessoas
            </span>
            {type ? <span>{type.name}</span> : null}
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {fmtRemaining(mins)}
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground/80 truncate mt-0.5">
            {formatDateTimeSP(row.reservation_date)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const PartnerFilaPage = () => {
  const { selectedPartner, selectedPartnerId, isLoading } = usePartnerAuth();
  const [tab, setTab] = useState<Tab>("table");
  const [rows, setRows] = useState<PartnerReservationRow[]>([]);
  const [types, setTypes] = useState<PartnerReservationType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedPartnerId) {
      setRows([]);
      setTypes([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listReservations(selectedPartnerId, { limit: 200 }),
      listReservationTypes(selectedPartnerId),
    ])
      .then(([r, t]) => {
        if (cancelled) return;
        setRows(r);
        setTypes(t);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPartnerId]);

  const typeMap = useMemo(() => {
    const m = new Map<string, PartnerReservationType>();
    for (const t of types) m.set(t.id, t);
    return m;
  }, [types]);

  const filtered = useMemo(() => {
    if (tab === "waitlist") return [] as PartnerReservationRow[];
    return rows.filter((r) => {
      const t = r.reservation_type_id ? typeMap.get(r.reservation_type_id) : null;
      const kind = t?.kind;
      if (!kind) return tab === "table"; // sem tipo → mesa
      return kind === tab && (r.status === "pending" || r.status === "pending_payment" || r.status === "confirmed");
    });
  }, [rows, typeMap, tab]);

  if (isLoading) {
    return (
      <PartnerScreen title="Fila">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </PartnerScreen>
    );
  }

  if (!selectedPartnerId) {
    return (
      <PartnerScreen title="Fila">
        <PartnerEmptyState />
      </PartnerScreen>
    );
  }

  return (
    <PartnerScreen
      title="Fila"
      subtitle={loading ? "Atualizando…" : "Mesas, bistrôs, camarotes e espera"}
      right={<Hourglass className="h-5 w-5 text-muted-foreground" />}
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="grid w-full grid-cols-4 bg-white/5 border border-white/8">
          <TabsTrigger value="table" className="text-xs">Mesas</TabsTrigger>
          <TabsTrigger value="bistro" className="text-xs">Bistrôs</TabsTrigger>
          <TabsTrigger value="box" className="text-xs">Camarotes</TabsTrigger>
          <TabsTrigger value="waitlist" className="text-xs">Espera</TabsTrigger>
        </TabsList>

        {(["table", "bistro", "box"] as const).map((k) => (
          <TabsContent key={k} value={k} className="mt-3 space-y-2">
            {filtered.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-10">
                Sem clientes em {KIND_LABEL[k].toLowerCase()}.
              </div>
            ) : (
              filtered.map((r) => (
                <ClientCard
                  key={r.id}
                  row={r}
                  type={r.reservation_type_id ? typeMap.get(r.reservation_type_id) : undefined}
                />
              ))
            )}
          </TabsContent>
        ))}

        <TabsContent value="waitlist" className="mt-3">
          <WaitlistManager
            partnerId={selectedPartnerId}
            partnerName={selectedPartner?.name ?? ""}
            partnerSlug={selectedPartner?.slug ?? null}
          />
        </TabsContent>
      </Tabs>
    </PartnerScreen>
  );
};

export default PartnerFilaPage;

/**
 * PartnerFilaPage — Fila Partner Pro.
 *
 * Tabs: Mesas · Bistrôs · Camarotes · Lista de Espera.
 * Reaproveita listReservations + WaitlistManager existentes.
 */
import { memo, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Hourglass, Users, Clock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import { usePartnerAuth } from "../hooks/usePartnerAuth";
import { PartnerScreen } from "../components/PartnerScreen";
import { PartnerEmptyState } from "../components/PartnerEmptyState";
import { WaitlistManager } from "../components/WaitlistManager";
import {
  ReservationCardSkeletonList,
  WaitlistSkeleton,
} from "../components/PartnerSkeletons";
import { trackPartnerClient } from "../lib/partnerInteractions";
import {
  listReservations,
  listReservationTypes,
  type PartnerReservationRow,
  type PartnerReservationType,
  type PartnerReservationTypeKind,
} from "../services/partnerReservations";
import { formatDateTimeSP } from "@/lib/dateUtils";
import { formatRelativeTime } from "@/lib/formatRelativeTime";

type Tab = "table" | "bistro" | "box" | "waitlist";

const TAB_TO_PARAM: Record<Tab, string> = {
  table: "mesas",
  bistro: "bistros",
  box: "camarotes",
  waitlist: "espera",
};
const PARAM_TO_TAB: Record<string, Tab> = {
  mesas: "table",
  bistros: "bistro",
  camarotes: "box",
  espera: "waitlist",
};

const KIND_LABEL: Record<PartnerReservationTypeKind, string> = {
  table: "Mesas",
  bistro: "Bistrôs",
  box: "Camarotes",
};

function minutesUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60000);
}

function fmtRemaining(mins: number): string {
  const human = formatRelativeTime(Math.abs(mins));
  return mins < 0 ? `Atrasado ${human}` : `Em ${human}`;
}

type Priority = {
  emoji: string;
  cls: string;
  label: string;
};

function priorityOf(waitMinutes: number): Priority {
  const label = formatRelativeTime(waitMinutes);
  if (waitMinutes < 15)
    return { emoji: "🟢", cls: "bg-emerald-400/15 text-emerald-300 border-emerald-400/25", label };
  if (waitMinutes < 30)
    return { emoji: "🟡", cls: "bg-amber-300/15 text-amber-200 border-amber-300/25", label };
  if (waitMinutes < 60)
    return { emoji: "🟠", cls: "bg-orange-400/15 text-orange-300 border-orange-400/30", label };
  return { emoji: "🔴", cls: "bg-rose-500/15 text-rose-300 border-rose-500/30", label };
}

const ClientCard = memo(function ClientCard({
  row,
  type,
}: {
  row: PartnerReservationRow;
  type?: PartnerReservationType;
}) {
  const mins = minutesUntil(row.reservation_date);
  const waitMs = Date.now() - new Date(row.created_at).getTime();
  const waitMin = Math.max(0, Math.round(waitMs / 60000));
  const prio = priorityOf(waitMin);
  const expiresMin = row.expires_at
    ? minutesUntil(row.expires_at)
    : null;

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
    <Card className={`${toneClass} overflow-hidden transition-colors`}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-white/8 flex items-center justify-center text-sm font-semibold text-foreground/90">
          {initials || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {row.name ?? "Sem nome"}
            </span>
            <button
              type="button"
              onClick={() =>
                trackPartnerClient("partner_waitlist_priority_click", {
                  waitMinutes: waitMin,
                })
              }
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${prio.cls}`}
              aria-label={`Prioridade ${prio.label}`}
            >
              <span>{prio.emoji}</span>
              <span className="tabular-nums">{prio.label}</span>
            </button>
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
            {expiresMin !== null && expiresMin > -120 ? (
              <span className="inline-flex items-center gap-1 text-amber-300/90">
                ⌛ Expira em {formatRelativeTime(Math.max(0, expiresMin))}
              </span>
            ) : null}
          </div>
          <div className="text-[10px] text-muted-foreground/80 truncate mt-0.5">
            {formatDateTimeSP(row.reservation_date)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

const PartnerFilaPage = () => {
  const { selectedPartner, selectedPartnerId, isLoading } = usePartnerAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = PARAM_TO_TAB[searchParams.get("tab") ?? ""] ?? "table";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [rows, setRows] = useState<PartnerReservationRow[]>([]);
  const [types, setTypes] = useState<PartnerReservationType[]>([]);
  const [loading, setLoading] = useState(false);

  // sincroniza tab ↔ URL
  useEffect(() => {
    const fromUrl = PARAM_TO_TAB[searchParams.get("tab") ?? ""];
    if (fromUrl && fromUrl !== tab) setTab(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleTabChange = (v: string) => {
    const next = v as Tab;
    setTab(next);
    const sp = new URLSearchParams(searchParams);
    sp.set("tab", TAB_TO_PARAM[next]);
    setSearchParams(sp, { replace: true });
    trackPartnerClient("partner_deeplink_open", { page: "fila", tab: TAB_TO_PARAM[next] });
  };

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
    const list = rows.filter((r) => {
      const t = r.reservation_type_id ? typeMap.get(r.reservation_type_id) : null;
      const kind = t?.kind;
      if (!kind) return tab === "table";
      return (
        kind === tab &&
        (r.status === "pending" || r.status === "pending_payment" || r.status === "confirmed")
      );
    });
    // Ordenação: expirando primeiro → maior espera → mais pessoas
    return list.slice().sort((a, b) => {
      const expA = a.expires_at ? minutesUntil(a.expires_at) : Infinity;
      const expB = b.expires_at ? minutesUntil(b.expires_at) : Infinity;
      if (expA !== expB) return expA - expB;
      const wA = Date.now() - new Date(a.created_at).getTime();
      const wB = Date.now() - new Date(b.created_at).getTime();
      if (wA !== wB) return wB - wA;
      return (b.people_count ?? 0) - (a.people_count ?? 0);
    });
  }, [rows, typeMap, tab]);

  if (isLoading || (loading && rows.length === 0)) {
    return (
      <PartnerScreen title="Fila">
        {tab === "waitlist" ? <WaitlistSkeleton /> : <ReservationCardSkeletonList count={5} />}
      </PartnerScreen>
    );
  }

  if (!selectedPartnerId) {
    return (
      <PartnerScreen title="Fila">
        <PartnerEmptyState ctaLabel="Abrir configurações" ctaTo="/configuracoes" />
      </PartnerScreen>
    );
  }

  return (
    <PartnerScreen
      title="Fila"
      subtitle={loading ? "Atualizando…" : "Mesas, bistrôs, camarotes e espera"}
      right={<Hourglass className="h-5 w-5 text-muted-foreground" />}
    >
      <Tabs value={tab} onValueChange={handleTabChange} className="animate-in fade-in duration-200">

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

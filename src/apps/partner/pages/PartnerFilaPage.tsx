/**
 * PartnerFilaPage — FASE 4.
 *
 * Tabs simplificadas: Abertas · Fechadas · Arquivadas.
 * Mantém filtro secundário por tipo (mesa/bistrô/camarote/espera) em chips.
 * Reaproveita listReservations + WaitlistManager existentes.
 */
import { memo, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Hourglass, Users, Clock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { usePartnerAuth } from "../hooks/usePartnerAuth";
import { PartnerScreen } from "../components/PartnerScreen";
import { PartnerEmptyState } from "../components/PartnerEmptyState";
import { WaitlistManager } from "../components/WaitlistManager";
import {
  ReservationCardSkeletonList,
} from "../components/PartnerSkeletons";
import { trackPartnerClient } from "../lib/partnerInteractions";
import {
  listReservations,
  listReservationTypes,
  type PartnerReservationRow,
  type PartnerReservationType,
  type PartnerReservationTypeKind,
} from "@modules/partner/reservations";
import { formatDateTimeSP } from "@/lib/dateUtils";
import { formatRelativeTime } from "@/shared/utils/formatRelativeTime";
import { getArchivedIds } from "../lib/partnerLocalArchive";

type Bucket = "open" | "closed" | "archived";
type KindChip = "all" | PartnerReservationTypeKind | "waitlist";

const BUCKET_PARAM: Record<Bucket, string> = {
  open: "abertas",
  closed: "fechadas",
  archived: "arquivadas",
};
const PARAM_BUCKET: Record<string, Bucket> = {
  abertas: "open",
  fechadas: "closed",
  arquivadas: "archived",
};

const DAY = 24 * 60 * 60 * 1000;
const OPEN_STATUS = new Set(["pending", "pending_payment", "confirmed"]);
const CLOSED_STATUS = new Set([
  "completed",
  "cancelled",
  "no_show",
  "expired",
]);

function minutesUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60000);
}

function fmtRemaining(mins: number): string {
  const human = formatRelativeTime(Math.abs(mins));
  return mins < 0 ? `Atrasado ${human}` : `Em ${human}`;
}

function priorityOf(waitMinutes: number) {
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
  const expiresMin = row.expires_at ? minutesUntil(row.expires_at) : null;

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
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${prio.cls}`}
              aria-label={`Prioridade ${prio.label}`}
            >
              <span>{prio.emoji}</span>
              <span className="tabular-nums">{prio.label}</span>
            </span>
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
  const initialBucket =
    PARAM_BUCKET[searchParams.get("tab") ?? ""] ?? "open";
  const [bucket, setBucket] = useState<Bucket>(initialBucket);
  const [kind, setKind] = useState<KindChip>("all");
  const [rows, setRows] = useState<PartnerReservationRow[]>([]);
  const [types, setTypes] = useState<PartnerReservationType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fromUrl = PARAM_BUCKET[searchParams.get("tab") ?? ""];
    if (fromUrl && fromUrl !== bucket) setBucket(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleBucketChange = (v: string) => {
    const next = v as Bucket;
    setBucket(next);
    const sp = new URLSearchParams(searchParams);
    sp.set("tab", BUCKET_PARAM[next]);
    setSearchParams(sp, { replace: true });
    trackPartnerClient("partner_deeplink_open", {
      page: "fila",
      tab: BUCKET_PARAM[next],
    });
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
      listReservations(selectedPartnerId, { limit: 300 }),
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

  const archivedIds = useMemo(() => getArchivedIds("reservations"), [rows]);

  const filtered = useMemo(() => {
    const list = rows.filter((r) => {
      const isArchivedLocal = archivedIds.has(r.id);
      const ageDays =
        (Date.now() - new Date(r.updated_at ?? r.created_at).getTime()) / DAY;

      let inBucket = false;
      if (bucket === "open") {
        inBucket = OPEN_STATUS.has(r.status) && !isArchivedLocal;
      } else if (bucket === "closed") {
        inBucket =
          CLOSED_STATUS.has(r.status) && ageDays <= 7 && !isArchivedLocal;
      } else {
        inBucket =
          isArchivedLocal || (CLOSED_STATUS.has(r.status) && ageDays > 7);
      }
      if (!inBucket) return false;

      if (kind === "all" || kind === "waitlist") return true;
      const t = r.reservation_type_id ? typeMap.get(r.reservation_type_id) : null;
      const k = t?.kind;
      if (!k) return kind === "table";
      return k === kind;
    });

    return list.slice().sort((a, b) => {
      const expA = a.expires_at ? minutesUntil(a.expires_at) : Infinity;
      const expB = b.expires_at ? minutesUntil(b.expires_at) : Infinity;
      if (expA !== expB) return expA - expB;
      const wA = Date.now() - new Date(a.created_at).getTime();
      const wB = Date.now() - new Date(b.created_at).getTime();
      if (wA !== wB) return wB - wA;
      return (b.people_count ?? 0) - (a.people_count ?? 0);
    });
  }, [rows, typeMap, bucket, kind, archivedIds]);

  if (isLoading || (loading && rows.length === 0)) {
    return (
      <PartnerScreen title="Atendimento">
        <ReservationCardSkeletonList count={5} />
      </PartnerScreen>
    );
  }

  if (!selectedPartnerId) {
    return (
      <PartnerScreen title="Atendimento">
        <PartnerEmptyState ctaLabel="Abrir configurações" ctaTo="/configuracoes" />
      </PartnerScreen>
    );
  }

  const showWaitlist = bucket === "open" && kind === "waitlist";

  const chip = (value: KindChip, label: string) => (
    <Button
      key={value}
      type="button"
      size="sm"
      variant={kind === value ? "default" : "outline"}
      className="h-8 px-3 text-[11px] rounded-full"
      onClick={() => setKind(value)}
    >
      {label}
    </Button>
  );

  return (
    <PartnerScreen
      title="Atendimento"
      subtitle={loading ? "Atualizando…" : "Lista de espera e fila de chegada"}
      right={<Hourglass className="h-5 w-5 text-muted-foreground" />}
    >
      <Tabs
        value={bucket}
        onValueChange={handleBucketChange}
        className="animate-in fade-in duration-200"
      >
        <TabsList className="grid w-full grid-cols-3 bg-white/5 border border-white/8">
          <TabsTrigger value="open" className="text-xs">
            Abertas
          </TabsTrigger>
          <TabsTrigger value="closed" className="text-xs">
            Fechadas
          </TabsTrigger>
          <TabsTrigger value="archived" className="text-xs">
            Arquivadas
          </TabsTrigger>
        </TabsList>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {chip("all", "Todos")}
          {chip("table", "Mesas")}
          {chip("bistro", "Bistrôs")}
          {chip("box", "Camarotes")}
          {bucket === "open" ? chip("waitlist", "Espera") : null}
        </div>

        <TabsContent value={bucket} className="mt-3 space-y-2">
          {showWaitlist ? (
            <WaitlistManager
              partnerId={selectedPartnerId}
              partnerName={selectedPartner?.name ?? ""}
              partnerSlug={selectedPartner?.slug ?? null}
            />
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-10">
              {bucket === "open"
                ? "Sem registros nas listas abertas."
                : bucket === "closed"
                  ? "Nenhuma lista encerrada nos últimos 7 dias."
                  : "Nada arquivado. Use a Central de Limpeza para organizar."}
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
      </Tabs>
    </PartnerScreen>
  );
};

export default PartnerFilaPage;

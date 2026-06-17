/**
 * WaitlistManager — gerencia a lista de espera de reservas
 *
 * Mostra entradas agrupadas por tipo + ações: notificar, cancelar,
 * copiar mensagem WhatsApp (com link público do tipo liberado).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { formatDateTimeSP } from "@/lib/dateUtils";
import {
  cancelWaitlistEntry,
  listReservationTypes,
  listReservationWaitlist,
  notifyWaitlistEntry,
  type PartnerReservationType,
  type ReservationWaitlistEntry,
} from "../services/partnerReservations";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  waiting: { label: "Aguardando", cls: "bg-amber-500/15 text-amber-500" },
  notified: { label: "Notificado", cls: "bg-blue-500/15 text-blue-500" },
  accepted: { label: "Aceito", cls: "bg-emerald-500/15 text-emerald-500" },
  expired: { label: "Expirado", cls: "bg-zinc-500/15 text-zinc-400" },
  cancelled: { label: "Cancelado", cls: "bg-rose-500/15 text-rose-400" },
};

const KIND_LABEL: Record<"table" | "bistro" | "box", string> = {
  table: "Mesas",
  bistro: "Bistrôs",
  box: "Camarotes",
};

const formatPhoneBR = (raw: string | null | undefined): string => {
  if (!raw) return "";
  const d = raw.replace(/\D/g, "").replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
};

const formatTimeAgo = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `há ${days}d`;
};


interface Props {
  partnerId: string;
  partnerName: string;
  partnerSlug: string | null | undefined;
}

export function WaitlistManager({ partnerId, partnerName, partnerSlug }: Props) {
  const [rows, setRows] = useState<ReservationWaitlistEntry[]>([]);
  const [types, setTypes] = useState<PartnerReservationType[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      const [w, t] = await Promise.all([
        listReservationWaitlist(partnerId),
        listReservationTypes(partnerId),
      ]);
      setRows(w);
      setTypes(t);
    } catch (err) {
      toast({ title: "Erro ao carregar fila", description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const typeMap = useMemo(() => {
    const m = new Map<string, PartnerReservationType>();
    for (const t of types) m.set(t.id, t);
    return m;
  }, [types]);

  const handleNotify = async (entry: ReservationWaitlistEntry) => {
    try {
      const res = await notifyWaitlistEntry(entry.id);
      const link =
        typeof window !== "undefined"
          ? `${window.location.origin}${res.reservation_url}`
          : res.reservation_url;
      const deadline = res.expires_at
        ? formatDateTimeSP(res.expires_at)
        : "em breve";
      const msg =
        `Olá, ${entry.name}! Uma vaga foi liberada para ${res.type_name} em ${res.partner_name}.\n\n` +
        `Você tem até ${deadline} para confirmar sua reserva.\n\n` +
        `Acesse:\n${link}`;
      try {
        await navigator.clipboard.writeText(msg);
        toast({ title: "Cliente notificado", description: "Mensagem copiada." });
      } catch {
        toast({ title: "Cliente notificado" });
      }
      const phone = entry.phone.replace(/[^0-9]/g, "");
      if (phone) {
        window.open(
          `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`,
          "_blank",
          "noopener,noreferrer",
        );
      }
      void load();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    }
  };

  const handleCopy = async (entry: ReservationWaitlistEntry) => {
    const type = typeMap.get(entry.reservation_type_id);
    const today = (() => {
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    })();
    const link =
      typeof window !== "undefined" && partnerSlug
        ? `${window.location.origin}/${partnerSlug}/reservas?type=${entry.reservation_type_id}&date=${today}&waitlist=${entry.id}`
        : "";
    const msg =
      `Olá, ${entry.name}! Uma vaga foi liberada para ${type?.name ?? "sua reserva"} em ${partnerName}.\n\n` +
      `Acesse:\n${link}`;
    try {
      await navigator.clipboard.writeText(msg);
      toast({ title: "Mensagem copiada" });
    } catch {
      toast({ title: "Não foi possível copiar" });
    }
  };


  const handleCancel = async (entry: ReservationWaitlistEntry) => {
    if (!window.confirm(`Remover ${entry.name} da lista de espera?`)) return;
    try {
      await cancelWaitlistEntry(entry.id);
      toast({ title: "Entrada cancelada" });
      void load();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    }
  };

  const grouped = useMemo(() => {
    const acc: Record<"table" | "bistro" | "box", ReservationWaitlistEntry[]> = {
      table: [],
      bistro: [],
      box: [],
    };
    for (const r of rows) {
      const t = typeMap.get(r.reservation_type_id);
      if (!t) continue;
      acc[t.kind].push(r);
    }
    return acc;
  }, [rows, typeMap]);

  const total = rows.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Lista de espera</CardTitle>
        <span className="text-xs text-muted-foreground">
          {total} {total === 1 ? "entrada" : "entradas"}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : total === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum cliente na lista de espera no momento.
          </p>
        ) : (
          (["table", "bistro", "box"] as const).map((kind) =>
            grouped[kind].length === 0 ? null : (
              <div key={kind} className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {KIND_LABEL[kind]} ({grouped[kind].length})
                </p>
                <div className="grid gap-2">
                  {grouped[kind].map((entry) => {
                    const type = typeMap.get(entry.reservation_type_id);
                    const meta = STATUS_LABEL[entry.status] ?? {
                      label: entry.status,
                      cls: "",
                    };
                    return (
                      <div
                        key={entry.id}
                        className="rounded-md border border-border/60 bg-card/50 p-3 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {entry.name}
                            </p>
                            <p className="text-muted-foreground">
                              {entry.phone} · {entry.guests_count} pess.
                              {type ? ` · ${type.name}` : ""}
                            </p>
                          </div>
                          <Badge className={meta.cls}>{meta.label}</Badge>
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          Criado em {formatDateTimeSP(entry.created_at)}
                          {entry.notified_at
                            ? ` · Notificado ${formatDateTimeSP(entry.notified_at)}`
                            : ""}
                          {entry.expires_at
                            ? ` · Expira ${formatDateTimeSP(entry.expires_at)}`
                            : ""}
                        </div>
                        {entry.notes ? (
                          <p className="mt-1 text-[11px] italic text-muted-foreground">
                            “{entry.notes}”
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {entry.status === "waiting" && (
                            <Button
                              size="sm"
                              onClick={() => void handleNotify(entry)}
                            >
                              Notificar cliente
                            </Button>
                          )}
                          {(entry.status === "waiting" ||
                            entry.status === "notified") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void handleCopy(entry)}
                            >
                              Copiar mensagem
                            </Button>
                          )}
                          {entry.status !== "cancelled" &&
                            entry.status !== "expired" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => void handleCancel(entry)}
                              >
                                Cancelar
                              </Button>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ),
          )
        )}
      </CardContent>
    </Card>
  );
}

export default WaitlistManager;

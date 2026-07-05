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
import { formatRelativeTime } from "@/shared/utils/formatRelativeTime";
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

const KIND_SINGULAR: Record<"table" | "bistro" | "box", string> = {
  table: "Mesa",
  bistro: "Bistrô",
  box: "Camarote",
};

const formatPhoneBR = (raw: string | null | undefined): string => {
  if (!raw) return "";
  const d = raw.replace(/\D/g, "").replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
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

  // FASE 5 — Oculta entradas encerradas (cancelled/expired) da fila aberta.
  // Elas continuam acessíveis em Histórico/Arquivadas via outras telas.
  const openRows = useMemo(
    () => rows.filter((r) => r.status !== "cancelled" && r.status !== "expired"),
    [rows],
  );

  const grouped = useMemo(() => {
    const acc: Record<"table" | "bistro" | "box", ReservationWaitlistEntry[]> = {
      table: [],
      bistro: [],
      box: [],
    };
    for (const r of openRows) {
      const t = typeMap.get(r.reservation_type_id);
      if (!t) continue;
      acc[t.kind].push(r);
    }
    return acc;
  }, [openRows, typeMap]);

  const total = openRows.length;

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
                  {grouped[kind].map((entry, idx) => {
                    const type = typeMap.get(entry.reservation_type_id);
                    const meta = STATUS_LABEL[entry.status] ?? {
                      label: entry.status,
                      cls: "",
                    };
                    const fixed = type && type.requires_guest_count === false;
                    const peopleCount = fixed ? type!.seats : entry.guests_count;
                    const expiresLabel = entry.expires_at
                      ? formatRelativeTime(entry.expires_at)
                      : null;
                    const phoneFmt = formatPhoneBR(entry.phone);
                    return (
                      <div
                        key={entry.id}
                        className="rounded-lg border border-border/60 bg-card/50 p-3 text-xs space-y-1.5"
                      >
                        {/* Linha 1: #N Nome + badge */}
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <p className="truncate text-sm font-medium text-foreground min-w-0">
                            <span className="mr-1.5 inline-flex items-center rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                              #{idx + 1}
                            </span>
                            {entry.name}
                          </p>
                          <Badge className={`${meta.cls} shrink-0`}>{meta.label}</Badge>
                        </div>

                        {/* Linha 2: 👥 pessoas • Mesa/Bistrô/Camarote */}
                        <p className="text-muted-foreground truncate">
                          👥 {peopleCount} {peopleCount === 1 ? "pessoa" : "pessoas"}
                          {fixed ? " incl." : ""}
                          {" • "}
                          {type?.name ?? KIND_SINGULAR[kind]}
                        </p>

                        {/* Linha 3: ⌛ Expira em X */}
                        {expiresLabel ? (
                          <p className="text-amber-300/90">
                            ⌛ Expira em {expiresLabel}
                          </p>
                        ) : (
                          <p className="text-muted-foreground/80">
                            🕒 {formatRelativeTime(entry.created_at)} aguardando
                          </p>
                        )}

                        {/* Linha 4: 📞 telefone */}
                        {phoneFmt ? (
                          <a
                            href={`tel:${entry.phone.replace(/\D/g, "")}`}
                            className="block text-muted-foreground hover:text-foreground transition-colors truncate"
                          >
                            📞 {phoneFmt}
                          </a>
                        ) : null}

                        {entry.notes ? (
                          <p className="italic text-muted-foreground truncate">
                            📝 “{entry.notes}”
                          </p>
                        ) : null}

                        {/* Ações: Notificar · Liberar · Cancelar */}
                        <div className="pt-1 grid grid-cols-3 gap-1.5">
                          {entry.status === "waiting" ? (
                            <Button
                              size="sm"
                              onClick={() => void handleNotify(entry)}
                              className="min-h-[40px] text-xs"
                            >
                              Notificar
                            </Button>
                          ) : (
                            <span />
                          )}
                          {(entry.status === "waiting" || entry.status === "notified") ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void handleCopy(entry)}
                              className="min-h-[40px] text-xs"
                            >
                              Liberar
                            </Button>
                          ) : (
                            <span />
                          )}
                          {entry.status !== "cancelled" && entry.status !== "expired" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => void handleCancel(entry)}
                              className="min-h-[40px] text-xs"
                            >
                              Cancelar
                            </Button>
                          ) : (
                            <span />
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

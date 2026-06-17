/**
 * PartnerReservationsPage — Reservas Pro
 *
 * Reservas do parceiro com:
 * - Buckets operacionais (Ativas / Pendentes / Encerradas / Arquivadas)
 * - Tipos de reserva (mesas/bistrôs/camarotes)
 * - Auto-expiração de pendentes via `expire_due_partner_reservations`
 * - Confirmação de pagamento manual
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, ExternalLink, QrCode, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePartnerAuth } from "../hooks/usePartnerAuth";
import {
  ReservationCard,
  ReservationStats,
  ReservationEmptyState,
  ReservationSettingsForm,
  ReservationTable,
  ReservationTypesManager,
  WaitlistManager,
  GuestNameDialog,
  PublicLinkQrDialog,
} from "../components";
import {
  cancelReservation,
  completeReservation,
  computeReservationStats,
  confirmReservation,
  confirmReservationPayment,
  createReservation,
  getReservationSettings,
  listReservationTypes,
  listReservations,
  noShowReservation,
  updateReservationSettings,
  waivePartnerReservationDeposit,
  type PartnerReservationRow,
  type PartnerReservationSettings,
  type PartnerReservationType,
} from "../services/partnerReservations";
import {
  closeDuePartnerReservations,
  expireDuePartnerReservations,
} from "../services/partnerMaintenance";

const ACCORDION_KEY = "partner_reservas_accordion_v1";

type Bucket = "active" | "pending" | "ended" | "archived";

const bucketOf = (r: PartnerReservationRow): Bucket => {
  if (r.status === "pending_payment" || r.status === "pending") return "pending";
  if (r.status === "no_show" || r.status === "expired") return "archived";
  if (r.status === "cancelled") return "archived";
  if (r.status === "completed") return "ended";
  const past = new Date(r.reservation_date).getTime() < Date.now();
  if (past) return "ended";
  return "active";
};

const PartnerReservationsPage = () => {
  const { selectedPartner, role, isLoading: authLoading } = usePartnerAuth();
  const [rows, setRows] = useState<PartnerReservationRow[]>([]);
  const [types, setTypes] = useState<PartnerReservationType[]>([]);
  const [settings, setSettings] = useState<PartnerReservationSettings | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Bucket>("active");
  const [quickOpen, setQuickOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string>(() => {
    if (typeof window === "undefined") return "list";
    return window.localStorage.getItem(ACCORDION_KEY) ?? "list";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ACCORDION_KEY, openSection || "");
  }, [openSection]);

  const partnerId = selectedPartner?.id ?? null;

  const canCreate = role === "owner" || role === "admin";
  const canConfirm =
    role === "owner" || role === "admin" || role === "editor" || role === "attendant";
  const canComplete = role === "owner" || role === "admin" || role === "attendant";
  const canCancel = role === "owner" || role === "admin";
  const canEditSettings = role === "owner" || role === "admin";

  const load = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      await Promise.all([
        closeDuePartnerReservations(),
        expireDuePartnerReservations(),
      ]);
      const [list, sett] = await Promise.all([
        listReservations(partnerId, { status: "all" }),
        getReservationSettings(partnerId),
      ]);
      setRows(list);
      setSettings(sett);
    } catch (err) {
      const e = err as Error;
      toast({ title: "Erro ao carregar reservas", description: e.message });
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Refresh a cada 30s para atualizar contadores e expirados
  useEffect(() => {
    if (!partnerId) return;
    const iv = setInterval(() => void load(), 30000);
    return () => clearInterval(iv);
  }, [partnerId, load]);

  const stats = useMemo(
    () =>
      computeReservationStats(
        rows,
        settings?.max_reservations_per_day ?? 50,
      ),
    [rows, settings?.max_reservations_per_day],
  );

  const buckets = useMemo(() => {
    const acc: Record<Bucket, PartnerReservationRow[]> = {
      active: [],
      pending: [],
      ended: [],
      archived: [],
    };
    for (const r of rows) acc[bucketOf(r)].push(r);
    return acc;
  }, [rows]);

  const wrap = (fn: () => Promise<unknown>, okMsg: string) => async () => {
    try {
      await fn();
      toast({ title: okMsg });
      void load();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    }
  };

  const handleConfirm = (r: PartnerReservationRow) =>
    wrap(() => confirmReservation(r.id), "Reserva confirmada")();
  const handleConfirmPayment = (r: PartnerReservationRow) =>
    wrap(() => confirmReservationPayment(r.id), "Pagamento confirmado")();
  const handleCancel = (r: PartnerReservationRow) =>
    wrap(() => cancelReservation(r.id), "Reserva cancelada")();
  const handleComplete = (r: PartnerReservationRow) =>
    wrap(() => completeReservation(r.id), "Reserva concluída")();
  const handleNoShow = (r: PartnerReservationRow) =>
    wrap(() => noShowReservation(r.id), "Marcado como no-show")();
  const handleWaiveDeposit = (r: PartnerReservationRow) =>
    wrap(() => waivePartnerReservationDeposit(r.id), "Sinal dispensado")();

  const handleQuickAdd = async () => {
    if (!partnerId) return;
    const name = window.prompt("Nome do convidado?");
    if (!name?.trim()) return;
    const when = window.prompt(
      "Data/hora (AAAA-MM-DD HH:MM)?",
      new Date().toISOString().slice(0, 16).replace("T", " "),
    );
    if (!when) return;
    const iso = new Date(when.replace(" ", "T")).toISOString();
    const people = Number(window.prompt("Quantos convidados?", "2") || "2");
    try {
      await createReservation(partnerId, {
        name: name.trim(),
        reservation_date: iso,
        people_count: Math.max(1, people),
      });
      toast({ title: "Reserva criada" });
      void load();
    } catch (err) {
      toast({ title: "Erro ao criar", description: (err as Error).message });
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen p-6">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </main>
    );
  }

  if (!partnerId) {
    return (
      <main className="min-h-screen p-6">
        <h1 className="mb-2 text-2xl font-bold">Reservas</h1>
        <p className="text-sm text-muted-foreground">
          Selecione um estabelecimento para começar.
        </p>
      </main>
    );
  }

  const renderBucket = (key: Bucket) => {
    const list = buckets[key];
    if (!list.length) {
      return (
        <p className="text-sm text-muted-foreground py-6">
          Nada por aqui ainda.
        </p>
      );
    }
    return (
      <>
        <div className="hidden md:block">
          <ReservationTable
            reservations={list}
            onConfirm={handleConfirm}
            onConfirmPayment={handleConfirmPayment}
            onCancel={handleCancel}
            onComplete={handleComplete}
            onNoShow={handleNoShow}
            canCancel={canCancel}
            canConfirm={canConfirm}
            canComplete={canComplete}
          />
        </div>
        <div className="grid gap-3 md:hidden">
          {list.map((r) => (
            <ReservationCard
              key={r.id}
              reservation={r}
              onConfirm={handleConfirm}
              onConfirmPayment={handleConfirmPayment}
              onWaiveDeposit={handleWaiveDeposit}
              onCancel={handleCancel}
              onComplete={handleComplete}
              onNoShow={handleNoShow}
              canCancel={canCancel}
              canConfirm={canConfirm}
              canComplete={canComplete}
            />
          ))}
        </div>
      </>
    );
  };

  const publicUrl = (() => {
    const slug = selectedPartner?.slug;
    if (!slug) return "";
    if (typeof window === "undefined") return `/${slug}/reservas`;
    const host = window.location.hostname;
    // Prefer the canonical public domain (roxou.com.br) over the partner subdomain
    if (host === "parceiro.roxou.com.br") {
      return `https://roxou.com.br/${slug}/reservas`;
    }
    return `${window.location.origin}/${slug}/reservas`;
  })();

  const handleCopyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast({ title: "Link copiado" });
    } catch {
      toast({ title: "Não foi possível copiar" });
    }
  };

  const handleShareLink = async () => {
    if (!publicUrl) return;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator).share({
          title: `Reservas — ${selectedPartner?.name ?? ""}`,
          url: publicUrl,
        });
        return;
      } catch {
        /* usuário cancelou */
      }
    }
    void handleCopyLink();
  };

  const handleOpenLink = () => {
    if (!publicUrl) return;
    window.open(publicUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <main
      className="min-h-screen w-full max-w-7xl mx-auto space-y-5 p-4 sm:p-6 overflow-x-hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)" }}
    >
      <header className="flex flex-wrap items-end justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Reservas</h1>
          <p className="text-sm text-muted-foreground truncate">
            {selectedPartner?.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreate && (
            <Button onClick={handleQuickAdd} className="min-h-[44px]">
              Nova reserva
            </Button>
          )}
          <Button asChild variant="outline" className="min-h-[44px]">
            <Link to="/painel">Voltar</Link>
          </Button>
        </div>
      </header>

      <ReservationStats stats={stats} />

      {settings?.reservations_enabled && selectedPartner?.slug && (
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Link público de reservas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs break-all">
              {publicUrl}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button
                variant="outline"
                onClick={handleOpenLink}
                className="min-h-[44px] w-full"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleCopyLink()}
                className="min-h-[44px] w-full"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copiar
              </Button>
              <Button
                onClick={() => void handleShareLink()}
                className="min-h-[44px] w-full"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Compartilhar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Accordion
        type="single"
        collapsible
        value={openSection}
        onValueChange={(v) => setOpenSection(v)}
        className="space-y-3"
      >
        <AccordionItem
          value="list"
          className="rounded-2xl border border-border/60 bg-card/40 px-3"
        >
          <AccordionTrigger className="text-sm font-semibold">
            Reservas recentes
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            {loading && rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Carregando reservas…
              </p>
            ) : rows.length === 0 ? (
              <ReservationEmptyState />
            ) : (
              <Tabs value={tab} onValueChange={(v) => setTab(v as Bucket)}>
                <div className="-mx-1 overflow-x-auto">
                  <TabsList className="inline-flex w-max min-w-full justify-start flex-nowrap">
                    <TabsTrigger value="active" className="shrink-0 whitespace-nowrap">
                      Ativas{" "}
                      {buckets.active.length ? `(${buckets.active.length})` : ""}
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="shrink-0 whitespace-nowrap">
                      Pendentes{" "}
                      {buckets.pending.length
                        ? `(${buckets.pending.length})`
                        : ""}
                    </TabsTrigger>
                    <TabsTrigger value="ended" className="shrink-0 whitespace-nowrap">
                      Encerradas{" "}
                      {buckets.ended.length ? `(${buckets.ended.length})` : ""}
                    </TabsTrigger>
                    <TabsTrigger value="archived" className="shrink-0 whitespace-nowrap">
                      Arquivadas{" "}
                      {buckets.archived.length
                        ? `(${buckets.archived.length})`
                        : ""}
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="active" className="mt-4">
                  {renderBucket("active")}
                </TabsContent>
                <TabsContent value="pending" className="mt-4">
                  {renderBucket("pending")}
                </TabsContent>
                <TabsContent value="ended" className="mt-4">
                  {renderBucket("ended")}
                </TabsContent>
                <TabsContent value="archived" className="mt-4">
                  {renderBucket("archived")}
                </TabsContent>
              </Tabs>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="types"
          className="rounded-2xl border border-border/60 bg-card/40 px-3"
        >
          <AccordionTrigger className="text-sm font-semibold">
            Tipos de reserva
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <ReservationTypesManager
              partnerId={partnerId}
              canEdit={canEditSettings}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="waitlist"
          className="rounded-2xl border border-border/60 bg-card/40 px-3"
        >
          <AccordionTrigger className="text-sm font-semibold">
            Lista de espera
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <WaitlistManager
              partnerId={partnerId}
              partnerName={selectedPartner?.name ?? ""}
              partnerSlug={selectedPartner?.slug ?? null}
            />
          </AccordionContent>
        </AccordionItem>

        {canEditSettings && (
          <AccordionItem
            value="settings"
            className="rounded-2xl border border-border/60 bg-card/40 px-3"
          >
            <AccordionTrigger className="text-sm font-semibold">
              Configurações e pagamento
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <ReservationSettingsForm
                initial={settings}
                onSave={async (payload) => {
                  try {
                    const updated = await updateReservationSettings(
                      partnerId,
                      payload,
                    );
                    setSettings(updated);
                    toast({ title: "Configurações salvas" });
                  } catch (err) {
                    toast({
                      title: "Erro",
                      description: (err as Error).message,
                    });
                  }
                }}
              />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </main>
  );
};

export default PartnerReservationsPage;

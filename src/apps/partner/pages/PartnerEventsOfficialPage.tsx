/**
 * PartnerEventsOfficialPage — interface do Partner Pro sobre o módulo de
 * eventos OFICIAL da Roxou (tabela `events`, tenancy venue/organization).
 *
 * Não cria fonte paralela de eventos. Parceiro nunca publica: envio entra
 * como `pending_review` para análise do Admin Roxou.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PartnerScreen } from "../components/PartnerScreen";
import { PartnerEventStatusBadge } from "../components/PartnerEventStatusBadge";
import { usePartnerSessionContext } from "../contexts/PartnerSessionContext";
import {
  isPartnerEditable,
  listVenueEvents,
  submitVenueEvent,
  updateVenueEvent,
  type OfficialEvent,
  type OfficialEventInput,
} from "@modules/partner/events/converged/eventsOfficialService";

type Bucket = "upcoming" | "recent" | "past" | "pending";

const RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const bucketOf = (ev: OfficialEvent): Bucket => {
  if (ev.status === "pending_review" || ev.status === "draft" || ev.status === "rejected") {
    return "pending";
  }
  const start = new Date(ev.start_date).getTime();
  const now = Date.now();
  if (start >= now) return "upcoming";
  if (now - start <= RECENT_WINDOW_MS) return "recent";
  return "past";
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });

const emptyForm: OfficialEventInput = {
  title: "",
  start_date: "",
  category: "party",
  short_description: "",
  description: "",
  banner_url: "",
  ticket_url: "",
};

const PartnerEventsOfficialPage = () => {
  const { scope, session, isLoading: sessionLoading, canManageEvents } =
    usePartnerSessionContext();
  const userId = session?.userId ?? null;

  const [events, setEvents] = useState<OfficialEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Bucket>("upcoming");
  const [form, setForm] = useState<OfficialEventInput | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!scope?.venueId) return;
    setLoading(true);
    try {
      setEvents(await listVenueEvents(scope));
    } catch (err) {
      toast.error("Não foi possível carregar os eventos", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const buckets = useMemo(() => {
    const acc: Record<Bucket, OfficialEvent[]> = {
      upcoming: [],
      recent: [],
      past: [],
      pending: [],
    };
    for (const ev of events) acc[bucketOf(ev)].push(ev);
    return acc;
  }, [events]);

  const submit = async () => {
    if (!scope || !form) return;
    setBusy(true);
    try {
      if (editingId) {
        await updateVenueEvent(scope, editingId, form);
        toast.success("Alterações enviadas para análise da Roxou.");
      } else {
        await submitVenueEvent(scope, form, userId);
        toast.success("Evento enviado para aprovação da Roxou.");
      }
      setForm(null);
      setEditingId(null);
      await refresh();
    } catch (err) {
      toast.error("Não foi possível enviar", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  if (sessionLoading) {
    return <PartnerScreen title="Eventos"><p className="text-sm text-muted-foreground">Carregando…</p></PartnerScreen>;
  }

  if (!scope?.venueId) {
    return (
      <PartnerScreen title="Eventos">
        <p className="text-sm text-muted-foreground">
          Nenhum estabelecimento ativo na sua conta.
        </p>
      </PartnerScreen>
    );
  }

  const renderCard = (ev: OfficialEvent) => {
    const editable = canManageEvents && isPartnerEditable(ev.status);
    const cover = ev.banner_url ?? ev.cover_image;
    return (
      <div
        key={ev.id}
        className="flex gap-3 rounded-xl border border-border/50 bg-card/40 p-3"
      >
        {cover ? (
          <img
            src={cover}
            alt={ev.title}
            loading="lazy"
            className="h-16 w-16 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-muted/40">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium">{ev.title}</p>
            <PartnerEventStatusBadge
              status={ev.status === "pending_review" ? "pending" : ev.status}
            />
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {formatDate(ev.start_date)}
          </p>
          {ev.status === "pending_review" && (
            <p className="mt-1 text-[11px] text-amber-400">
              Pendente de aprovação da Roxou
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {ev.status === "published" && ev.slug && (
              <Button asChild size="sm" variant="outline">
                <a
                  href={`https://roxou.com.br/evento/${ev.slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Visualizar
                </a>
              </Button>
            )}
            {editable && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditingId(ev.id);
                  setForm({
                    title: ev.title,
                    start_date: ev.start_date.slice(0, 16),
                    category: ev.category ?? "party",
                    short_description: ev.short_description ?? "",
                    description: ev.description ?? "",
                    banner_url: ev.banner_url ?? "",
                    ticket_url: ev.ticket_url ?? "",
                  });
                }}
              >
                Editar
              </Button>
            )}
            {ev.status === "published" && (
              <span className="self-center text-[11px] text-muted-foreground">
                Alterações em evento publicado são feitas pela Roxou.
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderBucket = (key: Bucket) => {
    const list = buckets[key];
    if (!list.length) {
      return (
        <p className="rounded-xl border border-dashed border-border/50 p-6 text-center text-sm text-muted-foreground">
          Nenhum evento aqui ainda.
        </p>
      );
    }
    return <div className="space-y-2">{list.map(renderCard)}</div>;
  };

  return (
    <PartnerScreen
      title="Eventos"
      subtitle="Eventos do seu estabelecimento na Roxou"
      right={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {canManageEvents && !form && (
            <Button size="sm" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Criar evento
            </Button>
          )}
        </div>
      }
    >
      {form && (
        <section className="space-y-3 rounded-xl border border-border/50 bg-card/40 p-4">
          <h2 className="text-sm font-semibold">
            {editingId ? "Editar evento" : "Novo evento"}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            O evento é enviado para análise da Roxou antes de aparecer no site.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="ev-title">Nome do evento</Label>
              <Input
                id="ev-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="ev-date">Data e hora</Label>
              <Input
                id="ev-date"
                type="datetime-local"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="ev-cat">Categoria</Label>
              <Input
                id="ev-cat"
                value={form.category ?? ""}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="party, bar_night, concert…"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="ev-short">Resumo</Label>
              <Input
                id="ev-short"
                value={form.short_description ?? ""}
                onChange={(e) =>
                  setForm({ ...form, short_description: e.target.value })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="ev-desc">Descrição</Label>
              <Textarea
                id="ev-desc"
                rows={4}
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="ev-banner">Imagem (URL do flyer)</Label>
              <Input
                id="ev-banner"
                value={form.banner_url ?? ""}
                onChange={(e) => setForm({ ...form, banner_url: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="ev-ticket">Link de ingressos</Label>
              <Input
                id="ev-ticket"
                value={form.ticket_url ?? ""}
                onChange={(e) => setForm({ ...form, ticket_url: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={submit} disabled={busy}>
              Enviar para aprovação
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setForm(null);
                setEditingId(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </section>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as Bucket)}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="upcoming">
            Próximos {buckets.upcoming.length || ""}
          </TabsTrigger>
          <TabsTrigger value="recent">
            Recentes {buckets.recent.length || ""}
          </TabsTrigger>
          <TabsTrigger value="past">Passados {buckets.past.length || ""}</TabsTrigger>
          <TabsTrigger value="pending">
            Pendentes {buckets.pending.length || ""}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">{renderBucket("upcoming")}</TabsContent>
        <TabsContent value="recent">{renderBucket("recent")}</TabsContent>
        <TabsContent value="past">{renderBucket("past")}</TabsContent>
        <TabsContent value="pending">{renderBucket("pending")}</TabsContent>
      </Tabs>
    </PartnerScreen>
  );
};

export default PartnerEventsOfficialPage;

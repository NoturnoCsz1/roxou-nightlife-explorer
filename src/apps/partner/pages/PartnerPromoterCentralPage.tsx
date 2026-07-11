/**
 * Partner Promoter Central — Fase Final
 *
 * Visão, Campanhas, Ranking, Compartilhar, Insights, Metas.
 * Zero novas tabelas. Persistência híbrida (DB se houver coluna; senão local).
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  Copy,
  ExternalLink,
  Target,
  Trophy,
  Megaphone,
  BarChart3,
  Share2,
  Lightbulb,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

import { usePartnerAuth } from "../hooks/usePartnerAuth";
import { listPromoters } from "@modules/partner/vip/promoters";
import {
  getCampaigns,
  getPromoterRanking,
  getPromoterOverview,
  getFunnelAndChannels,
  getTimeline,
  getInsights,
  getDailyCheckInsSeries,
  type CampaignSummary,
  type PromoterRankingRow,
} from "../services/promoterCentral";
import {
  loadPromoterSettings,
  loadPromoterSettingsAsync,
  savePromoterSettings,
  getSettingsStorageMode,
  type PromoterSettings,
} from "../lib/promoterSettings";
import {
  buildCampaignUrl,
  buildWhatsappText,
  buildInstagramCaption,
  buildStoriesText,
  buildFeedText,
  buildBioUrl,
  buildWhatsappShareLink,
  nativeShare,
  type CampaignTarget,
} from "../lib/campaignLinks";

function copy(text: string) {
  navigator.clipboard?.writeText(text);
  toast({ title: "Copiado", description: "Conteúdo na área de transferência." });
}

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const TIER_VARIANT: Record<
  PromoterRankingRow["tier"],
  "default" | "secondary" | "outline"
> = {
  "Top Performer": "default",
  Forte: "default",
  Bom: "secondary",
  Iniciante: "outline",
};

export default function PartnerPromoterCentralPage() {
  const { selectedPartner } = usePartnerAuth();
  const partnerId = selectedPartner?.id ?? "";
  const partnerSlug = selectedPartner?.slug ?? null;

  const [settings, setSettings] = useState<PromoterSettings>(() =>
    loadPromoterSettings(partnerId),
  );
  const [storageMode, setStorageMode] = useState<"db" | "local" | "unknown">(
    "unknown",
  );
  const [selectedPromoterId, setSelectedPromoterId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Hidrata do DB (se disponível) ao montar / trocar parceiro
  useEffect(() => {
    if (!partnerId) return;
    let alive = true;
    loadPromoterSettingsAsync(partnerId).then((s) => {
      if (!alive) return;
      setSettings(s);
      setStorageMode(getSettingsStorageMode());
    });
    return () => {
      alive = false;
    };
  }, [partnerId]);

  const promotersQ = useQuery({
    queryKey: ["promoters", partnerId],
    queryFn: () => listPromoters(partnerId),
    enabled: !!partnerId,
  });

  const overviewQ = useQuery({
    queryKey: ["promoter-overview", partnerId, settings.commission],
    queryFn: () => getPromoterOverview(partnerId, settings),
    enabled: !!partnerId,
  });

  const campaignsQ = useQuery({
    queryKey: ["promoter-campaigns", partnerId, settings.goals.vip_checkins],
    queryFn: () => getCampaigns(partnerId, settings.goals.vip_checkins),
    enabled: !!partnerId,
  });

  const rankingQ = useQuery({
    queryKey: ["promoter-ranking", partnerId, settings.commission],
    queryFn: () => getPromoterRanking(partnerId, settings),
    enabled: !!partnerId,
  });

  const timelineQ = useQuery({
    queryKey: ["promoter-timeline", partnerId],
    queryFn: () => getTimeline(partnerId, 60),
    enabled: !!partnerId,
  });

  const funnelQ = useQuery({
    queryKey: ["promoter-funnel", partnerId],
    queryFn: () => getFunnelAndChannels(partnerId),
    enabled: !!partnerId,
  });

  const seriesQ = useQuery({
    queryKey: ["promoter-series", partnerId],
    queryFn: () => getDailyCheckInsSeries(partnerId, 14),
    enabled: !!partnerId,
  });

  const insightsQ = useQuery({
    queryKey: ["promoter-insights", partnerId],
    queryFn: () => getInsights(partnerId),
    enabled: !!partnerId,
  });

  const promoters = promotersQ.data ?? [];
  const selectedPromoter = useMemo(
    () => promoters.find((p) => p.id === selectedPromoterId) ?? null,
    [promoters, selectedPromoterId],
  );

  const overview = overviewQ.data;
  const ranking = rankingQ.data ?? [];

  const monthlyGoal = settings.goals.vip_checkins || 0;
  const goalPct = monthlyGoal
    ? Math.min(100, Math.round(((overview?.checkins ?? 0) / monthlyGoal) * 100))
    : 0;

  // Gamificação: top promoters por categoria
  const gamif = useMemo(() => {
    const byCheckins = [...ranking].sort((a, b) => b.checked_in - a.checked_in)[0];
    const byConv = [...ranking]
      .filter((r) => r.total_entries >= 5)
      .sort((a, b) => b.conversion_rate - a.conversion_rate)[0];
    const byScore = ranking[0];
    return { byCheckins, byConv, byScore };
  }, [ranking]);

  async function handleSave() {
    setSaving(true);
    const next = await savePromoterSettings(partnerId, settings);
    setSettings(next);
    setStorageMode(getSettingsStorageMode());
    setSaving(false);
    toast({ title: "Metas atualizadas" });
  }

  if (!partnerId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Selecione um parceiro para acessar a Central do Promoter.
      </div>
    );
  }

  return (
    <div className="px-3 py-4 md:px-6 md:py-8 max-w-7xl mx-auto space-y-5 pb-[env(safe-area-inset-bottom)]">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Central do Promoter
        </h1>
        <p className="text-sm text-muted-foreground">
          Campanhas, comissões, metas, insights e ranking — tudo num só lugar.
        </p>
      </header>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Alcance" value={overview?.reach ?? 0} />
        <Kpi label="Leads no mês" value={overview?.leads ?? 0} />
        <Kpi label="Check-ins" value={overview?.checkins ?? 0} />
        <Kpi
          label={`Meta mensal (${goalPct}%)`}
          value={`${overview?.checkins ?? 0}/${monthlyGoal || "—"}`}
        >
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-2">
            <div className="h-full bg-primary" style={{ width: `${goalPct}%` }} />
          </div>
        </Kpi>
      </div>

      <Tabs defaultValue="visao" className="w-full">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="inline-flex w-max md:w-auto">
            <TabsTrigger value="visao">
              <Sparkles className="h-4 w-4 mr-1" />
              <span>Visão</span>
            </TabsTrigger>
            <TabsTrigger value="campanhas">
              <Megaphone className="h-4 w-4 mr-1" />
              <span>Campanhas</span>
            </TabsTrigger>
            <TabsTrigger value="ranking">
              <Trophy className="h-4 w-4 mr-1" />
              <span>Ranking</span>
            </TabsTrigger>
            <TabsTrigger value="share">
              <Share2 className="h-4 w-4 mr-1" />
              <span>Compartilhar</span>
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <BarChart3 className="h-4 w-4 mr-1" />
              <span>Timeline</span>
            </TabsTrigger>
            <TabsTrigger value="insights">
              <Lightbulb className="h-4 w-4 mr-1" />
              <span>Insights</span>
            </TabsTrigger>
            <TabsTrigger value="metas">
              <Target className="h-4 w-4 mr-1" />
              <span>Metas</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* VISÃO */}
        <TabsContent value="visao" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Entradas VIP" value={overview?.vip_entries ?? 0} />
            <Kpi label="Reservas" value={overview?.reservations ?? 0} />
            <Kpi label="Excursões" value={overview?.excursions ?? 0} />
            <Kpi label="Comparecimento" value={`${overview?.attendance_rate ?? 0}%`} />
            <Kpi label="Cliques únicos" value={overview?.unique_clicks ?? 0} />
            <Kpi label="No-shows" value={overview?.no_shows ?? 0} />
            <Kpi label="Recorrentes" value={overview?.recurrent_customers ?? 0} />
            <Kpi label="Comissão prevista" value={BRL(overview?.commission_brl ?? 0)} />
          </div>

          {/* Gamificação */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-primary" /> Destaques da semana
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <MiniHighlight
                title="Mais check-ins"
                name={gamif.byCheckins?.promoter_name ?? "—"}
                value={`${gamif.byCheckins?.checked_in ?? 0} check-ins`}
              />
              <MiniHighlight
                title="Maior conversão"
                name={gamif.byConv?.promoter_name ?? "—"}
                value={`${gamif.byConv?.conversion_rate ?? 0}% de conv.`}
              />
              <MiniHighlight
                title="Top score"
                name={gamif.byScore?.promoter_name ?? "—"}
                value={`${gamif.byScore?.score ?? 0} pts • ${gamif.byScore?.tier ?? "—"}`}
              />
            </div>
          </Card>

          {/* Mini-série */}
          <Card className="p-4">
            <div className="text-sm font-medium mb-2">
              Check-ins (últimos 14 dias)
            </div>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={seriesQ.data ?? []}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={24} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="checkins"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        {/* CAMPANHAS */}
        <TabsContent value="campanhas" className="space-y-3 mt-4">
          {campaignsQ.isLoading && (
            <Card className="p-6 text-sm text-muted-foreground">Carregando…</Card>
          )}
          {!campaignsQ.isLoading && !(campaignsQ.data ?? []).length && (
            <Card className="p-6 text-sm text-muted-foreground">
              Nenhuma campanha ativa. Crie uma Lista VIP para gerar uma campanha
              automaticamente.
            </Card>
          )}
          {(campaignsQ.data ?? []).map((c) => (
            <CampaignCard
              key={c.vip_list_id}
              campaign={c}
              promoterSlug={selectedPromoter?.slug ?? null}
              promoterName={selectedPromoter?.name ?? null}
            />
          ))}
        </TabsContent>

        {/* RANKING */}
        <TabsContent value="ranking" className="mt-4">
          <Card className="p-0 overflow-hidden">
            <div className="grid grid-cols-12 px-3 py-2 text-[11px] font-medium text-muted-foreground border-b border-white/10">
              <div className="col-span-1">#</div>
              <div className="col-span-4">Promoter</div>
              <div className="col-span-2 text-right">Check-ins</div>
              <div className="col-span-2 text-right">Conv.</div>
              <div className="col-span-1 text-right">Score</div>
              <div className="col-span-2 text-right">Comissão</div>
            </div>
            {ranking.map((r, i) => (
              <div
                key={r.promoter_id ?? `_${i}`}
                className="grid grid-cols-12 px-3 py-3 text-sm border-b border-white/5 items-center"
              >
                <div className="col-span-1 font-semibold">{i + 1}</div>
                <div className="col-span-4 truncate">
                  <div className="truncate">{r.promoter_name}</div>
                  <Badge
                    variant={TIER_VARIANT[r.tier]}
                    className="text-[10px] mt-0.5"
                  >
                    {r.tier}
                  </Badge>
                </div>
                <div className="col-span-2 text-right font-semibold">
                  {r.checked_in}
                </div>
                <div className="col-span-2 text-right text-muted-foreground">
                  {r.conversion_rate}%
                </div>
                <div className="col-span-1 text-right tabular-nums">{r.score}</div>
                <div className="col-span-2 text-right">{BRL(r.commission_brl)}</div>
              </div>
            ))}
            {!ranking.length && (
              <div className="p-6 text-sm text-muted-foreground">Sem dados no mês.</div>
            )}
          </Card>
        </TabsContent>

        {/* SHARE KIT */}
        <TabsContent value="share" className="mt-4 space-y-4">
          <Card className="p-4 space-y-3">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Atribuir a um promoter
            </Label>
            <Select
              value={selectedPromoterId || "_none"}
              onValueChange={(v) => setSelectedPromoterId(v === "_none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem promoter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Sem promoter (link direto)</SelectItem>
                {promoters.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A atribuição vai como{" "}
              <code>utm_content=promoter:&lt;slug&gt;</code> nos links abaixo.
            </p>

            {partnerSlug && (
              <div className="pt-2 border-t border-white/10">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Link da Bio
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    readOnly
                    value={buildBioUrl(partnerSlug, {
                      promoterSlug: selectedPromoter?.slug ?? null,
                      promoterName: selectedPromoter?.name ?? null,
                    })}
                    className="text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      copy(
                        buildBioUrl(partnerSlug, {
                          promoterSlug: selectedPromoter?.slug ?? null,
                        }),
                      )
                    }
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {(campaignsQ.data ?? []).map((c) => (
            <ShareKit
              key={c.vip_list_id}
              campaign={c}
              promoterSlug={selectedPromoter?.slug ?? null}
              promoterName={selectedPromoter?.name ?? null}
            />
          ))}
        </TabsContent>

        {/* TIMELINE */}
        <TabsContent value="timeline" className="mt-4 space-y-4">
          {(timelineQ.data ?? []).map((g) => (
            <div key={g.date} className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {g.label}
              </div>
              <Card className="p-0 overflow-hidden">
                {g.items.map((it, i) => (
                  <div
                    key={i}
                    className="px-3 py-3 text-sm border-b border-white/5 flex items-center gap-2 last:border-b-0"
                  >
                    <Badge
                      variant={
                        it.kind === "vip_checkin" || it.kind === "reservation"
                          ? "default"
                          : "secondary"
                      }
                      className="shrink-0 text-[10px]"
                    >
                      {labelForKind(it.kind)}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{it.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {it.subtitle}
                      </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground shrink-0">
                      {new Date(it.at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          ))}
          {!timelineQ.isLoading && !(timelineQ.data ?? []).length && (
            <Card className="p-6 text-sm text-muted-foreground">
              Sem atividade recente.
            </Card>
          )}

          {/* Funil + canais */}
          <Card className="p-4">
            <div className="text-sm font-medium mb-2">Funil de conversão (mês)</div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelQ.data?.funnel ?? []}>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={28} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          {(funnelQ.data?.channels ?? []).length > 0 && (
            <Card className="p-0 overflow-hidden">
              <div className="grid grid-cols-12 px-3 py-2 text-[11px] font-medium text-muted-foreground border-b border-white/10">
                <div className="col-span-5">Canal</div>
                <div className="col-span-3 text-right">Cliques</div>
                <div className="col-span-2 text-right">Entradas</div>
                <div className="col-span-2 text-right">Conv.</div>
              </div>
              {(funnelQ.data?.channels ?? []).map((c) => (
                <div
                  key={c.channel}
                  className="grid grid-cols-12 px-3 py-2 text-sm border-b border-white/5"
                >
                  <div className="col-span-5 capitalize truncate">{c.channel}</div>
                  <div className="col-span-3 text-right">{c.clicks}</div>
                  <div className="col-span-2 text-right">{c.entries}</div>
                  <div className="col-span-2 text-right text-muted-foreground">
                    {c.conversion}%
                  </div>
                </div>
              ))}
            </Card>
          )}
        </TabsContent>

        {/* INSIGHTS */}
        <TabsContent value="insights" className="mt-4 space-y-3">
          {(insightsQ.data ?? []).map((i, idx) => (
            <Card
              key={idx}
              className={`p-4 border-l-4 ${
                i.tone === "positive"
                  ? "border-l-emerald-500"
                  : i.tone === "warning"
                    ? "border-l-amber-500"
                    : "border-l-primary"
              }`}
            >
              <div className="font-medium text-sm">{i.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{i.detail}</div>
            </Card>
          ))}
          {!insightsQ.isLoading && !(insightsQ.data ?? []).length && (
            <Card className="p-6 text-sm text-muted-foreground">
              Assim que houver mais interações, a Roxou mostrará insights automáticos
              aqui.
            </Card>
          )}
        </TabsContent>

        {/* METAS / COMISSÃO */}
        <TabsContent value="metas" className="mt-4">
          <Card className="p-4 space-y-5 max-w-xl">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Comissões (R$ por evento)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <CentsField
                  label="Check-in VIP"
                  value={settings.commission.vip_checkin_cents}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      commission: { ...settings.commission, vip_checkin_cents: v },
                    })
                  }
                />
                <CentsField
                  label="Reserva"
                  value={settings.commission.reservation_cents}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      commission: { ...settings.commission, reservation_cents: v },
                    })
                  }
                />
                <CentsField
                  label="Excursão"
                  value={settings.commission.excursion_cents}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      commission: { ...settings.commission, excursion_cents: v },
                    })
                  }
                />
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Metas mensais</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <NumField
                  label="Check-ins VIP"
                  value={settings.goals.vip_checkins}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      goals: { ...settings.goals, vip_checkins: v },
                    })
                  }
                />
                <NumField
                  label="Reservas"
                  value={settings.goals.reservations}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      goals: { ...settings.goals, reservations: v },
                    })
                  }
                />
                <NumField
                  label="Excursões"
                  value={settings.goals.excursions}
                  onChange={(v) =>
                    setSettings({
                      ...settings,
                      goals: { ...settings.goals, excursions: v },
                    })
                  }
                />
              </div>
            </section>

            <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Salvando…" : "Salvar"}
              </Button>
              <span className="text-xs text-muted-foreground">
                {storageMode === "db"
                  ? "Persistindo no banco (partners.settings)."
                  : storageMode === "local"
                    ? "Salvo localmente neste navegador."
                    : "Detectando armazenamento…"}
              </span>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function labelForKind(kind: string) {
  switch (kind) {
    case "vip_checkin":
      return "Check-in";
    case "vip_entry":
      return "Entrada";
    case "reservation":
      return "Reserva";
    case "excursion":
      return "Excursão";
    case "bio_view":
      return "Bio";
    case "whatsapp_clicked":
      return "WhatsApp";
    case "qr_scanned":
      return "QR";
    default:
      return "Clique";
  }
}

function Kpi({
  label,
  value,
  children,
}: {
  label: string;
  value: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Card className="p-3 md:p-4">
      <div className="text-[11px] md:text-xs text-muted-foreground">{label}</div>
      <div className="text-lg md:text-2xl font-bold tabular-nums">{value}</div>
      {children}
    </Card>
  );
}

function MiniHighlight({
  title,
  name,
  value,
}: {
  title: string;
  name: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 p-3 bg-white/[0.02]">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="font-semibold truncate">{name}</div>
      <div className="text-xs text-muted-foreground">{value}</div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}

function CentsField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (cents: number) => void;
}) {
  const reais = value / 100;
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={0}
        step="0.5"
        value={Number.isFinite(reais) ? reais : 0}
        onChange={(e) =>
          onChange(Math.round((Number(e.target.value) || 0) * 100))
        }
      />
    </div>
  );
}

function CampaignCard({
  campaign,
  promoterSlug,
  promoterName,
}: {
  campaign: CampaignSummary;
  promoterSlug: string | null;
  promoterName: string | null;
}) {
  const target: CampaignTarget = {
    kind: "vip_list",
    slug: campaign.list_public_slug,
    title: campaign.event_title ?? campaign.list_title,
    whenIso: campaign.starts_at,
    eventSlug: campaign.event_slug ?? campaign.list_public_slug,
  };
  const url = buildCampaignUrl(target, { promoterSlug, promoterName });
  const pct = campaign.goal
    ? Math.min(100, Math.round((campaign.checked_in / campaign.goal) * 100))
    : 0;
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">
            {campaign.event_title ?? campaign.list_title}
          </div>
          <div className="text-xs text-muted-foreground">{campaign.list_title}</div>
        </div>
        <Badge variant="outline">
          {campaign.checked_in}/{campaign.goal}
        </Badge>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <Button size="sm" variant="outline" onClick={() => copy(url)}>
          <Copy className="h-3.5 w-3.5 mr-1" /> Copiar link
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir
          </a>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            nativeShare({ title: target.title, text: target.title, url })
          }
        >
          <Share2 className="h-3.5 w-3.5 mr-1" /> Compartilhar
        </Button>
      </div>
    </Card>
  );
}

function ShareKit({
  campaign,
  promoterSlug,
  promoterName,
}: {
  campaign: CampaignSummary;
  promoterSlug: string | null;
  promoterName: string | null;
}) {
  const target: CampaignTarget = {
    kind: "vip_list",
    slug: campaign.list_public_slug,
    title: campaign.event_title ?? campaign.list_title,
    whenIso: campaign.starts_at,
    eventSlug: campaign.event_slug ?? campaign.list_public_slug,
  };
  const ctx = { promoterSlug, promoterName };
  const url = buildCampaignUrl(target, ctx);
  const wa = buildWhatsappText(target, ctx);
  const ig = buildInstagramCaption(target, ctx);
  const st = buildStoriesText(target, ctx);
  const fd = buildFeedText(target, ctx);
  return (
    <Card className="p-4 space-y-3">
      <div className="font-semibold truncate">
        {campaign.event_title ?? campaign.list_title}
      </div>
      <Field label="Link com UTM" value={url} />
      <Field label="WhatsApp" value={wa} multiline>
        <Button size="sm" variant="outline" asChild>
          <a href={buildWhatsappShareLink(wa)} target="_blank" rel="noreferrer">
            Abrir WhatsApp
          </a>
        </Button>
      </Field>
      <Field label="Instagram (caption)" value={ig} multiline />
      <Field label="Stories" value={st} multiline />
      <Field label="Feed" value={fd} multiline />
    </Card>
  );
}

function Field({
  label,
  value,
  multiline,
  children,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-start gap-2">
        {multiline ? (
          <textarea
            readOnly
            value={value}
            className="flex-1 min-h-[72px] rounded-md bg-white/5 border border-white/10 p-2 text-xs"
          />
        ) : (
          <Input readOnly value={value} className="flex-1 text-xs" />
        )}
        <Button size="sm" variant="outline" onClick={() => copy(value)}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
      {children}
    </div>
  );
}

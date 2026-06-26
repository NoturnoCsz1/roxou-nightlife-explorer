/**
 * Partner Promoter Central — Fase GAP B/C
 *
 * Página única que agrega Visão, Campanhas, Ranking, Compartilhar e Metas.
 * Zero novas tabelas. Reutiliza partner_vip_lists, partner_vip_list_entries,
 * partner_promoters, events. Comissão e metas via localStorage (Opção 1).
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Copy, ExternalLink, Target, Trophy, Megaphone, BarChart3, Share2 } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

import { usePartnerAuth } from "../hooks/usePartnerAuth";
import { listPromoters } from "../services/partnerPromoters";
import {
  getCampaigns,
  getPromoterRanking,
  getRecentActivity,
  getDailyCheckInsSeries,
  type CampaignSummary,
} from "../services/promoterCentral";
import {
  loadPromoterSettings,
  savePromoterSettings,
} from "../lib/promoterSettings";
import {
  buildCampaignUrl,
  buildWhatsappText,
  buildInstagramCaption,
  buildWhatsappShareLink,
} from "../lib/campaignLinks";

function copy(text: string) {
  navigator.clipboard?.writeText(text);
  toast({ title: "Copiado", description: "Conteúdo na área de transferência." });
}

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function PartnerPromoterCentralPage() {
  const { selectedPartner } = usePartnerAuth();
  const partnerId = selectedPartner?.id ?? "";

  const [settings, setSettings] = useState(() => loadPromoterSettings(partnerId));
  const [selectedPromoterId, setSelectedPromoterId] = useState<string>("");

  const promotersQ = useQuery({
    queryKey: ["promoters", partnerId],
    queryFn: () => listPromoters(partnerId),
    enabled: !!partnerId,
  });

  const campaignsQ = useQuery({
    queryKey: ["promoter-campaigns", partnerId, settings.perEventGoal],
    queryFn: () => getCampaigns(partnerId, settings.perEventGoal),
    enabled: !!partnerId,
  });

  const rankingQ = useQuery({
    queryKey: ["promoter-ranking", partnerId, settings.commissionPerEntryBRL],
    queryFn: () => getPromoterRanking(partnerId, settings.commissionPerEntryBRL),
    enabled: !!partnerId,
  });

  const activityQ = useQuery({
    queryKey: ["promoter-activity", partnerId],
    queryFn: () => getRecentActivity(partnerId, 12),
    enabled: !!partnerId,
  });

  const seriesQ = useQuery({
    queryKey: ["promoter-series", partnerId],
    queryFn: () => getDailyCheckInsSeries(partnerId, 14),
    enabled: !!partnerId,
  });

  const promoters = promotersQ.data ?? [];
  const selectedPromoter = useMemo(
    () => promoters.find((p) => p.id === selectedPromoterId) ?? null,
    [promoters, selectedPromoterId],
  );

  const totals = useMemo(() => {
    const list = rankingQ.data ?? [];
    return list.reduce(
      (acc, r) => {
        acc.entries += r.total_entries;
        acc.checkins += r.checked_in;
        acc.commission += r.commission_brl;
        return acc;
      },
      { entries: 0, checkins: 0, commission: 0 },
    );
  }, [rankingQ.data]);

  const goalPct = settings.monthlyCheckInGoal
    ? Math.min(100, Math.round((totals.checkins / settings.monthlyCheckInGoal) * 100))
    : 0;

  if (!partnerId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Selecione um parceiro para acessar a Central do Promoter.
      </div>
    );
  }

  return (
    <div className="px-4 py-5 md:px-6 md:py-8 max-w-7xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Central do Promoter</h1>
        <p className="text-sm text-muted-foreground">
          Campanhas, comissões, metas e ranking — tudo num só lugar.
        </p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Entradas (mês)" value={totals.entries} />
        <Kpi label="Check-ins (mês)" value={totals.checkins} />
        <Kpi label="Comissão prevista" value={BRL(totals.commission)} />
        <Kpi label={`Meta mensal (${goalPct}%)`} value={`${totals.checkins}/${settings.monthlyCheckInGoal}`}>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-2">
            <div className="h-full bg-primary" style={{ width: `${goalPct}%` }} />
          </div>
        </Kpi>
      </div>

      <Tabs defaultValue="campanhas" className="w-full">
        <TabsList className="grid grid-cols-5 w-full md:w-auto">
          <TabsTrigger value="campanhas"><Megaphone className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Campanhas</span></TabsTrigger>
          <TabsTrigger value="ranking"><Trophy className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Ranking</span></TabsTrigger>
          <TabsTrigger value="share"><Share2 className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Compartilhar</span></TabsTrigger>
          <TabsTrigger value="atividade"><BarChart3 className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Atividade</span></TabsTrigger>
          <TabsTrigger value="metas"><Target className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Metas</span></TabsTrigger>
        </TabsList>

        {/* CAMPANHAS */}
        <TabsContent value="campanhas" className="space-y-3 mt-4">
          {campaignsQ.isLoading && <Card className="p-6 text-sm text-muted-foreground">Carregando…</Card>}
          {!campaignsQ.isLoading && !(campaignsQ.data ?? []).length && (
            <Card className="p-6 text-sm text-muted-foreground">
              Nenhuma campanha ativa. Crie uma Lista VIP em <code>/lista-vip</code> para gerar uma campanha automaticamente.
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
            <div className="grid grid-cols-12 px-4 py-2 text-xs font-medium text-muted-foreground border-b border-white/10">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Promoter</div>
              <div className="col-span-2 text-right">Check-ins</div>
              <div className="col-span-2 text-right">Conv.</div>
              <div className="col-span-2 text-right">Comissão</div>
            </div>
            {(rankingQ.data ?? []).map((r, i) => (
              <div key={r.promoter_id ?? `_${i}`} className="grid grid-cols-12 px-4 py-3 text-sm border-b border-white/5 items-center">
                <div className="col-span-1 font-semibold">{i + 1}</div>
                <div className="col-span-5 truncate">{r.promoter_name}</div>
                <div className="col-span-2 text-right font-semibold">{r.checked_in}</div>
                <div className="col-span-2 text-right text-muted-foreground">{r.conversion_rate}%</div>
                <div className="col-span-2 text-right">{BRL(r.commission_brl)}</div>
              </div>
            ))}
            {!(rankingQ.data ?? []).length && (
              <div className="p-6 text-sm text-muted-foreground">Sem dados no mês.</div>
            )}
          </Card>
        </TabsContent>

        {/* SHARE KIT */}
        <TabsContent value="share" className="mt-4 space-y-4">
          <Card className="p-4 space-y-3">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Atribuir compartilhamento a um promoter</Label>
            <Select value={selectedPromoterId || "_none"} onValueChange={(v) => setSelectedPromoterId(v === "_none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Sem promoter" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Sem promoter (link direto)</SelectItem>
                {promoters.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A atribuição vai como <code>utm_content=promoter:&lt;slug&gt;</code> nos links abaixo.
            </p>
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

        {/* ATIVIDADE */}
        <TabsContent value="atividade" className="mt-4 space-y-4">
          <Card className="p-4">
            <div className="text-sm font-medium mb-2">Check-ins (últimos 14 dias)</div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={seriesQ.data ?? []}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={24} />
                  <Tooltip />
                  <Line type="monotone" dataKey="checkins" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-0 overflow-hidden">
            <div className="px-4 py-2 text-xs font-medium text-muted-foreground border-b border-white/10">Últimas atividades</div>
            {(activityQ.data ?? []).map((a, i) => (
              <div key={i} className="px-4 py-3 text-sm border-b border-white/5 flex items-center gap-2">
                <Badge variant={a.kind === "vip_checkin" ? "default" : "secondary"} className="shrink-0">
                  {a.kind === "vip_checkin" ? "Check-in" : "Entrada"}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{a.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{a.subtitle}</div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {new Date(a.at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
            {!(activityQ.data ?? []).length && (
              <div className="p-6 text-sm text-muted-foreground">Sem atividade recente.</div>
            )}
          </Card>
        </TabsContent>

        {/* METAS / COMISSÃO */}
        <TabsContent value="metas" className="mt-4">
          <Card className="p-4 space-y-4 max-w-md">
            <div className="space-y-2">
              <Label>Comissão por check-in (R$)</Label>
              <Input
                type="number"
                min={0}
                step="0.5"
                value={settings.commissionPerEntryBRL}
                onChange={(e) => setSettings({ ...settings, commissionPerEntryBRL: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Meta mensal de check-ins</Label>
              <Input
                type="number"
                min={0}
                value={settings.monthlyCheckInGoal}
                onChange={(e) => setSettings({ ...settings, monthlyCheckInGoal: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Meta padrão por evento</Label>
              <Input
                type="number"
                min={0}
                value={settings.perEventGoal}
                onChange={(e) => setSettings({ ...settings, perEventGoal: Number(e.target.value) || 0 })}
              />
            </div>
            <Button
              onClick={() => {
                savePromoterSettings(partnerId, settings);
                toast({ title: "Metas atualizadas" });
              }}
            >
              Salvar
            </Button>
            <p className="text-xs text-muted-foreground">
              Preferência salva localmente neste navegador (Opção 1: sem alterar o banco).
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({ label, value, children }: { label: string; value: React.ReactNode; children?: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl md:text-2xl font-bold tabular-nums">{value}</div>
      {children}
    </Card>
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
  const target = {
    kind: "vip_list" as const,
    slug: campaign.list_public_slug,
    title: campaign.event_title ?? campaign.list_title,
    whenIso: campaign.starts_at,
  };
  const url = buildCampaignUrl(target, { promoterSlug, promoterName });
  const pct = campaign.goal ? Math.min(100, Math.round((campaign.checked_in / campaign.goal) * 100)) : 0;
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">{campaign.event_title ?? campaign.list_title}</div>
          <div className="text-xs text-muted-foreground">{campaign.list_title}</div>
        </div>
        <Badge variant="outline">{campaign.checked_in}/{campaign.goal}</Badge>
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
  const target = {
    kind: "vip_list" as const,
    slug: campaign.list_public_slug,
    title: campaign.event_title ?? campaign.list_title,
    whenIso: campaign.starts_at,
  };
  const url = buildCampaignUrl(target, { promoterSlug, promoterName });
  const wa = buildWhatsappText(target, { promoterSlug, promoterName });
  const ig = buildInstagramCaption(target, { promoterSlug, promoterName });
  return (
    <Card className="p-4 space-y-3">
      <div className="font-semibold truncate">{campaign.event_title ?? campaign.list_title}</div>
      <Field label="Link com UTM" value={url} />
      <Field label="WhatsApp" value={wa} multiline>
        <Button size="sm" variant="outline" asChild>
          <a href={buildWhatsappShareLink(wa)} target="_blank" rel="noreferrer">Abrir WhatsApp</a>
        </Button>
      </Field>
      <Field label="Instagram" value={ig} multiline />
    </Card>
  );
}

function Field({ label, value, multiline, children }: { label: string; value: string; multiline?: boolean; children?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="flex items-start gap-2">
        {multiline ? (
          <textarea
            readOnly
            value={value}
            className="flex-1 min-h-[80px] rounded-md bg-white/5 border border-white/10 p-2 text-xs"
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

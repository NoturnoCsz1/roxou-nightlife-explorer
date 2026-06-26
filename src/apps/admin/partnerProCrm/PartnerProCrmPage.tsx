/**
 * PartnerProCrmPage — CRM completo para o funil Partner Pro.
 * Abas: Kanban, Lista, Follow-ups, Métricas. Drawer com timeline + ações.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  type PartnerProActivity,
  type PartnerProLead,
  STAGES,
  type Stage,
  addNote,
  convertToPartner,
  listActivities,
  listLeads,
  logWhatsAppOpened,
  scheduleFollowUp,
  scoreBucket,
  setStage,
  slugify,
  updateLead,
  whatsappLink,
} from "./service";

type Tab = "kanban" | "lista" | "followups" | "metricas";

const TABS: Array<{ value: Tab; label: string }> = [
  { value: "kanban", label: "Kanban" },
  { value: "lista", label: "Lista" },
  { value: "followups", label: "Follow-ups" },
  { value: "metricas", label: "Métricas" },
];

const PartnerProCrmPage = () => {
  const [tab, setTab] = useState<Tab>("kanban");
  const [leads, setLeads] = useState<PartnerProLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PartnerProLead | null>(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<Stage | "all">("all");

  const reload = async () => {
    setLoading(true);
    try {
      const data = await listLeads();
      setLeads(data);
      if (selected) {
        const fresh = data.find((l) => l.id === selected.id);
        if (fresh) setSelected(fresh);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (stageFilter !== "all" && l.stage !== stageFilter) return false;
      if (!q) return true;
      return (
        l.estabelecimento.toLowerCase().includes(q) ||
        l.responsavel.toLowerCase().includes(q) ||
        (l.cidade ?? "").toLowerCase().includes(q) ||
        (l.categoria ?? "").toLowerCase().includes(q) ||
        (l.whatsapp ?? "").includes(q) ||
        (l.instagram ?? "").toLowerCase().includes(q)
      );
    });
  }, [leads, search, stageFilter]);

  const metrics = useMemo(() => computeMetrics(leads), [leads]);

  return (
    <div className="space-y-4">
      <header className="space-y-3">
        <div>
          <h1 className="text-xl font-bold">CRM Partner Pro</h1>
          <p className="text-xs text-muted-foreground">
            Gerencie prospects, contatos, aprovações e conversões do Partner Pro.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 border-b border-border/40 overflow-x-auto -mb-px">
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTab(t.value)}
                className={`px-3 py-1.5 text-sm border-b-2 whitespace-nowrap ${
                  tab === t.value
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
                {t.value === "followups" && metrics.overdueFollowups > 0 ? (
                  <span className="ml-1 rounded-full bg-red-500/30 text-red-200 px-1.5 text-[10px]">
                    {metrics.overdueFollowups}
                  </span>
                ) : null}
                {t.value === "kanban" && metrics.byStage.new > 0 ? (
                  <span className="ml-1 rounded-full bg-sky-500/30 text-sky-200 px-1.5 text-[10px]">
                    {metrics.byStage.new}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {(tab === "kanban" || tab === "lista") && (
          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, cidade, categoria, WhatsApp..."
              className="flex-1 min-w-[200px] h-9 px-3 rounded-md border border-border bg-background text-sm"
            />
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as Stage | "all")}
              className="h-9 px-2 rounded-md border border-border bg-background text-sm"
            >
              <option value="all">Todas as etapas</option>
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : tab === "kanban" ? (
        <KanbanView leads={filtered} onSelect={setSelected} />
      ) : tab === "lista" ? (
        <ListView leads={filtered} onSelect={setSelected} />
      ) : tab === "followups" ? (
        <FollowupsView leads={leads} onSelect={setSelected} />
      ) : (
        <MetricsView metrics={metrics} />
      )}

      {selected && (
        <LeadDrawer lead={selected} onClose={() => setSelected(null)} onChanged={reload} />
      )}
    </div>
  );
};

// =================== Kanban ===================
const KanbanView = ({
  leads,
  onSelect,
}: {
  leads: PartnerProLead[];
  onSelect: (l: PartnerProLead) => void;
}) => {
  const [activeStage, setActiveStage] = useState<Stage>("new");
  const grouped = useMemo(() => {
    const map: Record<Stage, PartnerProLead[]> = {
      new: [], contacted: [], qualified: [], approved: [], rejected: [], converted: [],
    };
    for (const l of leads) map[l.stage]?.push(l);
    return map;
  }, [leads]);

  return (
    <>
      {/* Mobile: tabs por etapa */}
      <div className="md:hidden">
        <div className="flex gap-1 overflow-x-auto pb-2">
          {STAGES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setActiveStage(s.value)}
              className={`px-3 py-1.5 text-xs rounded-md whitespace-nowrap ${
                activeStage === s.value ? s.tone : "bg-secondary/40 text-muted-foreground"
              }`}
            >
              {s.label} <span className="opacity-60">{grouped[s.value].length}</span>
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {grouped[activeStage].length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Vazio.</p>
          ) : (
            grouped[activeStage].map((l) => <LeadCard key={l.id} lead={l} onSelect={onSelect} />)
          )}
        </div>
      </div>

      {/* Desktop: colunas */}
      <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAGES.map((s) => (
          <div key={s.value} className="rounded-xl border border-border/40 bg-card/30 p-2 min-h-[300px]">
            <div className={`text-[11px] uppercase tracking-wider rounded px-2 py-1 mb-2 ${s.tone}`}>
              {s.label} · {grouped[s.value].length}
            </div>
            <div className="space-y-2">
              {grouped[s.value].map((l) => (
                <LeadCard key={l.id} lead={l} onSelect={onSelect} compact />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

const LeadCard = ({
  lead,
  onSelect,
  compact,
}: {
  lead: PartnerProLead;
  onSelect: (l: PartnerProLead) => void;
  compact?: boolean;
}) => {
  const bucket = scoreBucket(lead.lead_score);
  return (
    <button
      type="button"
      onClick={() => onSelect(lead)}
      className="w-full text-left rounded-lg border border-border/40 bg-card/60 hover:bg-card/80 p-2.5 space-y-1.5 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm truncate flex-1">{lead.estabelecimento}</p>
        <span className={`text-[9px] uppercase rounded px-1.5 py-0.5 ${bucket.tone}`}>
          {lead.lead_score}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground truncate">
        {[lead.categoria, lead.cidade].filter(Boolean).join(" · ")}
      </p>
      {!compact && (
        <p className="text-[11px] text-muted-foreground truncate">
          {lead.responsavel} · {lead.whatsapp}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-1 pt-0.5">
        <span className={`text-[9px] rounded px-1.5 py-0.5 ${bucket.tone}`}>{bucket.label}</span>
        {lead.next_follow_up_at && (
          <span className="text-[9px] rounded px-1.5 py-0.5 bg-amber-500/15 text-amber-300">
            FU: {new Date(lead.next_follow_up_at).toLocaleDateString("pt-BR")}
          </span>
        )}
        {lead.tags.slice(0, 2).map((t) => (
          <span key={t} className="text-[9px] rounded px-1.5 py-0.5 bg-secondary/60">
            #{t}
          </span>
        ))}
      </div>
    </button>
  );
};

// =================== Lista ===================
const ListView = ({
  leads,
  onSelect,
}: {
  leads: PartnerProLead[];
  onSelect: (l: PartnerProLead) => void;
}) =>
  leads.length === 0 ? (
    <p className="text-sm text-muted-foreground">Nenhum lead.</p>
  ) : (
    <div className="space-y-2">
      {leads.map((l) => <LeadCard key={l.id} lead={l} onSelect={onSelect} />)}
    </div>
  );

// =================== Follow-ups ===================
const FollowupsView = ({
  leads,
  onSelect,
}: {
  leads: PartnerProLead[];
  onSelect: (l: PartnerProLead) => void;
}) => {
  const now = Date.now();
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const week = todayEnd.getTime() + 7 * 86400000;
  const overdue: PartnerProLead[] = [];
  const today: PartnerProLead[] = [];
  const next7: PartnerProLead[] = [];
  for (const l of leads) {
    if (!l.next_follow_up_at) continue;
    const t = new Date(l.next_follow_up_at).getTime();
    if (t < now) overdue.push(l);
    else if (t <= todayEnd.getTime()) today.push(l);
    else if (t <= week) next7.push(l);
  }
  const Section = ({ title, items, tone }: { title: string; items: PartnerProLead[]; tone: string }) => (
    <section className="space-y-2">
      <h2 className={`text-xs font-bold uppercase tracking-wider ${tone}`}>
        {title} · {items.length}
      </h2>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum.</p>
      ) : (
        items.map((l) => <LeadCard key={l.id} lead={l} onSelect={onSelect} />)
      )}
    </section>
  );
  return (
    <div className="space-y-5">
      <Section title="Atrasados" items={overdue} tone="text-red-400" />
      <Section title="Hoje" items={today} tone="text-amber-400" />
      <Section title="Próximos 7 dias" items={next7} tone="text-sky-400" />
    </div>
  );
};

// =================== Métricas ===================
interface Metrics {
  total: number;
  newToday: number;
  new7d: number;
  byStage: Record<Stage, number>;
  conversionRate: number;
  avgTimeToContactH: number | null;
  overdueFollowups: number;
  byCategory: Array<{ key: string; count: number }>;
  byCity: Array<{ key: string; count: number }>;
}

function computeMetrics(leads: PartnerProLead[]): Metrics {
  const byStage: Record<Stage, number> = {
    new: 0, contacted: 0, qualified: 0, approved: 0, rejected: 0, converted: 0,
  };
  let newToday = 0, new7d = 0;
  let timeToContactSum = 0, timeToContactN = 0;
  let overdue = 0;
  const cat = new Map<string, number>();
  const city = new Map<string, number>();
  const now = Date.now();
  const startToday = new Date(); startToday.setHours(0,0,0,0);
  const last7 = now - 7 * 86400000;

  for (const l of leads) {
    byStage[l.stage] = (byStage[l.stage] ?? 0) + 1;
    const created = new Date(l.created_at).getTime();
    if (created >= startToday.getTime()) newToday++;
    if (created >= last7) new7d++;
    if (l.contacted_at) {
      const c = new Date(l.contacted_at).getTime();
      timeToContactSum += c - created;
      timeToContactN++;
    }
    if (l.next_follow_up_at && new Date(l.next_follow_up_at).getTime() < now) overdue++;
    const ck = l.categoria || "—";
    cat.set(ck, (cat.get(ck) ?? 0) + 1);
    const yk = l.cidade || "—";
    city.set(yk, (city.get(yk) ?? 0) + 1);
  }
  const total = leads.length;
  const converted = byStage.converted;
  return {
    total,
    newToday,
    new7d,
    byStage,
    conversionRate: total ? (converted / total) * 100 : 0,
    avgTimeToContactH: timeToContactN ? timeToContactSum / timeToContactN / 3600000 : null,
    overdueFollowups: overdue,
    byCategory: [...cat.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count),
    byCity: [...city.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count),
  };
}

const MetricsView = ({ metrics: m }: { metrics: Metrics }) => {
  const Kpi = ({ label, value }: { label: string; value: string | number }) => (
    <div className="rounded-xl border border-border/40 bg-card/40 p-3">
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Kpi label="Novos hoje" value={m.newToday} />
        <Kpi label="Novos 7 dias" value={m.new7d} />
        <Kpi label="Em contato" value={m.byStage.contacted} />
        <Kpi label="Qualificados" value={m.byStage.qualified} />
        <Kpi label="Aprovados" value={m.byStage.approved} />
        <Kpi label="Convertidos" value={m.byStage.converted} />
        <Kpi label="Taxa conversão" value={`${m.conversionRate.toFixed(1)}%`} />
        <Kpi
          label="Tempo médio até contato"
          value={m.avgTimeToContactH == null ? "—" : `${m.avgTimeToContactH.toFixed(1)}h`}
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border/40 bg-card/40 p-3">
          <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2">Por categoria</h3>
          <ul className="space-y-1 text-sm">
            {m.byCategory.slice(0, 10).map((r) => (
              <li key={r.key} className="flex justify-between">
                <span>{r.key}</span>
                <span className="text-muted-foreground">{r.count}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/40 p-3">
          <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2">Por cidade</h3>
          <ul className="space-y-1 text-sm">
            {m.byCity.slice(0, 10).map((r) => (
              <li key={r.key} className="flex justify-between">
                <span>{r.key}</span>
                <span className="text-muted-foreground">{r.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

// =================== Drawer ===================
const LeadDrawer = ({
  lead,
  onClose,
  onChanged,
}: {
  lead: PartnerProLead;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}) => {
  const [activities, setActivities] = useState<PartnerProActivity[]>([]);
  const [note, setNote] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const bucket = scoreBucket(lead.lead_score);

  useEffect(() => {
    void listActivities(lead.id).then(setActivities).catch(() => undefined);
  }, [lead.id]);

  const wrap = async (fn: () => Promise<void>, success?: string) => {
    setBusy(true);
    try {
      await fn();
      if (success) toast.success(success);
      await onChanged();
      const acts = await listActivities(lead.id);
      setActivities(acts);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end" onClick={onClose}>
      <aside
        className="w-full max-w-md h-full bg-background border-l border-border/40 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/40 p-3 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="font-bold truncate">{lead.estabelecimento}</h2>
            <p className="text-[11px] text-muted-foreground truncate">
              {[lead.categoria, lead.cidade].filter(Boolean).join(" · ")}
            </p>
          </div>
          <button onClick={onClose} className="text-sm px-2 py-1">✕</button>
        </div>

        <div className="p-3 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <span className={`text-[10px] rounded px-2 py-0.5 ${bucket.tone}`}>
              Score {lead.lead_score} · {bucket.label}
            </span>
            <span className="text-[10px] rounded px-2 py-0.5 bg-secondary/60">
              {STAGES.find((s) => s.value === lead.stage)?.label ?? lead.stage}
            </span>
            <span className="text-[10px] rounded px-2 py-0.5 bg-secondary/60">
              prioridade: {lead.priority}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <Info label="Responsável" value={lead.responsavel} />
            <Info label="WhatsApp" value={lead.whatsapp} />
            <Info label="Instagram" value={lead.instagram ?? "—"} />
            <Info label="Cidade" value={lead.cidade ?? "—"} />
            <Info label="Criado em" value={new Date(lead.created_at).toLocaleString("pt-BR")} />
            <Info
              label="Última atividade"
              value={new Date(lead.last_activity_at).toLocaleString("pt-BR")}
            />
          </div>

          {lead.mensagem && (
            <div className="rounded-md border border-border/40 bg-card/40 p-2 text-xs italic">
              "{lead.mensagem}"
            </div>
          )}

          {/* Ações rápidas */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href={whatsappLink(lead)}
              target="_blank"
              rel="noreferrer"
              onClick={() => void wrap(() => logWhatsAppOpened(lead))}
              className="h-9 inline-flex items-center justify-center rounded-md bg-emerald-500 text-white text-sm font-semibold"
            >
              WhatsApp
            </a>
            {lead.instagram_normalized && (
              <a
                href={`https://instagram.com/${lead.instagram_normalized}`}
                target="_blank"
                rel="noreferrer"
                className="h-9 inline-flex items-center justify-center rounded-md border border-border text-sm"
              >
                Instagram
              </a>
            )}
          </div>

          {/* Mudança de etapa */}
          <div className="space-y-1">
            <p className="text-[10px] uppercase text-muted-foreground">Mover etapa</p>
            <div className="flex flex-wrap gap-1">
              {STAGES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  disabled={busy || s.value === lead.stage}
                  onClick={() =>
                    wrap(() => setStage(lead.id, s.value), `Etapa: ${s.label}`)
                  }
                  className={`text-[11px] px-2 py-1 rounded-md ${
                    s.value === lead.stage ? s.tone : "bg-secondary/40 hover:bg-secondary/70"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prioridade */}
          <div className="space-y-1">
            <p className="text-[10px] uppercase text-muted-foreground">Prioridade</p>
            <div className="flex gap-1">
              {(["low", "normal", "high", "urgent"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={busy || p === lead.priority}
                  onClick={() => wrap(() => updateLead(lead.id, { priority: p }))}
                  className={`text-[11px] px-2 py-1 rounded-md ${
                    p === lead.priority ? "bg-primary/20 text-primary" : "bg-secondary/40"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Nota */}
          <div className="space-y-1">
            <p className="text-[10px] uppercase text-muted-foreground">Adicionar observação</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full px-2 py-1.5 text-sm rounded-md border border-border bg-background"
              placeholder="Anotações internas..."
            />
            <Button
              size="sm"
              disabled={busy || !note.trim()}
              onClick={() =>
                wrap(async () => {
                  await addNote(lead.id, note.trim());
                  setNote("");
                }, "Nota adicionada")
              }
            >
              Salvar nota
            </Button>
          </div>

          {/* Follow-up */}
          <div className="space-y-1">
            <p className="text-[10px] uppercase text-muted-foreground">Agendar follow-up</p>
            <div className="flex gap-1">
              <input
                type="datetime-local"
                value={followUpAt}
                onChange={(e) => setFollowUpAt(e.target.value)}
                className="flex-1 h-9 px-2 text-sm rounded-md border border-border bg-background"
              />
              <Button
                size="sm"
                disabled={busy || !followUpAt}
                onClick={() =>
                  wrap(async () => {
                    await scheduleFollowUp(lead.id, new Date(followUpAt).toISOString());
                    setFollowUpAt("");
                  }, "Follow-up agendado")
                }
              >
                Agendar
              </Button>
            </div>
            {lead.next_follow_up_at && (
              <p className="text-[10px] text-muted-foreground">
                Atual: {new Date(lead.next_follow_up_at).toLocaleString("pt-BR")}
              </p>
            )}
          </div>

          {/* Conversão */}
          {lead.stage !== "converted" && (
            <Button
              className="w-full"
              variant="default"
              disabled={busy}
              onClick={() => setShowConvert(true)}
            >
              Converter em Partner
            </Button>
          )}
          {lead.converted_partner_id && (
            <p className="text-[11px] text-emerald-400">
              ✓ Convertido em partner {lead.converted_partner_id.slice(0, 8)}…
            </p>
          )}

          {/* Timeline */}
          <div className="space-y-1 pt-2 border-t border-border/40">
            <p className="text-[10px] uppercase text-muted-foreground">Timeline</p>
            {activities.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem atividades.</p>
            ) : (
              <ol className="space-y-1.5">
                {activities.map((a) => (
                  <li key={a.id} className="text-xs border-l-2 border-primary/40 pl-2">
                    <p className="font-medium">{a.type.replace(/_/g, " ")}</p>
                    {a.message && <p className="text-muted-foreground">{a.message}</p>}
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleString("pt-BR")}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {showConvert && (
          <ConvertModal
            lead={lead}
            onClose={() => setShowConvert(false)}
            onDone={async () => {
              setShowConvert(false);
              await onChanged();
            }}
          />
        )}
      </aside>
    </div>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
    <p className="truncate">{value}</p>
  </div>
);

// =================== Convert Modal ===================
const ConvertModal = ({
  lead,
  onClose,
  onDone,
}: {
  lead: PartnerProLead;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) => {
  const [name, setName] = useState(lead.estabelecimento);
  const [slug, setSlug] = useState(slugify(lead.estabelecimento));
  const [type, setType] = useState(lead.categoria ?? "");
  const [city, setCity] = useState(lead.cidade ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim() || !slug.trim()) {
      toast.error("Nome e slug são obrigatórios.");
      return;
    }
    setBusy(true);
    try {
      const partnerId = await convertToPartner(lead, {
        name: name.trim(),
        slug: slug.trim(),
        type: type.trim() || null,
        city: city.trim() || null,
        instagram: lead.instagram_normalized ? `@${lead.instagram_normalized}` : null,
      });
      toast.success(`Partner criado: ${partnerId.slice(0, 8)}…`, {
        description:
          "Próximos passos manuais: vincular partner_users e liberar beta_access conforme padrão.",
      });
      await onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao converter");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-background p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold">Converter em Partner</h3>
        <div className="space-y-2 text-sm">
          <label className="block">
            <span className="text-[11px] text-muted-foreground">Nome</span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlug(slugify(e.target.value));
              }}
              className="w-full h-9 px-2 rounded-md border border-border bg-background"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-muted-foreground">Slug</span>
            <input
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              className="w-full h-9 px-2 rounded-md border border-border bg-background"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-muted-foreground">Categoria / tipo</span>
            <input
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full h-9 px-2 rounded-md border border-border bg-background"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-muted-foreground">Cidade</span>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full h-9 px-2 rounded-md border border-border bg-background"
            />
          </label>
        </div>
        <div className="text-[11px] text-muted-foreground rounded-md bg-secondary/40 p-2 space-y-0.5">
          <p className="font-medium">Checklist pós-conversão:</p>
          <ul className="list-disc list-inside">
            <li>Convidar dono via partner_users</li>
            <li>Liberar partner_beta_access se aplicável</li>
            <li>Confirmar categoria/cidade no perfil</li>
          </ul>
        </div>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button size="sm" onClick={submit} disabled={busy}>
            {busy ? "Criando..." : "Criar partner"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PartnerProCrmPage;

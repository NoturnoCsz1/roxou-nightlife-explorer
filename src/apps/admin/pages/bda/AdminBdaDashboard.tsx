import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, RefreshCw, Settings2 } from "lucide-react";
import { toast } from "sonner";
import {
  BdaAdminStats,
  fetchAdminDashboardStats,
  fetchBdaSettings,
  updateBdaSettings,
} from "@/modules/bda/bdaService";
import { BDA_DEFAULT_SETTINGS, type BdaSettings } from "@/components/bda/bdaConfig";

const CARDS: Array<{ key: keyof BdaAdminStats; label: string }> = [
  { key: "total_registrations", label: "Total de inscrições" },
  { key: "solo_registrations", label: "Inscrições Solo" },
  { key: "dupla_registrations", label: "Inscrições em Dupla" },
  { key: "adults", label: "Participantes adultos" },
  { key: "minors", label: "Participantes menores" },
  { key: "aguardando_responsavel", label: "Aguardando responsável" },
  { key: "aguardando_analise", label: "Aguardando análise" },
  { key: "pendencia", label: "Com pendência" },
  { key: "aprovada_privada", label: "Aprovadas (privadas)" },
  { key: "aprovada_publica", label: "Aprovadas (públicas)" },
  { key: "recusada", label: "Recusadas" },
  { key: "cancelada", label: "Canceladas" },
  { key: "public_participants", label: "Publicados no site" },
  { key: "active_partners", label: "Parceiros ativos" },
];

export default function AdminBdaDashboard() {
  const [stats, setStats] = useState<BdaAdminStats | null>(null);
  const [settings, setSettings] = useState<BdaSettings>(BDA_DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [s, cfg] = await Promise.all([fetchAdminDashboardStats(), fetchBdaSettings()]);
      setStats(s);
      setSettings(cfg);
    } catch (e: any) {
      setError(e.message || "Falha ao carregar indicadores.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(patch: Partial<BdaSettings>) {
    setSaving(true);
    try {
      await updateBdaSettings(patch);
      setSettings((prev) => ({ ...prev, ...patch }));
      toast.success("Configuração atualizada.");
    } catch (e: any) {
      toast.error(e.message || "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-black">Batalha de Aura — Painel</h1>
          <p className="text-xs text-muted-foreground">
            Indicadores calculados em tempo real a partir das inscrições reais.
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-border/40 px-4 text-xs"
        >
          <RefreshCw className="h-4 w-4" /> Atualizar
        </button>
      </div>

      {/* Configuração central */}
      <section className="rounded-2xl border border-border/40 bg-card/40 p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Settings2 className="h-4 w-4" /> Configuração do hotsite
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border/30 p-3 text-sm">
            <span>Inscrições abertas</span>
            <input
              type="checkbox"
              className="h-5 w-5"
              disabled={saving}
              checked={settings.registrations_open}
              onChange={(e) => save({ registrations_open: e.target.checked })}
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border/30 p-3 text-sm">
            <span>Exibir lista pública</span>
            <input
              type="checkbox"
              className="h-5 w-5"
              disabled={saving}
              checked={settings.public_list_enabled}
              onChange={(e) => save({ public_list_enabled: e.target.checked })}
            />
          </label>
          <label className="rounded-xl border border-border/30 p-3 text-sm sm:col-span-2">
            <span className="block text-xs text-muted-foreground">
              Data do evento (vazio = “Data em breve”, sem contagem regressiva)
            </span>
            <input
              type="datetime-local"
              className="mt-2 h-10 w-full rounded-lg border border-border/40 bg-background px-3 text-sm"
              defaultValue={
                settings.event_date ? settings.event_date.slice(0, 16) : ""
              }
              disabled={saving}
              onBlur={(e) =>
                save({ event_date: e.target.value ? `${e.target.value}:00-03:00` : null })
              }
            />
          </label>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando indicadores…
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {CARDS.map((c) => (
            <div key={c.key} className="rounded-2xl border border-border/40 bg-card/40 p-4">
              <div className="font-display text-2xl font-black">{stats[c.key] ?? 0}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {c.label}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <Link
        to="/admin/bda/inscricoes"
        className="inline-flex h-11 items-center rounded-xl border border-border/40 px-5 text-xs font-semibold uppercase tracking-wider"
      >
        Ir para moderação de inscrições
      </Link>
    </div>
  );
}

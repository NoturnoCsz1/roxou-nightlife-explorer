/**
 * AdminSystem — FASE 10G.1
 *
 * Painel mínimo de saúde da VPS. Faz fetch de endpoints públicos
 * (/health, /partner/health) e — quando disponíveis na VPS —
 * /api/system/pm2 e /api/system/host. Em ambiente Lovable preview,
 * apenas /health e /partner/health respondem (servidos por arquivos
 * estáticos em public/), os demais retornam "indisponível".
 */
import { useEffect, useState } from "react";
import { Activity, Cpu, HardDrive, MemoryStick, RefreshCw, Server, Trash2 } from "lucide-react";
import { getBulkCacheStats } from "@/lib/bulkEventsCache";
import { clearBulkCacheIdb, bulkCacheCountIdb } from "@/lib/bulkEventsIndexedDbCache";
import { toast } from "sonner";

type HealthPayload = {
  status?: string;
  service?: string;
  version?: string;
  build?: string;
  pwa_enabled?: boolean;
  uptime?: number | string;
  note?: string;
};

type PmProcess = {
  name: string;
  status: string;
  uptime?: number;
  restarts?: number;
  memory?: number;
  cpu?: number;
};

type HostMetrics = {
  load_avg?: [number, number, number];
  memory?: { used: number; total: number };
  disk?: { used: number; total: number };
  cpu_pct?: number;
};

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

function Card({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="text-xs text-muted-foreground space-y-1.5">{children}</div>
    </div>
  );
}

function bytesToMb(n?: number) {
  if (!n || n <= 0) return "—";
  return `${(n / 1024 / 1024).toFixed(0)} MB`;
}

const AdminSystem = () => {
  const [web, setWeb] = useState<HealthPayload | null>(null);
  const [partner, setPartner] = useState<HealthPayload | null>(null);
  const [pm2, setPm2] = useState<PmProcess[] | null>(null);
  const [host, setHost] = useState<HostMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [idbCount, setIdbCount] = useState<number>(0);

  async function refresh() {
    setLoading(true);
    const [w, p, pm, h, c] = await Promise.all([
      fetchJson<HealthPayload>("/health"),
      fetchJson<HealthPayload>("/partner/health"),
      fetchJson<{ processes: PmProcess[] }>("/api/system/pm2"),
      fetchJson<HostMetrics>("/api/system/host"),
      bulkCacheCountIdb(),
    ]);
    setWeb(w);
    setPartner(p);
    setPm2(pm?.processes ?? null);
    setHost(h);
    setIdbCount(c);
    setNow(Date.now());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // FASE 10G.1.1 — auto-refresh a cada 5s para virar monitor real
    const t = setInterval(refresh, 5_000);
    return () => clearInterval(t);
  }, []);

  async function handleClearCache() {
    await clearBulkCacheIdb();
    try { sessionStorage.clear(); } catch { /* ignore */ }
    setIdbCount(0);
    toast.success("Cache de flyers limpo.");
  }

  const cache = getBulkCacheStats();
  const buildTime = typeof __ROXOU_BUILD_TIME__ !== "undefined" ? __ROXOU_BUILD_TIME__ : "—";
  const pwaEnabled = typeof __ROXOU_PWA_ENABLED__ !== "undefined" ? __ROXOU_PWA_ENABLED__ : true;

  return (
    <div className="md:ml-44 max-w-5xl pb-12">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Sistema</h1>
          <p className="text-[11px] text-muted-foreground">
            Saúde da VPS, processos PM2 e métricas do bundle atual.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-secondary/40 px-3 py-1.5 text-xs hover:bg-secondary/60 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card title="Bundle (cliente)" icon={Activity}>
          <p><span className="text-foreground/80">Build:</span> {buildTime}</p>
          <p><span className="text-foreground/80">PWA habilitado:</span> {String(pwaEnabled)}</p>
          <p><span className="text-foreground/80">User agent:</span> <span className="break-all">{navigator.userAgent}</span></p>
          <p><span className="text-foreground/80">Cache de flyers (sessão):</span> {cache.hits} hits · {cache.misses} miss · {cache.writes} writes</p>
        </Card>

        <Card title="/health (roxou-web)" icon={Server}>
          {web ? (
            <>
              <p><span className="text-foreground/80">Status:</span> {web.status ?? "—"}</p>
              <p><span className="text-foreground/80">Versão:</span> {web.version ?? "—"}</p>
              <p><span className="text-foreground/80">Build:</span> {web.build ?? "—"}</p>
              {web.uptime !== undefined && <p><span className="text-foreground/80">Uptime:</span> {String(web.uptime)}</p>}
              {web.note && <p className="text-[10px] italic">{web.note}</p>}
            </>
          ) : (
            <p className="text-destructive">indisponível</p>
          )}
        </Card>

        <Card title="/partner/health (roxou-partner)" icon={Server}>
          {partner ? (
            <>
              <p><span className="text-foreground/80">Status:</span> {partner.status ?? "—"}</p>
              <p><span className="text-foreground/80">Versão:</span> {partner.version ?? "—"}</p>
              <p><span className="text-foreground/80">Build:</span> {partner.build ?? "—"}</p>
              {partner.note && <p className="text-[10px] italic">{partner.note}</p>}
            </>
          ) : (
            <p className="text-destructive">indisponível</p>
          )}
        </Card>

        <Card title="PM2" icon={Cpu}>
          {pm2 && pm2.length > 0 ? (
            <div className="space-y-1">
              {pm2.map((p) => (
                <div key={p.name} className="flex items-center justify-between border-b border-border/30 pb-1 last:border-0">
                  <span className="text-foreground/90">{p.name}</span>
                  <span className="text-[10px]">
                    {p.status} · restart {p.restarts ?? 0} · {bytesToMb(p.memory)} · cpu {(p.cpu ?? 0).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              <code>/api/system/pm2</code> ainda não está exposto pela VPS. Adicione um endpoint Express que execute
              {" "}<code>pm2 jlist</code> para alimentar este painel.
            </p>
          )}
        </Card>

        <Card title="Host (CPU · RAM · Disco)" icon={HardDrive}>
          {host ? (
            <>
              {host.load_avg && (
                <p><span className="text-foreground/80">Load avg:</span> {host.load_avg.join(" · ")}</p>
              )}
              {host.cpu_pct !== undefined && (
                <p><span className="text-foreground/80">CPU:</span> {host.cpu_pct.toFixed(1)}%</p>
              )}
              {host.memory && (
                <p className="flex items-center gap-1"><MemoryStick className="h-3 w-3" /> RAM {bytesToMb(host.memory.used)} / {bytesToMb(host.memory.total)}</p>
              )}
              {host.disk && (
                <p><span className="text-foreground/80">Disco:</span> {bytesToMb(host.disk.used)} / {bytesToMb(host.disk.total)}</p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">
              <code>/api/system/host</code> ainda não está exposto pela VPS.
            </p>
          )}
        </Card>

        <Card title="Última verificação" icon={Activity}>
          <p>{new Date(now).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
          <p className="text-[10px]">Auto-refresh a cada 30s.</p>
        </Card>
      </div>
    </div>
  );
};

export default AdminSystem;

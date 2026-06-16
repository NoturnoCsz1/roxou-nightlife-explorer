/**
 * AdminLogs — FASE 10G.1
 *
 * Visualizador de logs categorizado. Consome /api/logs?cat=...
 * (a ser exposto pela VPS-side roxou-api). Em ambiente Lovable
 * preview cai num placeholder com instruções.
 *
 * Categorias: Build · Partner · OCR · Analytics · Supabase · Eventos
 */
import { useEffect, useState } from "react";
import { FileText, RefreshCw } from "lucide-react";

const CATEGORIES = [
  { key: "build", label: "Build" },
  { key: "partner", label: "Partner" },
  { key: "ocr", label: "OCR / Flyers" },
  { key: "analytics", label: "Analytics" },
  { key: "supabase", label: "Supabase" },
  { key: "eventos", label: "Eventos" },
] as const;

type LogLine = { ts: string; level?: string; msg: string };

const AdminLogs = () => {
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]["key"]>("build");
  const [lines, setLines] = useState<LogLine[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/logs?cat=${cat}&limit=200`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as { lines: LogLine[] };
      setLines(data.lines ?? []);
    } catch (e) {
      // FASE 10G.1.1 — adaptador mock para preview/dev sem /api/logs.
      const now = new Date();
      const mock: LogLine[] = Array.from({ length: 6 }, (_, i) => ({
        ts: new Date(now.getTime() - i * 60_000).toISOString(),
        level: i === 0 ? "info" : i === 5 ? "warn" : "info",
        msg: `[${cat}] mock entry #${i + 1} — /api/logs ainda não disponível neste ambiente`,
      }));
      setLines(mock);
      setErr(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [cat]);

  return (
    <div className="md:ml-44 max-w-5xl pb-12">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Logs
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Últimas 200 linhas por categoria. Servido por <code>/api/logs</code> (VPS).
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-secondary/40 px-3 py-1.5 text-xs hover:bg-secondary/60 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCat(c.key)}
            className={`rounded-full border px-3 py-1 text-[11px] transition ${
              cat === c.key
                ? "border-primary bg-primary/15 text-primary"
                : "border-border/50 bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border/40 bg-black/50 p-3 font-mono text-[11px] text-emerald-200/90 overflow-x-auto min-h-[40vh]">
        {loading && <p className="opacity-60">carregando…</p>}
        {err && (
          <div className="text-amber-200/90 space-y-2">
            <p>⚠ {err}</p>
            <p className="text-muted-foreground text-[10px]">
              <code>/api/logs</code> ainda não está exposto. Na VPS, adicione no
              roxou-api uma rota que faça <code>tail -n 200</code> de
              {" "}<code>/var/www/roxou/logs/&lt;cat&gt;.log</code> e
              retorne <code>{`{ lines: [{ ts, level, msg }] }`}</code>.
            </p>
          </div>
        )}
        {lines && lines.length === 0 && <p className="opacity-60">sem registros recentes.</p>}
        {lines?.map((ln, i) => (
          <div key={i} className="whitespace-pre-wrap leading-relaxed">
            <span className="text-muted-foreground">{ln.ts}</span>{" "}
            {ln.level && <span className="text-primary">[{ln.level}]</span>}{" "}
            {ln.msg}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminLogs;

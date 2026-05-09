import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Film, Sparkles, Copy, Check, RefreshCw, Trash2, Play, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReelRow {
  id: string;
  event_id: string | null;
  status: string;
  style: string | null;
  script_json: any;
  generated_caption: string | null;
  generated_hashtags: string[] | null;
  suggested_audio: string | null;
  video_prompt: string | null;
  external_prompts: any;
  preview_image_url: string | null;
  created_at: string;
  posted_at: string | null;
}

const STATUS_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "generated", label: "Gerados" },
  { value: "approved", label: "Aprovados" },
  { value: "published", label: "Publicados" },
  { value: "ignored", label: "Ignorados" },
];

const STYLE_LABELS: Record<string, string> = {
  universitario: "🎓 Universitário",
  premium: "✨ Premium",
  funk: "🔥 Funk",
  pagode: "🥁 Pagode",
  eletronico: "🎧 Eletrônico",
  sertanejo: "🤠 Sertanejo",
  barzinho: "🍷 Barzinho",
};

export default function AutoReels() {
  const [rows, setRows] = useState<ReelRow[]>([]);
  const [eventTitles, setEventTitles] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("auto_reels_queue")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    const list = (data ?? []) as ReelRow[];
    setRows(list);
    const ids = Array.from(new Set(list.map((r) => r.event_id).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: ev } = await supabase.from("events").select("id, title").in("id", ids);
      const map: Record<string, string> = {};
      (ev ?? []).forEach((e: any) => (map[e.id] = e.title));
      setEventTitles(map);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function generateAuto() {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("aura-autoreels-generate", {
        body: { auto: true, limit: 5 },
      });
      if (error) throw error;
      toast.success(`${data?.created?.length ?? 0} reels gerados pela Aura`);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao gerar");
    } finally {
      setGenerating(false);
    }
  }

  async function regenerate(row: ReelRow) {
    if (!row.event_id) return;
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke("aura-autoreels-generate", {
        body: { event_id: row.event_id, style: row.style },
      });
      if (error) throw error;
      toast.success("Reel regenerado");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha");
    } finally {
      setGenerating(false);
    }
  }

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("auto_reels_queue").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
  }

  async function remove(id: string) {
    const { error } = await supabase.from("auto_reels_queue").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.filter((x) => x.id !== id));
  }

  function copy(key: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copiado");
    setTimeout(() => setCopiedKey(null), 1500);
  }

  const filtered = rows.filter((r) => filter === "all" || r.status === filter);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
            <Film className="h-6 w-6 text-fuchsia-400" />
            AutoReels IA
            <Badge className="ml-2 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white">Aura</Badge>
          </h1>
          <p className="text-sm text-muted-foreground">
            A Aura cria roteiros virais automaticamente para os eventos mais fortes da Roxou.
          </p>
        </div>
        <Button
          onClick={generateAuto}
          disabled={generating}
          className="bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-[0_0_24px_rgba(217,70,239,0.45)]"
        >
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Gerar 5 Reels (Top Aura)
        </Button>
      </header>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition",
              filter === f.value
                ? "bg-fuchsia-500/90 text-white shadow-[0_0_14px_rgba(217,70,239,0.55)]"
                : "border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-muted-foreground">
          <Film className="mx-auto mb-3 h-10 w-10 opacity-50" />
          Nenhum reel ainda. Clique em "Gerar 5 Reels" para a Aura começar.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => {
            const s = r.script_json || {};
            const scenes: any[] = Array.isArray(s.scenes) ? s.scenes : [];
            const ext = r.external_prompts || {};
            return (
              <div
                key={r.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-purple-950/30 via-background to-fuchsia-950/20 shadow-[0_0_30px_rgba(168,85,247,0.12)]"
              >
                {r.preview_image_url && (
                  <div className="relative aspect-[4/5] w-full overflow-hidden">
                    <img src={r.preview_image_url} alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <p className="line-clamp-2 text-sm font-bold text-white">
                        {eventTitles[r.event_id ?? ""] ?? s.title ?? "Evento"}
                      </p>
                    </div>
                    {r.style && (
                      <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white backdrop-blur">
                        {STYLE_LABELS[r.style] ?? r.style}
                      </span>
                    )}
                    <span
                      className={cn(
                        "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur",
                        r.status === "approved" && "bg-emerald-500/80 text-white",
                        r.status === "published" && "bg-blue-500/80 text-white",
                        r.status === "ignored" && "bg-zinc-600/80 text-white",
                        r.status === "generated" && "bg-fuchsia-500/80 text-white",
                      )}
                    >
                      {r.status}
                    </span>
                  </div>
                )}

                <div className="space-y-3 p-4">
                  {s.hook && (
                    <div className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-950/30 p-2 text-sm font-semibold text-fuchsia-100">
                      🎬 {s.hook}
                    </div>
                  )}

                  {scenes.length > 0 && (
                    <details className="group">
                      <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                        {scenes.length} cenas ({scenes.reduce((a, c) => a + (c.duration_s || 0), 0).toFixed(1)}s)
                      </summary>
                      <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {scenes.map((sc, i) => (
                          <li key={i} className="rounded bg-white/5 p-2">
                            <span className="font-semibold text-foreground">#{sc.order ?? i + 1} • {sc.duration_s ?? "?"}s</span>
                            <p className="mt-0.5">{sc.visual}</p>
                            {sc.text_overlay && <p className="mt-0.5 italic">"{sc.text_overlay}"</p>}
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}

                  {r.generated_caption && (
                    <div className="rounded-lg bg-white/5 p-2 text-xs">
                      <p className="line-clamp-4 whitespace-pre-line">{r.generated_caption}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">{r.generated_hashtags?.length ?? 0} hashtags</span>
                        <button
                          onClick={() =>
                            copy(
                              r.id + "-cap",
                              [r.generated_caption, (r.generated_hashtags ?? []).join(" ")].filter(Boolean).join("\n\n"),
                            )
                          }
                          className="text-[10px] text-fuchsia-400 hover:text-fuchsia-300"
                        >
                          {copiedKey === r.id + "-cap" ? <Check className="inline h-3 w-3" /> : <Copy className="inline h-3 w-3" />} legenda+tags
                        </button>
                      </div>
                    </div>
                  )}

                  {s.cta && <p className="text-xs font-semibold text-fuchsia-300">CTA: {s.cta}</p>}
                  {r.suggested_audio && <p className="text-xs text-muted-foreground">🎵 {r.suggested_audio}</p>}

                  <div className="flex flex-wrap gap-1">
                    {(["capcut", "kling", "runway", "veo", "tiktok"] as const).map((k) =>
                      ext[k] ? (
                        <button
                          key={k}
                          onClick={() => copy(r.id + "-" + k, ext[k])}
                          className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide hover:bg-white/10"
                        >
                          {copiedKey === r.id + "-" + k ? <Check className="inline h-3 w-3" /> : <Copy className="inline h-3 w-3" />} {k}
                        </button>
                      ) : null,
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {r.status !== "approved" && (
                      <Button size="sm" variant="default" onClick={() => setStatus(r.id, "approved")} className="h-7 text-xs">
                        Aprovar
                      </Button>
                    )}
                    {r.status !== "published" && (
                      <Button size="sm" variant="secondary" onClick={() => setStatus(r.id, "published")} className="h-7 text-xs">
                        <Play className="mr-1 h-3 w-3" /> Publicado
                      </Button>
                    )}
                    {r.status !== "ignored" && (
                      <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "ignored")} className="h-7 text-xs">
                        Ignorar
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => regenerate(r)} disabled={generating} className="h-7 text-xs">
                      <RefreshCw className="mr-1 h-3 w-3" /> Regerar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(r.id)} className="h-7 text-xs text-red-400">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

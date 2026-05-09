import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Radar,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Pencil,
  XCircle,
  ExternalLink,
  Loader2,
  ImageIcon,
  Calendar,
  MapPin,
  ShieldCheck,
} from "lucide-react";

interface RadarDraft {
  id: string;
  title: string;
  slug: string;
  date_time: string | null;
  venue_name: string | null;
  image_url: string | null;
  description: string | null;
  instagram: string | null;
  status: string;
  verification_source: string | null;
  ai_confidence: string | null;
  needs_review: boolean;
  created_at: string;
}

const confidenceBadge: Record<string, string> = {
  high: "bg-emerald-400/15 text-emerald-300 border border-emerald-400/30",
  medium: "bg-amber-400/15 text-amber-300 border border-amber-400/30",
  low: "bg-rose-400/15 text-rose-300 border border-rose-400/30",
};

function formatDate(dt: string | null) {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dt;
  }
}

const RadarIA = () => {
  const [drafts, setDrafts] = useState<RadarDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "all" | "ignored">("pending");

  async function load() {
    setLoading(true);
    let query = supabase
      .from("events")
      .select("id,title,slug,date_time,venue_name,image_url,description,instagram,status,verification_source,ai_confidence,needs_review,created_at")
      .eq("verification_source", "auto-discovery")
      .order("created_at", { ascending: false })
      .limit(200);

    if (filter === "pending") query = query.eq("status", "draft");
    if (filter === "ignored") query = query.eq("status", "archived");

    const { data, error } = await query;
    if (error) {
      toast.error(`Erro ao carregar: ${error.message}`);
    } else {
      setDrafts((data || []) as RadarDraft[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [filter]);

  async function triggerScan() {
    setScanning(true);
    const t = toast.loading("Disparando varredura do Radar IA...");
    const { data, error } = await supabase.functions.invoke("automatic-event-hunter");
    toast.dismiss(t);
    setScanning(false);
    if (error) {
      toast.error(`Falha: ${error.message}`);
      return;
    }
    const created = (data as any)?.drafts_created ?? 0;
    const skipped = (data as any)?.skipped ?? 0;
    toast.success(`Radar IA: ${created} novo(s) rascunho(s) • ${skipped} ignorados.`);
    load();
  }

  async function approve(id: string) {
    setActing(id);
    const { error } = await supabase
      .from("events")
      .update({ status: "published", needs_review: false })
      .eq("id", id);
    setActing(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Evento publicado!");
      load();
    }
  }

  async function ignore(id: string) {
    setActing(id);
    const { error } = await supabase
      .from("events")
      .update({ status: "archived", needs_review: false })
      .eq("id", id);
    setActing(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Rascunho ignorado.");
      load();
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Radar className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-display font-black tracking-tight">Radar IA</h1>
              <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-full bg-primary/20 text-primary font-bold">
                <Sparkles className="inline h-3 w-3 mr-0.5" /> Detectado pela Aura
              </span>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              A Aura varre os Instagrams dos parceiros automaticamente, lê os flyers e cria rascunhos para você revisar.
              Nada é publicado sem sua aprovação.
            </p>
          </div>
          <button
            onClick={triggerScan}
            disabled={scanning}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {scanning ? "Varrendo..." : "Disparar varredura agora"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "pending", label: "Para revisar" },
          { key: "all", label: "Todos" },
          { key: "ignored", label: "Ignorados" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
        </div>
      ) : drafts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <Radar className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum rascunho do Radar IA neste filtro.</p>
          <p className="text-xs text-muted-foreground/60 mt-2">
            Clique em "Disparar varredura agora" para buscar novos flyers.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {drafts.map((d) => {
            const conf = (d.ai_confidence || "medium").toLowerCase();
            const isArchived = d.status === "archived";
            const isPublished = d.status === "published";
            return (
              <div
                key={d.id}
                className="rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-all hover:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.4)]"
              >
                {/* Image */}
                <div className="relative aspect-[4/5] bg-muted overflow-hidden">
                  {d.image_url ? (
                    <img src={d.image_url} alt={d.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${confidenceBadge[conf] || confidenceBadge.medium}`}>
                      {conf === "high" ? "Alta" : conf === "low" ? "Baixa" : "Média"} confiança
                    </span>
                    {isPublished && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Aprovado
                      </span>
                    )}
                    {isArchived && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        Ignorado
                      </span>
                    )}
                    {!isPublished && !isArchived && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Revisar
                      </span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 space-y-3">
                  <h3 className="font-display font-bold text-base line-clamp-2 leading-snug">{d.title}</h3>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(d.date_time)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate">{d.venue_name || "—"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span className="text-primary/80">Fonte: Instagram</span>
                    </div>
                  </div>

                  {d.instagram && (
                    <a
                      href={d.instagram}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Ver post original
                    </a>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    <button
                      onClick={() => approve(d.id)}
                      disabled={acting === d.id || isPublished}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-bold hover:bg-emerald-500/25 disabled:opacity-40"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
                    </button>
                    <Link
                      to={`/admin/eventos/${d.id}/editar`}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-bold hover:bg-primary/25"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Link>
                    <button
                      onClick={() => ignore(d.id)}
                      disabled={acting === d.id || isArchived}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-300 text-xs font-bold hover:bg-rose-500/20 disabled:opacity-40"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Ignorar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RadarIA;

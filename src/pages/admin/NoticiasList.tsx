import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Pencil, Trash2, ExternalLink, Flame, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Row {
  id: string;
  title: string;
  slug: string;
  category: string;
  author: string;
  status: string;
  published_at: string | null;
  created_at: string;
}

type Scope = "roxou" | "expo";

const SCOPES: Record<Scope, { table: "roxou_news" | "expo_news"; label: string; subtitle: string; basePath: string; icon: typeof Flame }> = {
  roxou: {
    table: "roxou_news",
    label: "Roxou",
    subtitle: "Notícias de bares, festas, baladas, restaurantes e shows em Prudente",
    basePath: "/noticia",
    icon: Sparkles,
  },
  expo: {
    table: "expo_news",
    label: "Expo 2026",
    subtitle: "Conteúdo do hot site /expo2026",
    basePath: "/expo2026/noticia",
    icon: Flame,
  },
};

const NoticiasList = () => {
  const [params, setParams] = useSearchParams();
  const scope: Scope = (params.get("scope") as Scope) === "expo" ? "expo" : "roxou";
  const cfg = SCOPES[scope];

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(cfg.table)
      .select("id,title,slug,category,author,status,published_at,created_at")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [scope]);

  const remove = async (id: string) => {
    if (!confirm("Excluir esta notícia?")) return;
    const { error } = await supabase.from(cfg.table).delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Notícia excluída" });
    load();
  };

  return (
    <div>
      {/* Tabs Roxou / Expo */}
      <div className="flex items-center gap-2 mb-4 p-1 rounded-xl border border-border/60 bg-card/40 w-fit">
        {(Object.keys(SCOPES) as Scope[]).map((k) => {
          const Icon = SCOPES[k].icon;
          const active = k === scope;
          return (
            <button
              key={k}
              onClick={() => setParams({ scope: k })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition ${
                active
                  ? k === "expo"
                    ? "bg-gradient-to-r from-orange-500 to-yellow-400 text-black"
                    : "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {SCOPES[k].label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-black font-display">Notícias / {cfg.label}</h1>
          <p className="text-xs text-muted-foreground">{cfg.subtitle}</p>
        </div>
        <Link
          to={`/admin/noticias/novo?scope=${scope}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nova notícia
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Nenhuma notícia ainda. Crie a primeira.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-primary font-bold">
                  <span>{r.category}</span>
                  <span className={`px-1.5 py-0.5 rounded ${r.status === "published" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                    {r.status === "published" ? "Publicado" : "Rascunho"}
                  </span>
                </div>
                <div className="font-semibold truncate">{r.title}</div>
                <div className="text-xs text-muted-foreground">por {r.author}</div>
              </div>
              <div className="flex items-center gap-1">
                {r.status === "published" && (
                  <a href={`${cfg.basePath}/${r.slug}`} target="_blank" rel="noreferrer" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground" title="Ver">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <Link to={`/admin/noticias/${r.id}/editar?scope=${scope}`} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground" title="Editar">
                  <Pencil className="h-4 w-4" />
                </Link>
                <button onClick={() => remove(r.id)} className="p-2 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive" title="Excluir">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NoticiasList;

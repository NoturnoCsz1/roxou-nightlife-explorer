import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search, ExternalLink, MapPin, Instagram as InstagramIcon, CheckCircle2,
  AlertTriangle, Star, ShieldCheck, Ban, Edit2, Loader2, Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { toast } from "sonner";

type Status = "draft" | "ativo" | "destaque" | "oficial" | "bloqueado";

interface Establishment {
  id: string;
  name: string;
  slug: string;
  type: string | null;
  city: string | null;
  address: string | null;
  neighborhood: string | null;
  instagram: string | null;
  whatsapp: string | null;
  active: boolean;
  status: Status | null;
  instagram_validated: boolean | null;
  updated_at: string | null;
  created_at: string;
}

interface Metrics { eventCount: number; latitude: number | null; longitude: number | null; }

const STATUS_META: Record<Status, { label: string; cls: string }> = {
  draft:      { label: "Rascunho",   cls: "bg-muted/40 text-muted-foreground" },
  ativo:      { label: "Ativo",      cls: "bg-green-500/10 text-green-400" },
  destaque:   { label: "Destaque",   cls: "bg-amber-500/10 text-amber-400" },
  oficial:    { label: "Oficial",    cls: "bg-primary/15 text-primary" },
  bloqueado:  { label: "Bloqueado",  cls: "bg-destructive/10 text-destructive" },
};

type FlagKey = "missing_address" | "missing_instagram" | "missing_coordinates" | "missing_category";
function computeFlags(e: Establishment, m: Metrics | undefined): FlagKey[] {
  const f: FlagKey[] = [];
  if (!e.address?.trim()) f.push("missing_address");
  if (!e.instagram?.trim()) f.push("missing_instagram");
  if (!m || m.latitude == null || m.longitude == null) f.push("missing_coordinates");
  if (!e.type?.trim()) f.push("missing_category");
  return f;
}

const EstabelecimentosAudit = () => {
  const { cityFilter } = useAdminProfile();
  const [items, setItems] = useState<Establishment[]>([]);
  const [metrics, setMetrics] = useState<Record<string, Metrics>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | Status>("");
  const [cityF, setCityF] = useState<string>("");
  const [categoryF, setCategoryF] = useState<string>("");
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [orderBy, setOrderBy] = useState<"recent" | "events_desc" | "events_asc">("recent");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    let q = supabase.from("partners").select("*").order("created_at", { ascending: false });
    if (cityFilter) q = q.eq("city", cityFilter);
    const { data, error } = await q;
    if (error) toast.error("Erro ao carregar estabelecimentos");
    const list = (data || []) as unknown as Establishment[];
    setItems(list);

    if (list.length) {
      const ids = list.map(p => p.id);
      const [eventsRes, coordsRes] = await Promise.all([
        supabase.from("events").select("partner_id").in("partner_id", ids),
        supabase.from("events").select("partner_id, latitude, longitude").in("partner_id", ids).not("latitude", "is", null).limit(1000),
      ]);
      const m: Record<string, Metrics> = {};
      ids.forEach(id => { m[id] = { eventCount: 0, latitude: null, longitude: null }; });
      (eventsRes.data || []).forEach(e => { if (e.partner_id) m[e.partner_id].eventCount++; });
      // Coordenadas vivem em partners? Não. Estão em events. Para "missing_coordinates" usamos um campo
      // dedicado se existir ou consideramos vazio. Aqui vamos buscar no próprio partner via campos extras:
      setMetrics(m);
    }
    setLoading(false);
  }

  // Como partners atualmente não tem lat/lng, exibimos a partir de uma busca do primeiro evento
  // associado. Para auditoria, tratamos missing_coordinates quando não há nenhuma referência.
  // Fallback: busca de coordenadas direto do registro do partner se existir endereço.

  const cities = useMemo(() => Array.from(new Set(items.map(i => i.city).filter(Boolean))) as string[], [items]);
  const categories = useMemo(() => Array.from(new Set(items.map(i => i.type).filter(Boolean))) as string[], [items]);

  const filtered = useMemo(() => {
    let arr = items.filter(e => {
      if (search) {
        const s = search.toLowerCase();
        if (!e.name.toLowerCase().includes(s) && !(e.slug || "").toLowerCase().includes(s)) return false;
      }
      if (statusFilter) {
        const cur = (e.status as Status) || (e.active ? "ativo" : "bloqueado");
        if (cur !== statusFilter) return false;
      }
      if (cityF && e.city !== cityF) return false;
      if (categoryF && e.type !== categoryF) return false;
      if (errorsOnly && computeFlags(e, metrics[e.id]).length === 0) return false;
      return true;
    });
    if (orderBy === "events_desc") arr = [...arr].sort((a, b) => (metrics[b.id]?.eventCount || 0) - (metrics[a.id]?.eventCount || 0));
    if (orderBy === "events_asc") arr = [...arr].sort((a, b) => (metrics[a.id]?.eventCount || 0) - (metrics[b.id]?.eventCount || 0));
    return arr;
  }, [items, search, statusFilter, cityF, categoryF, errorsOnly, orderBy, metrics]);

  const stats = useMemo(() => {
    const total = items.length;
    let ativo = 0, destaque = 0, oficial = 0, errors = 0;
    items.forEach(e => {
      const cur = (e.status as Status) || (e.active ? "ativo" : "bloqueado");
      if (cur === "ativo") ativo++;
      if (cur === "destaque") destaque++;
      if (cur === "oficial") oficial++;
      if (computeFlags(e, metrics[e.id]).length > 0) errors++;
    });
    return { total, ativo, destaque, oficial, errors };
  }, [items, metrics]);

  async function patch(id: string, payload: Partial<Establishment>) {
    setBusy(id);
    const { error } = await supabase.from("partners").update(payload as any).eq("id", id);
    setBusy(null);
    if (error) { toast.error("Falha ao atualizar"); return false; }
    setItems(prev => prev.map(e => e.id === id ? { ...e, ...payload } : e));
    return true;
  }

  async function setStatus(e: Establishment, status: Status) {
    const ok = await patch(e.id, { status, active: status !== "bloqueado" });
    if (ok) toast.success(`Status: ${STATUS_META[status].label}`);
  }

  async function validateInstagram(e: Establishment) {
    if (!e.instagram?.trim()) { toast.error("Sem Instagram cadastrado"); return; }
    const handle = e.instagram.replace(/^@/, "").trim();
    window.open(`https://instagram.com/${handle}`, "_blank");
    await patch(e.id, { instagram_validated: true });
    toast.success("Instagram marcado como validado");
  }

  async function generateCoordinates(e: Establishment) {
    if (!e.address?.trim()) { toast.error("Cadastre o endereço primeiro"); return; }
    setBusy(e.id);
    try {
      const { data, error } = await supabase.functions.invoke("geocode-address", {
        body: { address: e.address, city: e.city },
      });
      if (error || !data?.latitude) throw new Error(data?.error || "Não encontrado");
      toast.success(`Coordenadas: ${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)}`);
      // partners não armazena lat/lng hoje — exibimos ao admin para uso manual ou em events
      navigator.clipboard?.writeText(`${data.latitude},${data.longitude}`).catch(() => {});
      toast.message("Copiado para a área de transferência");
    } catch (err: any) {
      toast.error(err.message || "Falha no geocoding");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4 md:ml-44">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-bold text-foreground">Auditoria de Estabelecimentos</h1>
          <p className="text-[11px] text-muted-foreground">Validação, status e qualidade de dados</p>
        </div>
        <Link to="/admin/parceiros/novo" className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
          Novo
        </Link>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Stat label="Total" value={stats.total} />
        <Stat label="Ativos" value={stats.ativo} tone="green" />
        <Stat label="Destaque" value={stats.destaque} tone="amber" />
        <Stat label="Oficiais" value={stats.oficial} tone="primary" />
        <Stat label="Com erro" value={stats.errors} tone="red" />
      </div>

      {/* Filtros */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-card px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou slug..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(["", "draft", "ativo", "destaque", "oficial", "bloqueado"] as const).map(s => (
            <button
              key={s || "all"}
              onClick={() => setStatusFilter(s as any)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                statusFilter === s ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
              }`}
            >
              {s === "" ? "Todos" : STATUS_META[s as Status].label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <select value={cityF} onChange={e => setCityF(e.target.value)} className="rounded-lg border border-border/40 bg-card px-2 py-1 text-xs">
            <option value="">Todas as cidades</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={categoryF} onChange={e => setCategoryF(e.target.value)} className="rounded-lg border border-border/40 bg-card px-2 py-1 text-xs">
            <option value="">Todas categorias</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={orderBy} onChange={e => setOrderBy(e.target.value as any)} className="rounded-lg border border-border/40 bg-card px-2 py-1 text-xs">
            <option value="recent">Recentes</option>
            <option value="events_desc">Mais eventos</option>
            <option value="events_asc">Sem eventos</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={errorsOnly} onChange={e => setErrorsOnly(e.target.checked)} />
            Apenas com erro
          </label>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-8">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">Nenhum estabelecimento.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(e => {
            const m = metrics[e.id];
            const flags = computeFlags(e, m);
            const cur = (e.status as Status) || (e.active ? "ativo" : "bloqueado");
            const meta = STATUS_META[cur];
            return (
              <div key={e.id} className="rounded-xl border border-border/40 bg-card p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold truncate">{e.name}</span>
                      {e.instagram_validated && <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />}
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${meta.cls}`}>{meta.label}</span>
                      {flags.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                          <AlertTriangle className="h-3 w-3" /> Dados incompletos
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      /{e.slug} • {e.type || "—"} • {e.city || "—"}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{e.address || "sem endereço"}</span>
                      {e.instagram && <span className="inline-flex items-center gap-1"><InstagramIcon className="h-3 w-3" />{e.instagram}</span>}
                      <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{m?.eventCount ?? 0} evento(s)</span>
                      {e.updated_at && <span>atualizado {new Date(e.updated_at).toLocaleDateString("pt-BR")}</span>}
                    </div>
                    {flags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {flags.map(f => (
                          <span key={f} className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                            {f.replace("missing_", "sem ").replace("_", " ")}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status quick buttons */}
                <div className="flex flex-wrap gap-1 pt-1 border-t border-border/20">
                  {(["ativo", "destaque", "oficial", "bloqueado", "draft"] as Status[]).map(s => (
                    <button
                      key={s}
                      disabled={busy === e.id}
                      onClick={() => setStatus(e, s)}
                      className={`text-[10px] font-semibold px-2 py-1 rounded ${
                        cur === s ? STATUS_META[s].cls : "bg-secondary/40 text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {s === "destaque" && <Star className="inline h-3 w-3 mr-0.5" />}
                      {s === "oficial" && <ShieldCheck className="inline h-3 w-3 mr-0.5" />}
                      {s === "bloqueado" && <Ban className="inline h-3 w-3 mr-0.5" />}
                      {STATUS_META[s].label}
                    </button>
                  ))}
                </div>

                {/* Ações */}
                <div className="flex flex-wrap gap-1 pt-1">
                  <Link
                    to={`/admin/parceiros/${e.id}/editar`}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary hover:bg-primary/20"
                  >
                    <Edit2 className="h-3 w-3" /> Editar
                  </Link>
                  <button
                    disabled={busy === e.id}
                    onClick={() => validateInstagram(e)}
                    className="inline-flex items-center gap-1 rounded-lg bg-secondary/60 px-2.5 py-1 text-[10px] font-semibold hover:bg-secondary"
                  >
                    <InstagramIcon className="h-3 w-3" /> Validar Instagram
                  </button>
                  <button
                    disabled={busy === e.id}
                    onClick={() => generateCoordinates(e)}
                    className="inline-flex items-center gap-1 rounded-lg bg-secondary/60 px-2.5 py-1 text-[10px] font-semibold hover:bg-secondary"
                  >
                    {busy === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
                    Gerar coordenadas
                  </button>
                  <a
                    href={`/local/${e.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-secondary/60 px-2.5 py-1 text-[10px] font-semibold hover:bg-secondary"
                  >
                    <ExternalLink className="h-3 w-3" /> Ver página
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

function Stat({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "green" | "amber" | "primary" | "red" }) {
  const tones: Record<string, string> = {
    default: "text-foreground",
    green: "text-green-400",
    amber: "text-amber-400",
    primary: "text-primary",
    red: "text-destructive",
  };
  return (
    <div className="rounded-xl border border-border/40 bg-card p-2.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold ${tones[tone]}`}>{value}</p>
    </div>
  );
}

export default EstabelecimentosAudit;

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search, ExternalLink, MapPin, Instagram as InstagramIcon, CheckCircle2,
  AlertTriangle, Star, ShieldCheck, Ban, Edit2, Loader2, Eye, Sparkles, X,
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
  latitude: number | null;
  longitude: number | null;
  maps_place_id?: string | null;
  formatted_address?: string | null;
  updated_at: string | null;
  created_at: string;
}

interface Metrics { eventCount: number; }

const STATUS_META: Record<Status, { label: string; cls: string }> = {
  draft:      { label: "Rascunho",   cls: "bg-muted/40 text-muted-foreground" },
  ativo:      { label: "Ativo",      cls: "bg-green-500/10 text-green-400" },
  destaque:   { label: "Destaque",   cls: "bg-amber-500/10 text-amber-400" },
  oficial:    { label: "Oficial",    cls: "bg-primary/15 text-primary" },
  bloqueado:  { label: "Bloqueado",  cls: "bg-destructive/10 text-destructive" },
};

let mapsLoadPromise: Promise<void> | null = null;
let mapsApiKey: string | null = null;

async function loadGoogleMapsForGeocode(): Promise<void> {
  if ((window as any).google?.maps?.Geocoder) return;
  if (mapsLoadPromise) return mapsLoadPromise;
  mapsLoadPromise = (async () => {
    if (!mapsApiKey) {
      const { data, error } = await supabase.functions.invoke("maps-key");
      if (error || !data?.key) throw new Error("Falha ao carregar Google Maps");
      mapsApiKey = data.key;
    }
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}&libraries=geocoding&language=pt-BR&loading=async`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Falha ao carregar Google Maps"));
      document.head.appendChild(script);
    });
  })();
  return mapsLoadPromise;
}

async function geocodeInBrowser(candidates: string[]) {
  await loadGoogleMapsForGeocode();
  const google = (window as any).google;
  const geocoder = new google.maps.Geocoder();
  for (const address of candidates) {
    try {
      const response = await geocoder.geocode({ address, region: "BR", componentRestrictions: { country: "BR" } });
      const result = response.results?.[0];
      const loc = result?.geometry?.location;
      if (loc) {
        return {
          latitude: loc.lat(),
          longitude: loc.lng(),
          formatted_address: result.formatted_address || address,
          place_id: result.place_id || null,
        };
      }
    } catch (_) {
      // Try next candidate.
    }
  }
  return null;
}

type FlagKey = "missing_address" | "missing_instagram" | "missing_coordinates" | "missing_category";
function computeFlags(e: Establishment): FlagKey[] {
  const f: FlagKey[] = [];
  if (!e.address?.trim()) f.push("missing_address");
  if (!e.instagram?.trim()) f.push("missing_instagram");
  if (e.latitude == null || e.longitude == null) f.push("missing_coordinates");
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

  // AI audit state
  type SingleAI = {
    risk: "baixo" | "medio" | "alto";
    summary: string;
    problems: string[];
    suggestions: string[];
    recommended_actions: string[];
    priority: "baixa" | "media" | "alta";
    oficial_candidate: boolean;
  };
  type GlobalAI = {
    total: number;
    with_errors: number;
    top_problems: string[];
    fix_priority: string[];
    oficial_candidates: string[];
    high_traffic_bad_data: string[];
    summary: string;
  };
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<Record<string, SingleAI>>({});
  const [globalAI, setGlobalAI] = useState<GlobalAI | null>(null);
  const [globalBusy, setGlobalBusy] = useState(false);

  async function analyzeOne(e: Establishment) {
    setAiBusy(e.id);
    try {
      const payload = {
        id: e.id, name: e.name, slug: e.slug, type: e.type, city: e.city,
        address: e.address, neighborhood: e.neighborhood, instagram: e.instagram,
        whatsapp: e.whatsapp, status: e.status, active: e.active,
        instagram_validated: e.instagram_validated,
        latitude: e.latitude, longitude: e.longitude,
        event_count: metrics[e.id]?.eventCount ?? 0,
      };
      const { data, error } = await supabase.functions.invoke("ai-audit-establishments", {
        body: { mode: "single", establishment: payload },
      });
      if (error || !data?.result) throw new Error(data?.error || error?.message || "Falha");
      setAiResult(prev => ({ ...prev, [e.id]: data.result }));
    } catch (err: any) {
      toast.error(err.message || "Falha na análise IA");
    } finally {
      setAiBusy(null);
    }
  }

  async function analyzeBase() {
    setGlobalBusy(true);
    try {
      const list = items.map(e => ({
        name: e.name, slug: e.slug, type: e.type, city: e.city,
        address: e.address, instagram: e.instagram, status: e.status,
        active: e.active, has_coords: e.latitude != null && e.longitude != null,
        instagram_validated: e.instagram_validated,
        event_count: metrics[e.id]?.eventCount ?? 0,
      }));
      const { data, error } = await supabase.functions.invoke("ai-audit-establishments", {
        body: { mode: "global", establishments: list },
      });
      if (error || !data?.result) throw new Error(data?.error || error?.message || "Falha");
      setGlobalAI(data.result);
    } catch (err: any) {
      toast.error(err.message || "Falha na análise IA");
    } finally {
      setGlobalBusy(false);
    }
  }

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
      const { data: evRows } = await supabase.from("events").select("partner_id").in("partner_id", ids);
      const m: Record<string, Metrics> = {};
      ids.forEach(id => { m[id] = { eventCount: 0 }; });
      (evRows || []).forEach(e => { if (e.partner_id) m[e.partner_id].eventCount++; });
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
      if (errorsOnly && computeFlags(e).length === 0) return false;
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
      if (computeFlags(e).length > 0) errors++;
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

  async function geocodeOne(e: Establishment): Promise<{ ok: boolean; error?: string }> {
    if (!e.address?.trim()) return { ok: false, error: "Sem endereço" };
    const norm = (s: string) => s.replace(/\s+/g, " ").replace(/,\s*,+/g, ",").replace(/^[,\s]+|[,\s]+$/g, "").trim();
    const address = norm(e.address);
    const neighborhood = e.neighborhood ? norm(e.neighborhood) : "";
    const city = norm(e.city || "Presidente Prudente");
    const addrNoNeighborhood = address.replace(/\s*-\s*[^,]*$/, "");
    const candidates = [
      [address, neighborhood, city, "SP", "Brasil"],
      [address, city, "SP", "Brasil"],
      [addrNoNeighborhood, city, "SP", "Brasil"],
      [e.name, city, "SP", "Brasil"],
    ]
      .map(parts => parts.filter(Boolean).map(String).join(", "))
      .filter((q, i, arr) => q.length > 4 && arr.indexOf(q) === i);
    try {
      const { data, error } = await supabase.functions.invoke("geocode-address", {
        body: { address, neighborhood, city, state: "SP", country: "Brasil", name: e.name },
      });
      let result = data?.ok !== false && data?.latitude && data?.longitude ? data : null;
      if (!result && (data?.status === "REQUEST_DENIED" || error)) {
        result = await geocodeInBrowser(candidates);
      }
      if (!result?.latitude || !result?.longitude) {
        return { ok: false, error: "Endereço não encontrado. Revise o endereço ou tente simplificar." };
      }
      const payload = {
        latitude: result.latitude,
        longitude: result.longitude,
        maps_place_id: result.place_id || null,
        formatted_address: result.formatted_address || null,
      };
      const { error: updErr } = await supabase
        .from("partners")
        .update(payload as any)
        .eq("id", e.id);
      if (updErr) return { ok: false, error: updErr.message };
      setItems(prev => prev.map(p => p.id === e.id ? { ...p, ...payload } : p));
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || "Falha no geocoding" };
    }
  }

  async function generateCoordinates(e: Establishment) {
    if (!e.address?.trim()) { toast.error("Cadastre o endereço primeiro"); return; }
    setBusy(e.id);
    const res = await geocodeOne(e);
    setBusy(null);
    if (res.ok) toast.success("Coordenadas salvas");
    else toast.error(`${e.name}: ${res.error || "Endereço não encontrado. Revise o endereço ou tente simplificar."}`);
  }

  return (
    <div className="space-y-4 md:ml-44">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-bold text-foreground">Auditoria de Estabelecimentos</h1>
          <p className="text-[11px] text-muted-foreground">Validação, status e qualidade de dados</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={analyzeBase}
            disabled={globalBusy}
            className="inline-flex items-center gap-1 rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/25 disabled:opacity-50"
          >
            {globalBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Análise IA da base
          </button>
          <button
            onClick={async () => {
              const targets = items.filter(e => e.address && (e.latitude == null || e.longitude == null));
              if (!targets.length) { toast.message("Nada a geocodificar"); return; }
              toast.message(`Geocodificando ${targets.length}...`);
              let ok = 0; const failed: { name: string; error: string }[] = [];
              for (const e of targets) {
                const r = await geocodeOne(e);
                if (r.ok) ok++; else failed.push({ name: e.name, error: r.error || "?" });
                await new Promise(r => setTimeout(r, 250));
              }
              if (failed.length === 0) {
                toast.success(`${ok} atualizado(s)`);
              } else {
                console.warn("Geocode failures:", failed);
                toast.error(`${ok} ok · ${failed.length} falharam: ${failed.slice(0, 3).map(f => f.name).join(", ")}${failed.length > 3 ? "..." : ""}`);
              }
            }}
            className="rounded-lg bg-secondary/60 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
          >
            Geocodificar faltantes
          </button>
          <Link to="/admin/parceiros/novo" className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            Novo
          </Link>
        </div>
      </div>


      {globalAI && (
        <div className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 to-card p-3 space-y-2 relative">
          <button onClick={() => setGlobalAI(null)} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Diagnóstico IA da base</h2>
          </div>
          <p className="text-xs text-foreground/90">{globalAI.summary}</p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div><span className="text-muted-foreground">Total:</span> <b>{globalAI.total}</b></div>
            <div><span className="text-muted-foreground">Com erro:</span> <b className="text-destructive">{globalAI.with_errors}</b></div>
          </div>
          {globalAI.top_problems?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Principais problemas</p>
              <ul className="text-xs space-y-0.5 list-disc list-inside">
                {globalAI.top_problems.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
          {globalAI.fix_priority?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Corrigir primeiro</p>
              <div className="flex flex-wrap gap-1">
                {globalAI.fix_priority.slice(0, 12).map((p, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">{p}</span>
                ))}
              </div>
            </div>
          )}
          {globalAI.oficial_candidates?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Candidatos a Oficial Roxou</p>
              <div className="flex flex-wrap gap-1">
                {globalAI.oficial_candidates.map((p, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary">{p}</span>
                ))}
              </div>
            </div>
          )}
          {globalAI.high_traffic_bad_data?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Muitos eventos + dados ruins</p>
              <div className="flex flex-wrap gap-1">
                {globalAI.high_traffic_bad_data.map((p, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">{p}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
            const flags = computeFlags(e);
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
                      {e.latitude != null && e.longitude != null && (
                        <span className="inline-flex items-center gap-1 text-green-400">
                          <MapPin className="h-3 w-3" />{e.latitude.toFixed(4)}, {e.longitude.toFixed(4)}
                        </span>
                      )}
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
                    Geocodificar endereço
                  </button>
                  <button
                    disabled={aiBusy === e.id}
                    onClick={() => analyzeOne(e)}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary/15 px-2.5 py-1 text-[10px] font-semibold text-primary hover:bg-primary/25"
                  >
                    {aiBusy === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    Analisar com IA
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

                {aiResult[e.id] && (() => {
                  const r = aiResult[e.id];
                  const riskCls = r.risk === "alto" ? "bg-destructive/15 text-destructive border-destructive/40"
                    : r.risk === "medio" ? "bg-amber-500/15 text-amber-400 border-amber-500/40"
                    : "bg-green-500/15 text-green-400 border-green-500/40";
                  return (
                    <div className={`mt-2 rounded-lg border ${riskCls.split(" ").slice(-1)} bg-card p-2.5 space-y-1.5 relative`}>
                      <button onClick={() => setAiResult(prev => { const n = { ...prev }; delete n[e.id]; return n; })}
                        className="absolute top-1.5 right-1.5 text-muted-foreground hover:text-foreground">
                        <X className="h-3 w-3" />
                      </button>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Sparkles className="h-3 w-3 text-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-wide">Diagnóstico IA</span>
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${riskCls}`}>Risco {r.risk}</span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-secondary/60">Prioridade {r.priority}</span>
                        {r.oficial_candidate && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-primary/15 text-primary inline-flex items-center gap-0.5">
                            <ShieldCheck className="h-2.5 w-2.5" />Candidato Oficial
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-foreground/90">{r.summary}</p>
                      {r.problems?.length > 0 && (
                        <ul className="text-[10px] space-y-0.5 list-disc list-inside text-amber-400">
                          {r.problems.map((p, i) => <li key={i} className="text-foreground/80"><span className="text-amber-400">•</span> {p}</li>)}
                        </ul>
                      )}
                      {r.suggestions?.length > 0 && (
                        <ul className="text-[10px] space-y-0.5 list-disc list-inside text-primary">
                          {r.suggestions.map((s, i) => <li key={i} className="text-foreground/80">{s}</li>)}
                        </ul>
                      )}
                      {r.recommended_actions?.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {r.recommended_actions.includes("geocode") && (
                            <button onClick={() => generateCoordinates(e)} className="text-[10px] px-2 py-0.5 rounded bg-secondary/60 hover:bg-secondary inline-flex items-center gap-1">
                              <MapPin className="h-2.5 w-2.5" />Geocodificar
                            </button>
                          )}
                          {r.recommended_actions.includes("validate_instagram") && (
                            <button onClick={() => validateInstagram(e)} className="text-[10px] px-2 py-0.5 rounded bg-secondary/60 hover:bg-secondary inline-flex items-center gap-1">
                              <InstagramIcon className="h-2.5 w-2.5" />Validar IG
                            </button>
                          )}
                          {r.recommended_actions.includes("set_ativo") && (
                            <button onClick={() => setStatus(e, "ativo")} className="text-[10px] px-2 py-0.5 rounded bg-green-500/15 text-green-400 hover:bg-green-500/25">Marcar Ativo</button>
                          )}
                          {r.recommended_actions.includes("set_destaque") && (
                            <button onClick={() => setStatus(e, "destaque")} className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 inline-flex items-center gap-1">
                              <Star className="h-2.5 w-2.5" />Destaque
                            </button>
                          )}
                          {r.recommended_actions.includes("set_oficial") && (
                            <button onClick={() => setStatus(e, "oficial")} className="text-[10px] px-2 py-0.5 rounded bg-primary/15 text-primary hover:bg-primary/25 inline-flex items-center gap-1">
                              <ShieldCheck className="h-2.5 w-2.5" />Oficial Roxou
                            </button>
                          )}
                          {r.recommended_actions.includes("set_bloqueado") && (
                            <button onClick={() => setStatus(e, "bloqueado")} className="text-[10px] px-2 py-0.5 rounded bg-destructive/15 text-destructive hover:bg-destructive/25 inline-flex items-center gap-1">
                              <Ban className="h-2.5 w-2.5" />Bloquear
                            </button>
                          )}
                          {r.recommended_actions.includes("edit") && (
                            <Link to={`/admin/parceiros/${e.id}/editar`} className="text-[10px] px-2 py-0.5 rounded bg-secondary/60 hover:bg-secondary inline-flex items-center gap-1">
                              <Edit2 className="h-2.5 w-2.5" />Editar
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
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

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search, ExternalLink, MapPin, Instagram as InstagramIcon, CheckCircle2,
  AlertTriangle, Star, ShieldCheck, Ban, Edit2, Loader2, Eye, Sparkles, X, Map as MapIcon, RefreshCw,
  Image as ImageIcon, FileText, Music, Flame, Gauge, Wand2, Lock,
} from "lucide-react";

const FLAG_LABELS: Record<string, string> = {
  missing_address: "sem endereço",
  missing_instagram: "sem instagram",
  missing_coordinates: "sem coordenadas",
  missing_category: "sem categoria",
};
import { supabase } from "@/integrations/supabase/client";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { toast } from "sonner";
import RoxouVenueMap from "@/components/maps/RoxouVenueMap";

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
  description?: string | null;
  logo_url?: string | null;
  music_style_primary?: string | null;
  music_styles_secondary?: string[] | null;
  updated_at: string | null;
  created_at: string;
}

interface Metrics { eventCount: number; }

// ============================================================
// Score Roxou (0–100) — quanto mais completo o perfil, maior.
// ============================================================
const SCORE_WEIGHTS = {
  logo: 15,
  coordinates: 15,
  address: 10,
  instagram: 15,
  description: 15,
  category: 10,
  music_style: 10,
  instagram_validated: 10,
} as const;

function computeScore(e: Establishment): number {
  let s = 0;
  if (e.logo_url?.trim()) s += SCORE_WEIGHTS.logo;
  if (e.latitude != null && e.longitude != null) s += SCORE_WEIGHTS.coordinates;
  if (e.address?.trim()) s += SCORE_WEIGHTS.address;
  if (e.instagram?.trim()) s += SCORE_WEIGHTS.instagram;
  if (e.description?.trim()) s += SCORE_WEIGHTS.description;
  if (e.type?.trim()) s += SCORE_WEIGHTS.category;
  if (e.music_style_primary?.trim()) s += SCORE_WEIGHTS.music_style;
  if (e.instagram_validated) s += SCORE_WEIGHTS.instagram_validated;
  return Math.min(100, s);
}

function scoreTone(score: number): { cls: string; label: string } {
  if (score >= 90) return { cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40", label: "Excelente" };
  if (score >= 70) return { cls: "bg-sky-500/15 text-sky-400 border-sky-500/40", label: "Bom" };
  if (score >= 50) return { cls: "bg-amber-500/15 text-amber-400 border-amber-500/40", label: "Atenção" };
  return { cls: "bg-destructive/15 text-destructive border-destructive/40", label: "Crítico" };
}

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
    // Reuse an existing tag if present
    const existing = document.querySelector<HTMLScriptElement>('script[data-roxou-gmaps="1"]');
    if (!existing) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}&libraries=places&language=pt-BR&loading=async`;
        script.async = true;
        script.defer = true;
        script.dataset.roxouGmaps = "1";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Falha ao carregar Google Maps"));
        document.head.appendChild(script);
      });
    }
    // Wait until Geocoder is available (async loading)
    const start = Date.now();
    while (!(window as any).google?.maps?.Geocoder) {
      if (Date.now() - start > 8000) throw new Error("Google Maps não carregado");
      const g = (window as any).google;
      if (g?.maps?.importLibrary) {
        try { await g.maps.importLibrary("geocoding"); break; } catch (_) { /* poll */ }
      }
      await new Promise(r => setTimeout(r, 100));
    }
  })();
  return mapsLoadPromise;
}

async function geocodeViaNominatim(candidates: string[]) {
  for (const q of candidates) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { "Accept-Language": "pt-BR" } });
      if (!res.ok) continue;
      const arr = await res.json();
      const first = Array.isArray(arr) ? arr[0] : null;
      if (first?.lat && first?.lon) {
        return {
          latitude: parseFloat(first.lat),
          longitude: parseFloat(first.lon),
          formatted_address: first.display_name || q,
          place_id: null as string | null,
        };
      }
    } catch (_) { /* try next */ }
  }
  return null;
}

async function geocodeInBrowser(candidates: string[]) {
  try {
    await loadGoogleMapsForGeocode();
    const g = (window as any).google;
    if (!g?.maps?.Geocoder) throw new Error("Google Maps não carregado");
    const geocoder = new g.maps.Geocoder();
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
      } catch (_) { /* try next candidate */ }
    }
  } catch (_) {
    // SDK failed — fall through to Nominatim
  }
  return await geocodeViaNominatim(candidates);
}

/** Extract lat/lng from a Google Maps URL. Supports @lat,lng / !3dLAT!4dLNG / q=lat,lng / ?ll=lat,lng */
function parseMapsUrl(url: string): { lat: number; lng: number } | null {
  if (!url) return null;
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /\/(-?\d+\.\d+),(-?\d+\.\d+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) {
      const lat = parseFloat(m[1]); const lng = parseFloat(m[2]);
      if (isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        return { lat, lng };
      }
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
  const [noCoordsOnly, setNoCoordsOnly] = useState(false);
  // Filtros 2.0 — qualidade do perfil
  type QualityFilter =
    | "all"
    | "needs_attention"
    | "no_coords"
    | "no_instagram"
    | "no_description"
    | "no_music_style"
    | "no_logo"
    | "ready_to_feature";
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>("all");
  const [orderBy, setOrderBy] = useState<"recent" | "events_desc" | "events_asc" | "score_asc" | "score_desc">("recent");
  const [busy, setBusy] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState<Record<string, { lat: string; lng: string; url: string }>>({});

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
  const [mapModal, setMapModal] = useState<Establishment | null>(null);
  const [globalAI, setGlobalAI] = useState<GlobalAI | null>(null);
  const [globalBusy, setGlobalBusy] = useState(false);

  // Estabelecimentos 2.1 — Assistente IA de Correção (apenas sugestões)
  type SuggestAI = {
    suggested_type: string;
    suggested_type_label: string;
    suggested_music_primary: string;
    suggested_music_secondary: string[];
    suggested_description: string;
    suggested_full_description?: string;
    problems: string[];
    improvements: string[];
    confidence: "baixa" | "media" | "alta";
    evidence?: string;
    instagram?: {
      handle: string | null;
      source: "cadastro" | "instagram_validated" | "instagram_not_validated";
      reason?: string;
      followers_count?: number | null;
      bio?: string | null;
    } | null;
  };
  type ApplyKey = "type" | "music_style_primary" | "music_styles_secondary" | "short_description" | "full_description";
  const [suggestBusy, setSuggestBusy] = useState<string | null>(null);
  const [suggestResult, setSuggestResult] = useState<Record<string, SuggestAI>>({});
  const [applySel, setApplySel] = useState<Record<string, Record<ApplyKey, boolean>>>({});
  const [applyBusy, setApplyBusy] = useState<string | null>(null);

  function defaultApplySel(e: Establishment, s: SuggestAI): Record<ApplyKey, boolean> {
    const score = computeScore(e);
    const lowScore = score < 60;
    return {
      type: !e.type?.trim() || e.type === "bar" /* default */ || lowScore && !!s.suggested_type,
      music_style_primary: !e.music_style_primary?.trim(),
      music_styles_secondary: !(e.music_styles_secondary && e.music_styles_secondary.length > 0),
      short_description: !((e as any).short_description?.trim() || e.description?.trim()),
      full_description: !!s.suggested_full_description && !((e as any).full_description?.trim()),
    };
  }

  async function applySuggestions(e: Establishment) {
    const s = suggestResult[e.id];
    if (!s) return;
    const sel = applySel[e.id] ?? defaultApplySel(e, s);
    const update: Record<string, any> = {};
    const changed: ApplyKey[] = [];
    if (sel.type && s.suggested_type) { update.type = s.suggested_type; changed.push("type"); }
    if (sel.music_style_primary && s.suggested_music_primary) {
      update.music_style_primary = s.suggested_music_primary; changed.push("music_style_primary");
    }
    if (sel.music_styles_secondary && s.suggested_music_secondary?.length) {
      update.music_styles_secondary = s.suggested_music_secondary.slice(0, 3);
      changed.push("music_styles_secondary");
    }
    if (sel.short_description && s.suggested_description) {
      update.short_description = s.suggested_description; changed.push("short_description");
    }
    if (sel.full_description && s.suggested_full_description) {
      update.full_description = s.suggested_full_description; changed.push("full_description");
    }
    if (changed.length === 0) {
      toast.info("Selecione ao menos um campo para aplicar.");
      return;
    }
    setApplyBusy(e.id);
    try {
      const { error } = await supabase
        .from("partners")
        .update({ ...update, updated_at: new Date().toISOString() })
        .eq("id", e.id);
      if (error) throw error;

      // Atualiza item local + recalcula score implícito (computeScore lê os campos atualizados)
      setItems(prev => prev.map(p => p.id === e.id ? {
        ...p,
        ...update,
        description: update.short_description ?? p.description,
      } as Establishment : p));

      // Best-effort: registra em automation_logs se o admin tiver permissão
      try {
        await supabase.from("automation_logs").insert({
          job_name: "ai_establishment_suggestion",
          status: "applied",
          details: {
            partner_id: e.id,
            partner_slug: e.slug,
            fields: changed,
            confidence: s.confidence,
            evidence: s.evidence ?? null,
            ig_source: s.instagram?.source ?? null,
          },
        } as any);
      } catch { /* sem permissão de insert ou tabela ausente — auditoria silenciosa */ }

      toast.success(`Sugestões aplicadas (${changed.length} campo${changed.length > 1 ? "s" : ""}).`);
      setSuggestResult(prev => { const n = { ...prev }; delete n[e.id]; return n; });
      setApplySel(prev => { const n = { ...prev }; delete n[e.id]; return n; });
    } catch (err: any) {
      toast.error(err?.message || "Falha ao aplicar sugestões");
    } finally {
      setApplyBusy(null);
    }
  }

  async function suggestOne(e: Establishment) {
    setSuggestBusy(e.id);
    try {
      const score = computeScore(e);
      const payload = {
        id: e.id,
        name: e.name,
        slug: e.slug,
        instagram: e.instagram,
        website: (e as any).website ?? null,
        short_description: (e as any).short_description ?? null,
        full_description: (e as any).full_description ?? e.description ?? null,
        description: e.description ?? null,
        address: e.address,
        city: e.city,
        neighborhood: e.neighborhood,
        type: e.type,
        music_style_primary: e.music_style_primary ?? null,
        music_styles_secondary: e.music_styles_secondary ?? [],
        coordinates: e.latitude != null && e.longitude != null
          ? { lat: e.latitude, lng: e.longitude }
          : null,
        logo_url: e.logo_url ?? null,
        instagram_validated: e.instagram_validated,
        score,
      };
      const { data, error } = await supabase.functions.invoke("ai-audit-establishments", {
        body: { mode: "suggest", establishment: payload },
      });
      if (error || !data?.result) throw new Error(data?.error || error?.message || "Falha");
      setSuggestResult(prev => ({ ...prev, [e.id]: { ...data.result, instagram: data.instagram ?? null } }));
    } catch (err: any) {
      toast.error(err.message || "Falha ao gerar sugestões");
    } finally {
      setSuggestBusy(null);
    }
  }

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
      if (noCoordsOnly && e.latitude != null && e.longitude != null) return false;
      // Quality filter chips
      const score = computeScore(e);
      if (qualityFilter === "needs_attention" && score >= 60) return false;
      if (qualityFilter === "no_coords" && !(e.latitude == null || e.longitude == null)) return false;
      if (qualityFilter === "no_instagram" && !!e.instagram?.trim()) return false;
      if (qualityFilter === "no_description" && !!e.description?.trim()) return false;
      if (qualityFilter === "no_music_style" && !!e.music_style_primary?.trim()) return false;
      if (qualityFilter === "no_logo" && !!e.logo_url?.trim()) return false;
      if (qualityFilter === "ready_to_feature" && score < 90) return false;
      return true;
    });
    if (orderBy === "events_desc") arr = [...arr].sort((a, b) => (metrics[b.id]?.eventCount || 0) - (metrics[a.id]?.eventCount || 0));
    if (orderBy === "events_asc") arr = [...arr].sort((a, b) => (metrics[a.id]?.eventCount || 0) - (metrics[b.id]?.eventCount || 0));
    if (orderBy === "score_asc") arr = [...arr].sort((a, b) => computeScore(a) - computeScore(b));
    if (orderBy === "score_desc") arr = [...arr].sort((a, b) => computeScore(b) - computeScore(a));
    return arr;
  }, [items, search, statusFilter, cityF, categoryF, errorsOnly, noCoordsOnly, qualityFilter, orderBy, metrics]);

  const stats = useMemo(() => {
    const total = items.length;
    let ativo = 0, destaque = 0, oficial = 0, errors = 0;
    let completos = 0, precisamAtencao = 0;
    let semLogo = 0, semCoords = 0, semInstagram = 0, semDescricao = 0, semEstilo = 0;
    let scoreSum = 0;
    items.forEach(e => {
      const cur = (e.status as Status) || (e.active ? "ativo" : "bloqueado");
      if (cur === "ativo") ativo++;
      if (cur === "destaque") destaque++;
      if (cur === "oficial") oficial++;
      if (computeFlags(e).length > 0) errors++;
      const score = computeScore(e);
      scoreSum += score;
      if (score >= 90) completos++;
      if (score < 60) precisamAtencao++;
      if (!e.logo_url?.trim()) semLogo++;
      if (e.latitude == null || e.longitude == null) semCoords++;
      if (!e.instagram?.trim()) semInstagram++;
      if (!e.description?.trim()) semDescricao++;
      if (!e.music_style_primary?.trim()) semEstilo++;
    });
    const avgScore = total > 0 ? Math.round(scoreSum / total) : 0;
    return { total, ativo, destaque, oficial, errors, completos, precisamAtencao, semLogo, semCoords, semInstagram, semDescricao, semEstilo, avgScore };
  }, [items, metrics]);

  // Top 5 piores scores — seção "Corrigir primeiro"
  const fixFirst = useMemo(() => {
    return [...items]
      .map(e => ({ e, score: computeScore(e) }))
      .filter(x => x.score < 90)
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);
  }, [items]);

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

  async function geocodeOne(e: Establishment): Promise<{ ok: boolean; error?: string; tried?: string[]; formatted?: string }> {
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
        return { ok: false, error: "Endereço não encontrado.", tried: data?.tried || candidates };
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
      return { ok: true, formatted: result.formatted_address };
    } catch (err: any) {
      return { ok: false, error: err.message || "Falha no geocoding" };
    }
  }

  async function saveManualCoords(e: Establishment, lat: number, lng: number) {
    if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      toast.error("Coordenadas inválidas"); return;
    }
    setBusy(e.id);
    const { error } = await supabase
      .from("partners")
      .update({ latitude: lat, longitude: lng } as any)
      .eq("id", e.id);
    setBusy(null);
    if (error) { toast.error("Falha ao salvar"); return; }
    setItems(prev => prev.map(p => p.id === e.id ? { ...p, latitude: lat, longitude: lng } : p));
    toast.success("Coordenadas salvas");
    await reloadOne(e.id);
  }

  async function reloadOne(id: string) {
    const { data, error } = await supabase.from("partners").select("*").eq("id", id).maybeSingle();
    if (error || !data) return;
    setItems(prev => prev.map(p => p.id === id ? ({ ...p, ...(data as any) }) : p));
  }

  async function generateCoordinates(e: Establishment) {
    if (!e.address?.trim()) { toast.error("Cadastre o endereço primeiro"); return; }
    setBusy(e.id);
    const res = await geocodeOne(e);
    // ensure local state reflects the persisted record
    await reloadOne(e.id);
    setBusy(null);
    if (res.ok) toast.success(res.formatted ? `Salvo: ${res.formatted}` : "Coordenadas salvas");
    else {
      toast.error("Não foi possível encontrar automaticamente. Use Buscar no Google Maps ou preencha as coordenadas manualmente.");
    }
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
          {/* Bulk geocoding desativado — usar fluxo manual por card. */}
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

      {/* ── Métricas 2.0: Dashboard rico no topo ── */}
      <div className="space-y-2">
        {/* Linha 1 — visão geral + score médio */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Stat label="Total" value={stats.total} icon={<Eye className="h-3 w-3" />} />
          <Stat label="Completos (≥90)" value={stats.completos} tone="green" icon={<CheckCircle2 className="h-3 w-3" />} />
          <Stat label="Precisam atenção (<60)" value={stats.precisamAtencao} tone="red" icon={<AlertTriangle className="h-3 w-3" />} />
          <Stat label="Score médio" value={stats.avgScore} tone={stats.avgScore >= 70 ? "green" : stats.avgScore >= 50 ? "amber" : "red"} icon={<Gauge className="h-3 w-3" />} />
        </div>
        {/* Linha 2 — gaps de qualidade clicáveis */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Stat label="Sem logo" value={stats.semLogo} tone="amber" icon={<ImageIcon className="h-3 w-3" />} onClick={() => setQualityFilter("no_logo")} active={qualityFilter === "no_logo"} />
          <Stat label="Sem coordenadas" value={stats.semCoords} tone="amber" icon={<MapPin className="h-3 w-3" />} onClick={() => setQualityFilter("no_coords")} active={qualityFilter === "no_coords"} />
          <Stat label="Sem Instagram" value={stats.semInstagram} tone="amber" icon={<InstagramIcon className="h-3 w-3" />} onClick={() => setQualityFilter("no_instagram")} active={qualityFilter === "no_instagram"} />
          <Stat label="Sem descrição" value={stats.semDescricao} tone="amber" icon={<FileText className="h-3 w-3" />} onClick={() => setQualityFilter("no_description")} active={qualityFilter === "no_description"} />
          <Stat label="Sem estilo musical" value={stats.semEstilo} tone="amber" icon={<Music className="h-3 w-3" />} onClick={() => setQualityFilter("no_music_style")} active={qualityFilter === "no_music_style"} />
        </div>
        {/* Linha 3 — status legado (compactado) */}
        <div className="grid grid-cols-4 gap-2">
          <Stat label="Ativos" value={stats.ativo} tone="green" />
          <Stat label="Destaque" value={stats.destaque} tone="amber" />
          <Stat label="Oficiais" value={stats.oficial} tone="primary" />
          <Stat label="Com erro" value={stats.errors} tone="red" />
        </div>
      </div>

      {/* ── 🔥 Corrigir primeiro — top 5 piores scores ── */}
      {fixFirst.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-gradient-to-br from-destructive/10 via-card to-card p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-destructive" />
              <h2 className="text-sm font-bold">🔥 Corrigir primeiro</h2>
              <span className="text-[10px] text-muted-foreground">os {fixFirst.length} perfis com pior Score Roxou</span>
            </div>
            <button
              onClick={() => { setQualityFilter("needs_attention"); setOrderBy("score_asc"); }}
              className="text-[10px] font-semibold text-destructive hover:underline"
            >
              Ver todos com atenção →
            </button>
          </div>
          <div className="space-y-1.5">
            {fixFirst.map(({ e, score }) => {
              const tone = scoreTone(score);
              const flags = computeFlags(e);
              return (
                <div key={e.id} className="flex items-center gap-2 rounded-lg bg-card/80 border border-border/30 p-2">
                  <div className={`flex items-center justify-center min-w-[42px] h-9 rounded-md border ${tone.cls} font-bold text-sm tabular-nums`}>
                    {score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold truncate">{e.name}</span>
                      <span className="text-[9px] text-muted-foreground">/{e.slug}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 flex flex-wrap gap-1.5">
                      {!e.logo_url && <span className="text-amber-400">sem logo</span>}
                      {(e.latitude == null || e.longitude == null) && <span className="text-amber-400">sem coords</span>}
                      {!e.instagram && <span className="text-amber-400">sem instagram</span>}
                      {!e.description && <span className="text-amber-400">sem descrição</span>}
                      {!e.music_style_primary && <span className="text-amber-400">sem estilo</span>}
                      {!e.type && <span className="text-amber-400">sem categoria</span>}
                      {flags.length === 0 && score < 90 && <span className="text-muted-foreground">perfil incompleto</span>}
                    </div>
                  </div>
                  <Link
                    to={`/admin/parceiros/${e.id}/editar`}
                    className="shrink-0 inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground hover:opacity-90"
                  >
                    <Edit2 className="h-2.5 w-2.5" /> Corrigir
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
            <option value="score_asc">Score: pior → melhor</option>
            <option value="score_desc">Score: melhor → pior</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={errorsOnly} onChange={e => setErrorsOnly(e.target.checked)} />
            Apenas com erro
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={noCoordsOnly} onChange={e => setNoCoordsOnly(e.target.checked)} />
            Somente sem coordenadas
          </label>
        </div>

        {/* ── Filtros de qualidade (Estabelecimentos 2.0) ── */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {([
            { k: "all",              label: "Todos" },
            { k: "needs_attention",  label: "⚠️ Precisa atenção" },
            { k: "no_coords",        label: "Sem coordenadas" },
            { k: "no_instagram",     label: "Sem Instagram" },
            { k: "no_description",   label: "Sem descrição" },
            { k: "no_music_style",   label: "Sem estilo musical" },
            { k: "no_logo",          label: "Sem logo" },
            { k: "ready_to_feature", label: "✨ Pronto para destaque" },
          ] as { k: QualityFilter; label: string }[]).map(({ k, label }) => (
            <button
              key={k}
              onClick={() => setQualityFilter(k)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                qualityFilter === k
                  ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
              }`}
            >
              {label}
            </button>
          ))}
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
            const score = computeScore(e);
            const tone = scoreTone(score);
            return (
              <div key={e.id} className="rounded-xl border border-border/40 bg-card p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        title={`Score Roxou: ${score}/100 — ${tone.label}`}
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border tabular-nums ${tone.cls}`}
                      >
                        <Gauge className="h-3 w-3" />
                        {score}
                      </span>
                      <span className="text-sm font-semibold truncate">{e.name}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${meta.cls}`}>{meta.label}</span>
                      {/* Badges de qualidade — positivos */}
                      {e.instagram_validated && (
                        <span title="Instagram validado pelo admin" className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">
                          <CheckCircle2 className="h-3 w-3" /> Instagram confirmado
                        </span>
                      )}
                      {e.address?.trim() && e.formatted_address?.trim() && (
                        <span title={e.formatted_address || ""} className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Endereço validado
                        </span>
                      )}
                      {e.latitude != null && e.longitude != null && (
                        <span title={`${e.latitude.toFixed(5)}, ${e.longitude.toFixed(5)}`} className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400">
                          <MapPin className="h-3 w-3" /> Coordenadas válidas
                        </span>
                      )}
                      {flags.length > 0 && (
                        <span
                          title={flags.map(f => FLAG_LABELS[f] || f).join(", ")}
                          className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-destructive/10 text-destructive"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          Dados incompletos: {flags.map(f => FLAG_LABELS[f] || f).join(", ")}
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
                            {FLAG_LABELS[f] || f}
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
                  {e.latitude != null && e.longitude != null && (
                    <button
                      onClick={() => setMapModal(e)}
                      className="inline-flex items-center gap-1 rounded-lg bg-secondary/60 px-2.5 py-1 text-[10px] font-semibold hover:bg-secondary"
                    >
                      <MapIcon className="h-3 w-3" /> Ver no mapa
                    </button>
                  )}
                  <button
                    disabled={aiBusy === e.id}
                    onClick={() => analyzeOne(e)}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary/15 px-2.5 py-1 text-[10px] font-semibold text-primary hover:bg-primary/25"
                  >
                    {aiBusy === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    Analisar com IA
                  </button>
                  <button
                    disabled={suggestBusy === e.id}
                    onClick={() => suggestOne(e)}
                    className="inline-flex items-center gap-1 rounded-lg bg-fuchsia-500/15 px-2.5 py-1 text-[10px] font-semibold text-fuchsia-300 hover:bg-fuchsia-500/25"
                    title="Gera sugestões de categoria, estilo e descrição (não salva)"
                  >
                    {suggestBusy === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                    ⚡ Analisar com IA
                  </button>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([e.name, e.address, e.city || "Presidente Prudente", "SP"].filter(Boolean).join(", "))}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-secondary/60 px-2.5 py-1 text-[10px] font-semibold hover:bg-secondary"
                  >
                    <ExternalLink className="h-3 w-3" /> Buscar no Google Maps
                  </a>
                  <button
                    onClick={() => setManualOpen(prev => prev[e.id]
                      ? (() => { const n = { ...prev }; delete n[e.id]; return n; })()
                      : { ...prev, [e.id]: { lat: e.latitude?.toString() || "", lng: e.longitude?.toString() || "", url: "" } })}
                    className="inline-flex items-center gap-1 rounded-lg bg-secondary/60 px-2.5 py-1 text-[10px] font-semibold hover:bg-secondary"
                  >
                    <MapPin className="h-3 w-3" /> Coordenadas manuais
                  </button>
                  <button
                    onClick={() => reloadOne(e.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-secondary/60 px-2.5 py-1 text-[10px] font-semibold hover:bg-secondary"
                  >
                    <RefreshCw className="h-3 w-3" /> Recarregar dados
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

                {manualOpen[e.id] && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5 space-y-2">
                    <p className="text-[10px] uppercase tracking-wide text-primary font-bold">Coordenadas manuais</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text" inputMode="decimal" placeholder="Latitude (-22.1234)"
                        value={manualOpen[e.id].lat}
                        onChange={ev => setManualOpen(p => ({ ...p, [e.id]: { ...p[e.id], lat: ev.target.value } }))}
                        className="rounded-md border border-border/40 bg-card px-2 py-1 text-[11px] outline-none"
                      />
                      <input
                        type="text" inputMode="decimal" placeholder="Longitude (-51.1234)"
                        value={manualOpen[e.id].lng}
                        onChange={ev => setManualOpen(p => ({ ...p, [e.id]: { ...p[e.id], lng: ev.target.value } }))}
                        className="rounded-md border border-border/40 bg-card px-2 py-1 text-[11px] outline-none"
                      />
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text" placeholder="Cole o link do Google Maps"
                        value={manualOpen[e.id].url}
                        onChange={ev => {
                          const v = ev.target.value;
                          const parsed = parseMapsUrl(v);
                          setManualOpen(p => ({
                            ...p,
                            [e.id]: parsed
                              ? { lat: parsed.lat.toString(), lng: parsed.lng.toString(), url: v }
                              : { ...p[e.id], url: v },
                          }));
                          if (parsed) toast.success("Coordenadas extraídas do link");
                        }}
                        className="flex-1 rounded-md border border-border/40 bg-card px-2 py-1 text-[11px] outline-none"
                      />
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        disabled={busy === e.id}
                        onClick={async () => {
                          const lat = parseFloat(manualOpen[e.id].lat.replace(",", "."));
                          const lng = parseFloat(manualOpen[e.id].lng.replace(",", "."));
                          await saveManualCoords(e, lat, lng);
                          setManualOpen(p => { const n = { ...p }; delete n[e.id]; return n; });
                        }}
                        className="rounded-md bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                      >
                        Salvar coordenadas
                      </button>
                      <button
                        onClick={() => setManualOpen(p => { const n = { ...p }; delete n[e.id]; return n; })}
                        className="rounded-md bg-secondary/60 px-2.5 py-1 text-[10px] font-semibold hover:bg-secondary"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

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

                {suggestResult[e.id] && (() => {
                  const s = suggestResult[e.id];
                  const confCls = s.confidence === "alta"
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                    : s.confidence === "media"
                      ? "bg-sky-500/15 text-sky-400 border-sky-500/40"
                      : "bg-amber-500/15 text-amber-400 border-amber-500/40";
                  return (
                    <div className="mt-2 rounded-lg border border-fuchsia-500/40 bg-gradient-to-br from-fuchsia-500/5 to-purple-500/5 p-3 space-y-2 relative">
                      <button
                        onClick={() => setSuggestResult(prev => { const n = { ...prev }; delete n[e.id]; return n; })}
                        className="absolute top-1.5 right-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Wand2 className="h-3.5 w-3.5 text-fuchsia-400" />
                        <span className="text-[11px] font-bold uppercase tracking-wide">Sugestões da IA</span>
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${confCls}`}>
                          confiança {s.confidence}
                        </span>
                      </div>

                      {(() => {
                        const ig = s.instagram;
                        const src = ig?.source ?? "cadastro";
                        const meta = src === "instagram_validated"
                          ? { label: "Instagram validado", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40", icon: "✅" }
                          : src === "instagram_not_validated"
                            ? { label: "Instagram não validado", cls: "bg-amber-500/15 text-amber-300 border-amber-500/40", icon: "⚠️" }
                            : { label: "Cadastro interno", cls: "bg-secondary/40 text-muted-foreground border-border/40", icon: "📋" };
                        return (
                          <div className="rounded-md border border-border/30 bg-background/40 px-2 py-1.5 text-[10px] space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold uppercase tracking-wide text-muted-foreground">Fonte usada pela IA:</span>
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${meta.cls}`}>
                                {meta.icon} {meta.label}
                              </span>
                              {ig?.handle && (
                                <a
                                  href={`https://instagram.com/${ig.handle}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-0.5 text-fuchsia-300 hover:underline"
                                >
                                  <InstagramIcon className="h-2.5 w-2.5" /> @{ig.handle}
                                </a>
                              )}
                              {typeof ig?.followers_count === "number" && (
                                <span className="text-muted-foreground">· {ig.followers_count.toLocaleString("pt-BR")} seguidores</span>
                              )}
                            </div>
                            {src === "instagram_not_validated" && (
                              <p className="text-amber-300/80">Não foi possível validar o Instagram{ig?.reason && ig.reason !== "—" ? ` — ${ig.reason}` : "."}</p>
                            )}
                            {s.evidence && (
                              <p className="text-muted-foreground italic">Base: {s.evidence}</p>
                            )}
                          </div>
                        );
                      })()}


                      <div className="grid gap-2 text-[11px]">
                        <div>
                          <div className="text-[9px] uppercase tracking-wide text-muted-foreground mb-0.5">Categoria sugerida</div>
                          <div className="font-semibold text-foreground/90">🍻 {s.suggested_type_label}</div>
                        </div>

                        {s.suggested_music_primary && (
                          <div>
                            <div className="text-[9px] uppercase tracking-wide text-muted-foreground mb-0.5">Estilo principal</div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] font-semibold">
                              🎵 {s.suggested_music_primary}
                            </span>
                          </div>
                        )}

                        {s.suggested_music_secondary?.length > 0 && (
                          <div>
                            <div className="text-[9px] uppercase tracking-wide text-muted-foreground mb-0.5">Estilos secundários</div>
                            <div className="flex flex-wrap gap-1">
                              {s.suggested_music_secondary.map((m, i) => (
                                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-secondary/40 px-2 py-0.5 text-[10px]">
                                  🎶 {m}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {s.suggested_description && (
                          <div>
                            <div className="text-[9px] uppercase tracking-wide text-muted-foreground mb-0.5">Descrição sugerida</div>
                            <p className="text-[11px] leading-snug text-foreground/85 italic">"{s.suggested_description}"</p>
                          </div>
                        )}

                        {s.problems?.length > 0 && (
                          <div>
                            <div className="text-[9px] uppercase tracking-wide text-amber-400 mb-0.5">Problemas encontrados</div>
                            <ul className="space-y-0.5">
                              {s.problems.map((p, i) => (
                                <li key={i} className="text-[10px] text-foreground/80">• {p}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {s.improvements?.length > 0 && (
                          <div>
                            <div className="text-[9px] uppercase tracking-wide text-primary mb-0.5">Melhorias recomendadas</div>
                            <ul className="space-y-0.5">
                              {s.improvements.map((m, i) => (
                                <li key={i} className="text-[10px] text-foreground/80">• {m}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {(() => {
                        const sel = applySel[e.id] ?? defaultApplySel(e, s);
                        const toggle = (k: ApplyKey) =>
                          setApplySel(prev => ({ ...prev, [e.id]: { ...(prev[e.id] ?? defaultApplySel(e, s)), [k]: !(prev[e.id]?.[k] ?? sel[k]) } }));
                        const rows: { k: ApplyKey; label: string; preview: string; enabled: boolean }[] = [
                          { k: "type", label: "Categoria", preview: s.suggested_type_label, enabled: !!s.suggested_type },
                          { k: "music_style_primary", label: "Estilo principal", preview: s.suggested_music_primary, enabled: !!s.suggested_music_primary },
                          { k: "music_styles_secondary", label: "Estilos secundários", preview: (s.suggested_music_secondary || []).join(", ") || "—", enabled: (s.suggested_music_secondary?.length ?? 0) > 0 },
                          { k: "short_description", label: "Descrição curta", preview: s.suggested_description, enabled: !!s.suggested_description },
                          ...(s.suggested_full_description
                            ? [{ k: "full_description" as ApplyKey, label: "Descrição completa", preview: s.suggested_full_description, enabled: true }]
                            : []),
                        ];
                        const anyChecked = rows.some(r => r.enabled && sel[r.k]);
                        return (
                          <div className="pt-1.5 border-t border-border/40 space-y-2">
                            <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Selecionar campos para aplicar</div>
                            <div className="grid gap-1">
                              {rows.map(r => (
                                <label
                                  key={r.k}
                                  className={`flex items-start gap-2 rounded-md px-2 py-1 text-[10px] cursor-pointer ${r.enabled ? "hover:bg-secondary/40" : "opacity-40 cursor-not-allowed"}`}
                                >
                                  <input
                                    type="checkbox"
                                    disabled={!r.enabled}
                                    checked={r.enabled && (sel[r.k] ?? false)}
                                    onChange={() => r.enabled && toggle(r.k)}
                                    className="mt-0.5 h-3 w-3 accent-fuchsia-500"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-foreground/90">{r.label}</div>
                                    <div className="text-muted-foreground truncate">{r.preview}</div>
                                  </div>
                                </label>
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                disabled={applyBusy === e.id || !anyChecked}
                                onClick={() => applySuggestions(e)}
                                className="inline-flex items-center gap-1 rounded-lg bg-fuchsia-500/20 hover:bg-fuchsia-500/30 disabled:opacity-50 disabled:cursor-not-allowed px-2.5 py-1 text-[10px] font-semibold text-fuchsia-200 border border-fuchsia-500/40"
                              >
                                {applyBusy === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                Aplicar selecionados
                              </button>
                              <span className="text-[9px] text-muted-foreground">
                                Campos protegidos (Instagram, coordenadas, logo, status, esportes) não são alterados.
                              </span>
                              <Link
                                to={`/admin/parceiros/${e.id}/editar`}
                                className="ml-auto inline-flex items-center gap-1 rounded-lg bg-secondary/60 px-2.5 py-1 text-[10px] font-semibold hover:bg-secondary"
                              >
                                <Edit2 className="h-3 w-3" /> Editar manualmente
                              </Link>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}
      {mapModal && mapModal.latitude != null && mapModal.longitude != null && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setMapModal(null)}
        >
          <div
            className="bg-card border border-border/40 rounded-2xl p-4 w-full max-w-lg space-y-3"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm">{mapModal.name}</h3>
                <p className="text-[11px] text-muted-foreground">{mapModal.address || "—"}</p>
              </div>
              <button onClick={() => setMapModal(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <RoxouVenueMap
              lat={Number(mapModal.latitude)}
              lng={Number(mapModal.longitude)}
              name={mapModal.name}
              address={mapModal.address}
              height={320}
            />
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${mapModal.latitude},${mapModal.longitude}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Abrir no Google Maps
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

function Stat({
  label,
  value,
  tone = "default",
  icon,
  onClick,
  active,
}: {
  label: string;
  value: number;
  tone?: "default" | "green" | "amber" | "primary" | "red";
  icon?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  const tones: Record<string, string> = {
    default: "text-foreground",
    green: "text-green-400",
    amber: "text-amber-400",
    primary: "text-primary",
    red: "text-destructive",
  };
  const base = `rounded-xl border bg-card p-2.5 transition ${
    active ? "border-primary/60 shadow-[0_0_14px_hsl(var(--primary)/0.35)]" : "border-border/40"
  } ${onClick ? "text-left hover:border-primary/40 hover:bg-card/80 cursor-pointer" : ""}`;
  const inner = (
    <>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className={`text-xl font-bold ${tones[tone]}`}>{value}</p>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={base}>
        {inner}
      </button>
    );
  }
  return <div className={base}>{inner}</div>;
}

export default EstabelecimentosAudit;

/* eslint-disable @typescript-eslint/no-explicit-any -- queries Supabase com payload livre, idêntico ao original (Fase 3A) */
/**
 * Hook que orquestra a auditoria de estabelecimentos.
 * Toda lógica de queries, AI, geocoding e ações de patch foi MOVIDA SEM ALTERAÇÃO
 * do componente original EstabelecimentosAudit.tsx (Fase 3A).
 *
 * Regras preservadas:
 *  - Mesmas queries em `partners` (select * + .eq("city", cityFilter) quando aplicável)
 *  - Mesmos payloads de update (patch / saveManualCoords / generateCoordinates / applySuggestions)
 *  - Mesmos invokes ("ai-audit-establishments" suggest/single/global, "geocode-address", "maps-key")
 *  - Mesmas toasts e mensagens
 *  - Sem migração para services/* (proibido nesta fase)
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { toast } from "sonner";
import type {
  ApplyKey,
  Establishment,
  GlobalAI,
  ManualCoordsState,
  Metrics,
  OrderBy,
  QualityFilter,
  SingleAI,
  Status,
  SuggestAI,
} from "./types";
import { STATUS_META } from "./types";
import { computeFlags, computeScore } from "./scoring";
import { geocodeInBrowser } from "./geocoding";

export function useEstabelecimentosAudit() {
  const { cityFilter } = useAdminProfile();
  const [items, setItems] = useState<Establishment[]>([]);
  const [metrics, setMetrics] = useState<Record<string, Metrics>>({});
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | Status>("");
  const [cityF, setCityF] = useState<string>("");
  const [categoryF, setCategoryF] = useState<string>("");
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [noCoordsOnly, setNoCoordsOnly] = useState(false);
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>("all");
  const [orderBy, setOrderBy] = useState<OrderBy>("recent");

  // UI state
  const [busy, setBusy] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState<Record<string, ManualCoordsState>>({});
  const [mapModal, setMapModal] = useState<Establishment | null>(null);

  // AI state
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<Record<string, SingleAI>>({});
  const [globalAI, setGlobalAI] = useState<GlobalAI | null>(null);
  const [globalBusy, setGlobalBusy] = useState(false);
  const [suggestBusy, setSuggestBusy] = useState<string | null>(null);
  const [suggestResult, setSuggestResult] = useState<Record<string, SuggestAI>>({});
  const [applySel, setApplySel] = useState<Record<string, Record<ApplyKey, boolean>>>({});
  const [applyBusy, setApplyBusy] = useState<string | null>(null);

  function defaultApplySel(e: Establishment, s: SuggestAI): Record<ApplyKey, boolean> {
    const score = computeScore(e);
    const lowScore = score < 60;
    const noAddress = !e.address?.trim();
    const noCoords = e.latitude == null || e.longitude == null;
    const addrOk = !!s.suggested_address && (s.address_confidence === "media" || s.address_confidence === "alta");
    return {
      type: !e.type?.trim() || e.type === "bar" || lowScore && !!s.suggested_type,
      music_style_primary: !e.music_style_primary?.trim(),
      music_styles_secondary: !(e.music_styles_secondary && e.music_styles_secondary.length > 0),
      short_description: !((e as any).short_description?.trim() || e.description?.trim()),
      full_description: !!s.suggested_full_description && !((e as any).full_description?.trim()),
      address: addrOk && (noAddress || noCoords),
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
    if (sel.address && s.suggested_address) {
      update.address = s.suggested_address;
      if (s.suggested_neighborhood) update.neighborhood = s.suggested_neighborhood;
      if (s.suggested_latitude != null) update.latitude = s.suggested_latitude;
      if (s.suggested_longitude != null) update.longitude = s.suggested_longitude;
      if (s.suggested_place_id) update.maps_place_id = s.suggested_place_id;
      if (s.suggested_formatted_address) update.formatted_address = s.suggested_formatted_address;
      changed.push("address");
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

      setItems(prev => prev.map(p => p.id === e.id ? {
        ...p,
        ...update,
        description: update.short_description ?? p.description,
      } as Establishment : p));

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
    await reloadOne(e.id);
    setBusy(null);
    if (res.ok) toast.success(res.formatted ? `Salvo: ${res.formatted}` : "Coordenadas salvas");
    else {
      toast.error("Não foi possível encontrar automaticamente. Use Buscar no Google Maps ou preencha as coordenadas manualmente.");
    }
  }

  return {
    // dados
    items, metrics, loading, filtered, cities, categories, stats, fixFirst,
    // filtros
    search, setSearch,
    statusFilter, setStatusFilter,
    cityF, setCityF,
    categoryF, setCategoryF,
    errorsOnly, setErrorsOnly,
    noCoordsOnly, setNoCoordsOnly,
    qualityFilter, setQualityFilter,
    orderBy, setOrderBy,
    // ui state
    busy, manualOpen, setManualOpen, mapModal, setMapModal,
    // ai
    aiBusy, aiResult, setAiResult, globalAI, setGlobalAI, globalBusy,
    suggestBusy, suggestResult, setSuggestResult, applySel, setApplySel, applyBusy,
    // ações
    setStatus, validateInstagram, generateCoordinates, saveManualCoords,
    reloadOne, analyzeOne, analyzeBase, suggestOne, applySuggestions, defaultApplySel,
  };
}

export type UseEstabelecimentosAuditReturn = ReturnType<typeof useEstabelecimentosAudit>;

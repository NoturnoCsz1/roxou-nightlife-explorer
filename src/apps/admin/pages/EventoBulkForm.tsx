/* eslint-disable @typescript-eslint/no-explicit-any -- preservado do original (Fase 6G) */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Send, Sparkles, Loader2, Upload, X, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, Image as ImageIcon, Save, StopCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import EventFormBlock, { emptyEventForm, slugify, type EventFormData } from "@/components/admin/EventFormBlock";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { buildEventPayload } from "@/lib/adminEventPayload";
import { sha256File } from "@/shared/utils/imageHash";
import {
  compressImage,
  readExtractionCache,
  writeExtractionCache,
  bulkLog,
} from "@/lib/bulkEventsImage";
import { clearBulkCacheIdb, bulkCacheCountIdb } from "@/lib/bulkEventsIndexedDbCache";
import {
  getDescriptionWorker,
  type DescriptionStatus,
  type DescriptionResult,
} from "@/lib/bulkDescriptionWorker";
import {
  findPossibleDuplicateEvent,
  generateEventDedupeKey,
  generateFlyerFingerprint,
  type DuplicateConfidenceResult,
  type DuplicateConfidenceExisting,
} from "@/lib/eventDuplicateDetector";
import { validateBeforePublish, persistValidationLog, REASON_LABELS } from "@/lib/eventIngestionGuard";
import { updateBulkRuntimeStats, resetBulkRuntimeStats } from "@/lib/bulkRuntimeStats";
import { saveBulkDraft, loadBulkDraft, clearBulkDraft } from "@/lib/bulkEventsDraft";
import { classifyBulkItemDate, type BulkEventPastness } from "@/lib/bulkEventsClassify";


import { ADMIN_MAIN_CATEGORIES, ADMIN_MUSICAL_SUBS, supportsGenre } from "@/lib/categoryConfig";

type Partner = Tables<"partners">;
type ItemStatus = "queued" | "uploading" | "extracting" | "ready" | "error" | "cancelled";

// FASE 10G.1.3 — limites de proteção
const MAX_BATCH_FLYERS = 50;
const MAX_CONCURRENT_FLYERS = 3;
const ocrLog = (event: string, info: Record<string, unknown>) => {
  // eslint-disable-next-line no-console
  console.info(`[OCR] ${event}`, info);
};
const stressLog = (event: string, info: Record<string, unknown>) => {
  // eslint-disable-next-line no-console
  console.info(`[BULK_STRESS] ${event}`, info);
};

interface BulkItem {
  localId: string;
  fileName: string;
  thumbDataUrl: string; // local preview (downscaled)
  status: ItemStatus;
  errorMsg?: string;
  expanded: boolean;
  form: EventFormData;
  categoryWarning?: string | null;
  /** HOTFIX Eventos em Lote — flag client-side, não persiste em DB. */
  archived?: boolean;
  /** Classificação de data em SP (past/future/ambiguous/unknown). */
  pastness?: BulkEventPastness;
}

type BulkTab = "atuais" | "revisao" | "prontos" | "erros" | "arquivados" | "todos";


function normalize(s: string) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function matchPartner(name: string | null, partners: Partner[], confidence?: string): Partner | null {
  if (!name) return null;
  if (confidence && confidence !== "high") return null;
  const n = normalize(name);
  if (!n || n.length < 3) return null;
  let best: Partner | null = null;
  let bestScore = 0;
  for (const p of partners) {
    const pn = normalize(p.name);
    if (!pn || pn.length < 3) continue;
    let score = 0;
    if (pn === n) score = 100;
    else if (n.includes(pn) && pn.length >= 4) score = pn.length;
    else if (pn.includes(n) && n.length >= 4) score = n.length;
    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
  }
  return bestScore >= 4 ? best : null;
}

/**
 * Gera thumbnail leve (~320px) usando createImageBitmap + canvas.
 * Não trava a UI e evita guardar dataURLs gigantes na memória.
 */
async function makeThumb(file: File, maxDim = 320): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no ctx");
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch (err) {
    console.warn("[bulk] thumb fallback", file.name, err);
    return "";
  }
}

function formatDateForInput(iso: string | null): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
  if (m) return `${m[1]}T${m[2]}`;
  try {
    const d = new Date(iso);
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
  } catch { /* ignore parse errors */ }
  return "";
}

type AdminFeedback = {
  venue_name: string | null;
  corrected_category: string | null;
  corrected_sub_category: string | null;
};

type BatchDefaults = {
  enabled: boolean;
  mode: "all" | "missing";
  date: string;        // YYYY-MM-DD
  time: string;        // HH:MM
  partner_id: string;
  category: string;
  sub_category: string;
};

const emptyBatchDefaults = (): BatchDefaults => ({
  enabled: false,
  mode: "missing",
  date: "",
  time: "",
  partner_id: "",
  category: "",
  sub_category: "",
});

const EventoBulkForm = () => {
  const navigate = useNavigate();
  const { cityFilter } = useAdminProfile();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [items, setItems] = useState<BulkItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [generatingDescIds, setGeneratingDescIds] = useState<Set<string>>(new Set());
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dbSlugs, setDbSlugs] = useState<Set<string>>(new Set());
  const [dbEvents, setDbEvents] = useState<Array<{ id: string; slug: string; title: string; date_time: string; venue_name: string | null; image_hash: string | null }>>([]);
  const [adminFeedback, setAdminFeedback] = useState<AdminFeedback[]>([]);
  const [batchDefaults, setBatchDefaults] = useState<BatchDefaults>(emptyBatchDefaults);
  const batchDefaultsRef = useRef<BatchDefaults>(emptyBatchDefaults());
  useEffect(() => { batchDefaultsRef.current = batchDefaults; }, [batchDefaults]);
  const inputRef = useRef<HTMLInputElement>(null);
  // mantém referência ao File original por item (para retry sem re-upload pelo usuário)
  const fileMapRef = useRef<Map<string, File>>(new Map());

  // ✨ Fase 2B — geração de títulos + descrições em lote (gpt-5-mini)
  const [bulkAiRunning, setBulkAiRunning] = useState(false);
  const [bulkAiProgress, setBulkAiProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [bulkAiCounts, setBulkAiCounts] = useState<{ generated: number; review: number; duplicatesSkipped: number; errors: number }>({
    generated: 0, review: 0, duplicatesSkipped: 0, errors: 0,
  });
  const bulkAiAbortRef = useRef(false);

  // Itens que o admin escolheu publicar mesmo sendo "possível duplicado"
  const [forcePublishIds, setForcePublishIds] = useState<Set<string>>(new Set());
  const toggleForcePublish = useCallback((localId: string) => {
    setForcePublishIds((prev) => {
      const next = new Set(prev);
      if (next.has(localId)) next.delete(localId);
      else next.add(localId);
      return next;
    });
  }, []);

  // FASE 10G.1.1 — preferências/observabilidade do cache
  const [skipDescriptions, setSkipDescriptions] = useState<boolean>(() => {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem("bulk_skip_descriptions") === "1";
  });
  const [cacheCount, setCacheCount] = useState<number>(0);
  useEffect(() => {
    void bulkCacheCountIdb().then(setCacheCount);
  }, []);
  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("bulk_skip_descriptions", skipDescriptions ? "1" : "0");
    }
  }, [skipDescriptions]);
  const skipDescriptionsRef = useRef(skipDescriptions);
  useEffect(() => { skipDescriptionsRef.current = skipDescriptions; }, [skipDescriptions]);

  const handleClearFlyerCache = useCallback(async () => {
    await clearBulkCacheIdb();
    try { sessionStorage.clear(); } catch { /* ignore */ }
    setCacheCount(0);
    toast.success("Cache de flyers limpo.");
  }, []);

  // FASE 10G.1.2 — worker dedicado para `generate-description`
  const [descStatuses, setDescStatuses] = useState<Map<string, DescriptionStatus>>(new Map());
  const [descErrorCount, setDescErrorCount] = useState(0);
  const descWorker = useMemo(() => getDescriptionWorker(), []);

  const setDescStatus = useCallback((id: string, status: DescriptionStatus) => {
    setDescStatuses((prev) => {
      const next = new Map(prev);
      next.set(id, status);
      return next;
    });
  }, []);

  const enqueueDescription = useCallback((
    localId: string,
    payload: Parameters<typeof descWorker.enqueue>[0]["payload"],
  ) => {
    descWorker.enqueue({
      id: localId,
      payload,
      onUpdate: (u) => {
        if (u.status === "done") {
          const r: DescriptionResult = u.result;
          const warnings = r.ai_warnings ?? [];
          const conf = r.ai_confidence_score ?? null;
          const lowConfidence = typeof conf === "number" && conf < 70;
          patchForm(localId, {
            description: r.description_html || undefined,
            short_summary: r.short_summary || undefined,
            meta_title: r.meta_title || undefined,
            meta_description: r.meta_description || undefined,
            instagram_caption: r.instagram_caption || undefined,
            ai_confidence_score: conf,
            ai_warnings: warnings,
            needs_review: lowConfidence || warnings.length > 0,
          } as Partial<EventFormData>);
          setDescStatus(localId, "done");
        } else if (u.status === "error") {
          setDescStatus(localId, "error");
          setDescErrorCount(descWorker.errorCount());
        } else {
          setDescStatus(localId, u.status);
        }
        if (u.status !== "error") setDescErrorCount(descWorker.errorCount());
      },
    });
    setDescStatus(localId, "queued");
  }, [descWorker, setDescStatus]);

  const handleRequeueDescriptionErrors = useCallback(() => {
    const n = descWorker.requeueErrors();
    if (n === 0) {
      toast.info("Nenhuma descrição com erro para reprocessar.");
      return;
    }
    setDescErrorCount(descWorker.errorCount());
    toast.info(`Reprocessando ${n} descrição(ões)...`);
  }, [descWorker]);

  // FASE 10G.1.3 — Cancelamento seguro do lote
  const cancelRef = useRef<boolean>(false);
  const [cancelRequested, setCancelRequested] = useState(false);
  const handleCancelBatch = useCallback(() => {
    if (cancelRef.current) return;
    cancelRef.current = true;
    setCancelRequested(true);
    updateBulkRuntimeStats({ cancelRequested: true });
    stressLog("cancel_requested", { ts: Date.now() });
    toast.warning("Cancelamento solicitado — itens em andamento finalizam, fila pausa.");
  }, []);

  // FASE 10G.1.3 — Recuperação de rascunho
  const [draftRecoveryOffer, setDraftRecoveryOffer] = useState<{ ts: number; count: number } | null>(null);
  const draftLoadedRef = useRef(false);
  useEffect(() => {
    if (draftLoadedRef.current) return;
    draftLoadedRef.current = true;
    void loadBulkDraft<{ form: EventFormData; status: ItemStatus; fileName: string; errorMsg?: string }>()
      .then((d) => {
        if (d && d.items.length > 0) {
          setDraftRecoveryOffer({ ts: d.ts, count: d.items.length });
        }
      });
  }, []);
  const handleRecoverDraft = useCallback(async () => {
    const d = await loadBulkDraft<{ form: EventFormData; status: ItemStatus; fileName: string; errorMsg?: string }>();
    if (!d) { setDraftRecoveryOffer(null); return; }
    const restored: BulkItem[] = d.items.map((p) => ({
      localId: crypto.randomUUID(),
      fileName: p.fileName,
      thumbDataUrl: "",
      // Itens "uploading"/"extracting" voltam como erro — arquivo original não pode ser restaurado.
      status: p.status === "uploading" || p.status === "extracting" || p.status === "queued" ? "error" : p.status,
      errorMsg: p.errorMsg || (p.status !== "ready" ? "Rascunho restaurado — re-subir flyer para reprocessar" : undefined),
      expanded: false,
      form: p.form,
    }));
    setItems(restored);
    setDraftRecoveryOffer(null);
    toast.success(`Rascunho restaurado (${restored.length} item(ns)).`);
  }, []);
  const handleDiscardDraft = useCallback(async () => {
    await clearBulkDraft();
    setDraftRecoveryOffer(null);
  }, []);




  useEffect(() => {
    let q = supabase.from("partners").select("*").eq("active", true).order("name");
    if (cityFilter) q = q.eq("city", cityFilter);
    q.then(({ data }) => setPartners(data || []));
  }, [cityFilter]);

  // Load admin correction memory (learning from past edits)
  useEffect(() => {
    supabase
      .from("ai_event_feedback_memory" as any)
      .select("venue_name, corrected_category, corrected_sub_category")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => setAdminFeedback((data as any) || []));
  }, []);

  // Load existing slugs from DB for duplicate detection
  useEffect(() => {
    let q = supabase.from("events").select("id, slug, title, date_time, venue_name, image_hash");
    if (cityFilter) q = q.eq("city", cityFilter);
    q.then(({ data }) => {
      if (data) {
        setDbEvents(data as any);
        setDbSlugs(new Set(data.map((r: any) => r.slug).filter(Boolean)));
      }
    });
  }, [cityFilter]);

  // FIX bulk_events_performance — avisa antes de sair com lote em andamento
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const inflight = items.some(
        (it) => it.status === "queued" || it.status === "uploading" || it.status === "extracting",
      );
      if (!inflight && !bulkAiRunning) return;
      e.preventDefault();
      e.returnValue = "Lote em processamento. Sair agora pode perder o progresso.";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [items, bulkAiRunning]);


  /**
   * Validação inteligente (aditiva): score 0–100 por item, comparando
   * candidato vs base de eventos. Não bloqueia publicação — apenas marca.
   */
  const smartDuplicates = useMemo<Map<string, DuplicateConfidenceResult>>(() => {
    const map = new Map<string, DuplicateConfidenceResult>();
    if (!dbEvents.length) return map;
    const existing: (DuplicateConfidenceExisting & { dedupe_key?: string | null })[] = dbEvents.map((e) => ({
      id: e.id,
      title: e.title,
      date_time: e.date_time,
      venue_name: e.venue_name,
      image_hash: e.image_hash,
      slug: e.slug,
      flyer_fingerprint: generateFlyerFingerprint({ image_hash: e.image_hash }),
    }));
    for (const it of items) {
      if (!it.form.title || !it.form.date_time) continue;
      const fp = generateFlyerFingerprint({
        image_hash: it.form.image_hash,
        image_url: it.form.image_url,
      });
      const result = findPossibleDuplicateEvent(
        {
          id: undefined,
          title: it.form.title,
          date_time: it.form.date_time,
          venue_name: it.form.venue_name,
          address: it.form.address,
          instagram: it.form.instagram,
          partner_id: it.form.partner_id || null,
          image_hash: it.form.image_hash,
          flyer_fingerprint: fp,
        },
        existing,
      );
      if (result.decision !== "clear") {
        map.set(it.localId, result);
      }
    }
    return map;
  }, [items, dbEvents]);

  // ════════════════════════════════════════════════════════════════════
  // Classificação de itens — separa claramente:
  //   • incomplete       → faltam title/date/venue (NÃO é duplicado)
  //   • confirmedReal    → mesmo image_hash em DB, mesmo slug em DB,
  //                        slug repetido no lote, OU score >= 95
  //   • possibleDup      → score 60–94 (warning, permite publicar)
  //
  // ❌ Não é mais "duplicado" automaticamente por:
  //    - mesma categoria, mesmo local, mesma data, título parecido <95
  //    - assinatura (título+venue+dia) sem image_hash nem score alto
  // ════════════════════════════════════════════════════════════════════
  const itemFlags = useMemo(() => {
    const incompleteIds = new Set<string>();
    const confirmedRealIds = new Set<string>();
    const possibleDupIds = new Set<string>();
    const reasonById = new Map<string, string>();

    const dbHashSet = new Set<string>(
      dbEvents.map((e) => e.image_hash).filter((h): h is string => !!h),
    );
    const slugCounts = new Map<string, number>();
    for (const it of items) {
      const s = (it.form.slug || "").trim();
      if (s) slugCounts.set(s, (slugCounts.get(s) || 0) + 1);
    }

    for (const it of items) {
      const f = it.form;
      const hasTitle = !!(f.title || "").trim();
      const hasDate = !!(f.date_time || "").trim();
      const hasVenue = !!(f.venue_name || "").trim();
      if (!hasTitle || !hasDate || !hasVenue) {
        incompleteIds.add(it.localId);
        const missing = [
          !hasTitle && "título",
          !hasDate && "data",
          !hasVenue && "local",
        ].filter(Boolean).join(", ");
        reasonById.set(it.localId, `Dados incompletos: faltam ${missing}.`);
        continue;
      }

      const slug = (f.slug || "").trim();
      const hashHit = !!f.image_hash && dbHashSet.has(f.image_hash);
      const slugHitDb = !!slug && dbSlugs.has(slug);
      const slugRepeatedInBatch = !!slug && (slugCounts.get(slug) || 0) > 1;

      if (hashHit) {
        confirmedRealIds.add(it.localId);
        const matched = dbEvents.find((e) => e.image_hash === f.image_hash);
        reasonById.set(
          it.localId,
          matched
            ? `Mesmo flyer (image_hash) já cadastrado em: "${matched.title}".`
            : `Mesmo flyer (image_hash) já cadastrado.`,
        );
        continue;
      }
      if (slugHitDb) {
        confirmedRealIds.add(it.localId);
        reasonById.set(it.localId, `Slug "${slug}" já existe na agenda.`);
        continue;
      }
      if (slugRepeatedInBatch) {
        confirmedRealIds.add(it.localId);
        reasonById.set(it.localId, `Slug "${slug}" repetido neste lote.`);
        continue;
      }

      const sd = smartDuplicates.get(it.localId);
      if (sd && sd.duplicate_score >= 95) {
        confirmedRealIds.add(it.localId);
        reasonById.set(
          it.localId,
          `Score ${sd.duplicate_score}/100 — coincide com "${sd.matched_event_title ?? "evento existente"}".`,
        );
      } else if (sd && sd.level !== "none") {
        possibleDupIds.add(it.localId);
        reasonById.set(
          it.localId,
          `Possível duplicado (${sd.duplicate_score}/100) — similar a "${sd.matched_event_title ?? "evento existente"}".`,
        );
      }
    }

    return { incompleteIds, confirmedRealIds, possibleDupIds, reasonById };
  }, [items, dbEvents, dbSlugs, smartDuplicates]);

  // Compat: duplicateIds = só duplicados REAIS confirmados.
  const duplicateIds = itemFlags.confirmedRealIds;



  function patchItem(localId: string, patch: Partial<BulkItem>) {
    setItems((prev) => prev.map((it) => (it.localId === localId ? { ...it, ...patch } : it)));
  }
  function patchForm(localId: string, patch: Partial<EventFormData>) {
    setItems((prev) =>
      prev.map((it) => (it.localId === localId ? { ...it, form: { ...it.form, ...patch } } : it)),
    );
  }

  async function uploadAndProcess(file: File, localId: string) {
    patchItem(localId, { status: "uploading", errorMsg: undefined });
    const t0 = performance.now();
    bulkLog("extraction_start", { id: localId, file: file.name });
    try {
      // 0. Compressão antes do upload (resize 1600px, JPEG q=0.8).
      const { file: workFile, bytesBefore, bytesAfter, compressed } =
        await compressImage(file);
      if (compressed) {
        bulkLog("resized", {
          id: localId,
          file: file.name,
          size_before: bytesBefore,
          size_after: bytesAfter,
        });
      }
      // Atualiza referência para retry usar o arquivo já comprimido.
      fileMapRef.current.set(localId, workFile);

      // 1. Hash da imagem comprimida (image_hash final).
      const imageHash = await sha256File(workFile);

      // 1b. Cache de extração por (nome|size|lastModified) — evita reler.
      const cached = readExtractionCache<any>(file);
      let publicUrl: string | null = cached?.image_url ?? null;

      if (!publicUrl) {
        // 2. Upload (somente se cache não tiver image_url válida).
        const ext = (workFile.name.split(".").pop() || "jpg").toLowerCase();
        const path = `events/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("uploads")
          .upload(path, workFile, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        publicUrl = supabase.storage.from("uploads").getPublicUrl(path).data.publicUrl;
      } else {
        bulkLog("cache_hit_url", { id: localId, file: file.name });
      }

      patchItem(localId, { status: "extracting" });
      patchForm(localId, { image_url: publicUrl });

      // 3. AI extract — com fallback ao cache.
      const bdNow = batchDefaultsRef.current;
      const bdPartner = bdNow.enabled && bdNow.partner_id ? partners.find((p) => p.id === bdNow.partner_id) : null;

      let data: any = cached?.data ?? null;
      if (!data) {
        const ocrT0 = performance.now();
        ocrLog("start", { id: localId, file: file.name, size_before: bytesBefore, size_after: bytesAfter });
        const extractResp = await supabase.functions.invoke("extract-flyer-metadata", {
          body: {
            image_url: publicUrl,
            current_year: new Date().getFullYear(),
            verified_partners: partners
              .filter((p: any) => p.verified_partner)
              .map((p: any) => ({
                name: p.name,
                address: p.address,
                instagram: p.instagram,
                type: p.type,
                sub_category: p.sub_category,
              })),
            admin_feedback: adminFeedback,
            batch_defaults: bdNow.enabled ? {
              date: bdNow.date || null,
              time: bdNow.time || null,
              partner_id: bdNow.partner_id || null,
              partner_name: bdPartner?.name || null,
              category: bdNow.category || null,
              sub_category: bdNow.sub_category || null,
              mode: bdNow.mode,
            } : null,
          },
        });
        const ocrMs = Math.round(performance.now() - ocrT0);
        if (extractResp.error) {
          ocrLog("error", { id: localId, file: file.name, duration_ms: ocrMs, message: String(extractResp.error?.message || extractResp.error) });
          throw extractResp.error;
        }
        ocrLog("done", { id: localId, file: file.name, duration_ms: ocrMs, status: "ok", size_before: bytesBefore, size_after: bytesAfter });
        data = extractResp.data;
        if (data && typeof data === "object" && !(data.error && !data.title)) {
          writeExtractionCache(file, {
            data,
            image_url: publicUrl,
            image_hash: imageHash,
          });
        }
      } else {
        bulkLog("cache_hit_data", { id: localId, file: file.name });
        ocrLog("cache_hit", { id: localId, file: file.name });
      }

      if (!data || typeof data !== "object") {
        patchItem(localId, { status: "ready" });
        bulkLog("extraction_done", { id: localId, duration_ms: Math.round(performance.now() - t0), cached: !!cached });
        return;
      }
      if (data.error && !data.title) {
        patchItem(localId, { status: "ready" });
        return;
      }

      const matched = matchPartner(data.venue_name, partners, data.venue_confidence);
      const dateInput = formatDateForInput(data.date_iso);

      // 📅 Score numérico de confiança da data (0–100)
      const dateScore: number = typeof data.date_confidence_score === "number" ? data.date_confidence_score : -1;
      const dateLabel: string | null = typeof data.date_confidence_label === "string" ? data.date_confidence_label : null;
      const dateBadge =
        dateScore >= 80 ? "📅 Data: Alta confiança"
        : dateScore >= 55 ? "📅 Data: Média confiança — confira"
        : dateScore >= 0 ? "📅 Data: BAIXA confiança — revisar manualmente"
        : null;
      const lowDateConfidence = dateScore >= 0 && dateScore < 55;

      const warnings: string[] = [];
      if (dateBadge) warnings.push(dateBadge);
      if (data.category_override_reason) warnings.push(data.category_override_reason);
      if (data.date_needs_review) warnings.push(`📅 Data precisa revisão${data.date_validation_note ? `: ${data.date_validation_note}` : ""}`);
      if (data.date_validation_note && !data.date_needs_review) warnings.push(`📅 ${data.date_validation_note}`);
      if (data.genre_needs_review) warnings.push("🎵 Gênero musical com baixa certeza — confira");
      const categoryWarning: string | null = warnings.length ? warnings.join(" • ") : null;

      // Força needs_review quando data tem baixa confiança — evita publicação automática em data errada
      const finalNeedsReview = Boolean(data.needs_review) || lowDateConfidence || Boolean(data.date_needs_review);

      console.log("[bulk] extracted", {
        title: data.title, date_iso: data.date_iso, dateScore, dateLabel,
        date_needs_review: data.date_needs_review, finalNeedsReview,
      });

      let readyForm: EventFormData | null = null;
      setItems((prev) =>
        prev.map((it) => {
          if (it.localId !== localId) return it;
          const upperTitle = (data.title || it.form.title || "").toUpperCase();
          // Se a confiança é baixa, não pré-preencher a data — força admin a digitar
          const safeDateInput = lowDateConfidence ? "" : dateInput;
          const extractedDateTime = safeDateInput || it.form.date_time;

          // === 🧭 Aplicação dos PADRÕES DO LOTE ===
          const bd = batchDefaultsRef.current;
          const force = bd.enabled && bd.mode === "all";
          const fillMissing = bd.enabled && bd.mode === "missing";
          const pickBatch = <T,>(extractedVal: T, batchVal: T | "" | null | undefined, extractedExists: boolean): T => {
            if (!bd.enabled || !batchVal) return extractedVal;
            if (force) return batchVal as T;
            if (fillMissing && !extractedExists) return batchVal as T;
            return extractedVal;
          };

          // date_time: combina batch date + batch time quando aplicável
          const extractedHasDate = !!extractedDateTime && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(extractedDateTime);
          const extractedHasTime = extractedHasDate && data.time_is_unknown !== true;
          let finalDateTime = extractedDateTime;
          let finalTimeIsUnknown: boolean = data.time_is_unknown === true || !extractedHasTime;
          if (bd.enabled && (bd.date || bd.time)) {
            const useBatchDate = force ? !!bd.date : fillMissing ? (!extractedHasDate && !!bd.date) : false;
            const useBatchTime = force ? !!bd.time : fillMissing ? (!extractedHasTime && !!bd.time) : false;
            const baseDate = useBatchDate ? bd.date : (extractedHasDate ? extractedDateTime.slice(0, 10) : "");
            const baseTime = useBatchTime ? bd.time : (extractedHasTime ? extractedDateTime.slice(11, 16) : "");
            if (baseDate && baseTime) {
              finalDateTime = `${baseDate}T${baseTime}`;
              finalTimeIsUnknown = false;
            } else if (baseDate) {
              finalDateTime = `${baseDate}T00:00`;
              finalTimeIsUnknown = true;
            }
          }

          // venue/partner
          const batchPartner = bd.enabled && bd.partner_id ? partners.find((p) => p.id === bd.partner_id) : null;
          const partnerObj = pickBatch(matched, batchPartner, !!matched);
          const finalCategory = pickBatch(
            data.category || it.form.category,
            bd.category,
            !!data.category,
          );
          const finalSub = pickBatch(
            data.sub_category || "",
            bd.sub_category,
            !!data.sub_category,
          );

          const next: EventFormData = {
            ...it.form,
            image_url: publicUrl,
            image_hash: imageHash,
            title: upperTitle,
            slug: upperTitle ? slugify(upperTitle) : it.form.slug,
            date_time: finalDateTime,
            time_is_unknown: finalTimeIsUnknown,
            category: finalCategory,
            venue_name: partnerObj ? partnerObj.name : (data.venue_name || ""),
            address: partnerObj ? (partnerObj.address || "") : (data.address || ""),
            instagram: partnerObj ? (partnerObj.instagram || "") : (data.instagram || ""),
            partner_id: partnerObj ? partnerObj.id : "",
            ticket_url: "",
            verification_source: "instagram",
            opportunity_tags: data.opportunity_tags || [],
            ...(finalSub ? { _sub: finalSub } as any : {}),
            ...(data.ai_confidence ? { ai_confidence: data.ai_confidence } as any : {}),
            needs_review: finalNeedsReview,
          } as EventFormData;
          readyForm = next;
          // HOTFIX — auto-arquiva eventos claramente passados (SP tz).
          // "ambiguous" e sem data NUNCA são arquivados automaticamente.
          const pastness = classifyBulkItemDate(finalDateTime);
          const autoArchive = pastness === "past" && !finalNeedsReview;
          return {
            ...it,
            form: next,
            status: "ready",
            categoryWarning,
            pastness,
            archived: autoArchive ? true : it.archived,
          };
        }),
      );



      // FASE 10G.1.2 — Geração de descrição agora roda no worker dedicado.
      // Não bloqueia o pipeline de extração. Erro aqui não invalida o item.
      const f = readyForm as EventFormData | null;
      if (f && f.title && f.title.length > 3 && !skipDescriptionsRef.current) {
        const previousDescs = items
          .map((x) => x.form.description)
          .filter((d): d is string => !!d && d.length > 30)
          .slice(-5);
        enqueueDescription(localId, {
          title: f.title,
          venue_name: f.venue_name || "",
          address: f.address || "",
          date_time: f.date_time || "",
          category: f.category || "festa",
          sub_category: (f as any)._sub || "",
          partner_id: f.partner_id || undefined,
          seed_index: Date.now() % 10000 + Math.floor(Math.random() * 100),
          previous_descriptions: previousDescs,
        });
      }
      bulkLog("extraction_done", { id: localId, duration_ms: Math.round(performance.now() - t0) });
    } catch (err: any) {
      console.error("[bulk] process error", err);
      bulkLog("extraction_error", { id: localId, file: file.name, message: err?.message });
      patchItem(localId, { status: "error", errorMsg: err?.message || "Falha ao processar" });
    }
  }

  async function handleFiles(files: FileList | File[]) {
    let arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!arr.length) return;

    // FASE 10G.1.3 — limite de proteção (50 flyers/lote)
    if (arr.length > MAX_BATCH_FLYERS) {
      toast.warning(
        `Lotes acima de ${MAX_BATCH_FLYERS} imagens devem ser divididos para garantir estabilidade. Processando os primeiros ${MAX_BATCH_FLYERS}.`,
        { duration: 6000 },
      );
      arr = arr.slice(0, MAX_BATCH_FLYERS);
    }

    // Reseta flag de cancelamento ao iniciar novo lote
    cancelRef.current = false;
    setCancelRequested(false);
    updateBulkRuntimeStats({ cancelRequested: false });

    const batchT0 = performance.now();
    bulkLog("selected_files", { count: arr.length });
    stressLog("batch_start", { batch_size: arr.length });

    // 1) Cria placeholders IMEDIATAMENTE com status "queued" — UI responde no ato.
    const placeholders: BulkItem[] = arr.map((file) => {
      const localId = crypto.randomUUID();
      fileMapRef.current.set(localId, file);
      // Aviso amigável para arquivos muito grandes (>8MB) — apenas log/toast, não bloqueia.
      if (file.size > 8 * 1024 * 1024) {
        console.warn(`[bulk] arquivo grande: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      }
      return {
        localId,
        fileName: file.name,
        thumbDataUrl: "",
        status: "queued",
        expanded: false,
        form: emptyEventForm(),
      };
    });
    setItems((prev) => [...prev, ...placeholders]);

    // 2) Geração de thumbnails em background, com yield entre cada item
    //    para não travar a thread principal.
    (async () => {
      for (let i = 0; i < arr.length; i++) {
        if (cancelRef.current) break;
        const thumb = await makeThumb(arr[i]);
        patchItem(placeholders[i].localId, { thumbDataUrl: thumb });
        // yield para o navegador respirar (pintura, scroll, inputs)
        await new Promise((r) => setTimeout(r, 0));
      }
    })();

    // 3) Pool de concorrência: processa até MAX_CONCURRENT_FLYERS em paralelo.
    //    Erros individuais NÃO derrubam o lote — ficam isolados no item.
    let cursor = 0;
    const workers = Array.from({ length: Math.min(MAX_CONCURRENT_FLYERS, arr.length) }, async () => {
      while (true) {
        const my = cursor++;
        if (my >= arr.length) return;
        if (cancelRef.current) {
          // Marca todos os pendentes (incluindo este) como cancelados.
          patchItem(placeholders[my].localId, { status: "cancelled", errorMsg: "Cancelado pelo usuário" });
          continue;
        }
        const file = arr[my];
        const localId = placeholders[my].localId;
        const t0 = performance.now();
        console.log(`[bulk] start ${my + 1}/${arr.length} ${file.name}`);
        try {
          await uploadAndProcess(file, localId);
        } catch (e) {
          console.error(`[bulk] item ${my + 1} fatal`, e);
        }
        console.log(`[bulk] done  ${my + 1}/${arr.length} ${file.name} in ${Math.round(performance.now() - t0)}ms`);
      }
    });
    await Promise.all(workers);
    const durationMs = Math.round(performance.now() - batchT0);
    const processed = arr.length;
    stressLog("batch_end", {
      batch_size: processed,
      duration_ms: durationMs,
      avg_duration_ms: processed ? Math.round(durationMs / processed) : 0,
      cancelled: cancelRef.current,
    });
    console.log(`[bulk] all ${processed} processed in ${durationMs}ms`);
    if (cancelRef.current) {
      toast.info("Lote cancelado. Itens concluídos foram preservados.");
    }
  }


  // Retry isolado de um único item com erro
  async function retryItem(localId: string) {
    const file = fileMapRef.current.get(localId);
    if (!file) {
      toast.error("Arquivo original indisponível — re-suba o flyer.");
      return;
    }
    patchItem(localId, { status: "queued", errorMsg: undefined });
    await uploadAndProcess(file, localId);
  }

  // FASE 10G.2 — Reprocessar todas as falhas do lote em paralelo (pool 3).
  async function retryAllFailures() {
    const failures = items.filter((it) => it.status === "error");
    if (!failures.length) {
      toast.info("Sem falhas para reprocessar.");
      return;
    }
    toast.info(`Reprocessando ${failures.length} flyer(s) com erro...`);
    failures.forEach((it) => patchItem(it.localId, { status: "queued", errorMsg: undefined }));
    const CONCURRENCY = 3;
    let cursor = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, failures.length) }, async () => {
      while (true) {
        const my = cursor++;
        if (my >= failures.length) return;
        const it = failures[my];
        const file = fileMapRef.current.get(it.localId);
        if (!file) {
          patchItem(it.localId, { status: "error", errorMsg: "Arquivo indisponível" });
          continue;
        }
        try { await uploadAndProcess(file, it.localId); } catch { /* isolated */ }
      }
    });
    await Promise.all(workers);
    toast.success("Reprocessamento concluído.");
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  }

  function removeItem(localId: string) {
    fileMapRef.current.delete(localId);
    setItems((prev) => prev.filter((it) => it.localId !== localId));
  }
  function addBlankItem() {
    const bd = batchDefaultsRef.current;
    const base = emptyEventForm();
    if (bd.enabled) {
      if (bd.date && bd.time) {
        base.date_time = `${bd.date}T${bd.time}`;
        base.time_is_unknown = false;
      } else if (bd.date) {
        base.date_time = `${bd.date}T00:00`;
        base.time_is_unknown = true;
      }
      if (bd.category) base.category = bd.category;
      if (bd.sub_category) (base as any)._sub = bd.sub_category;
      if (bd.partner_id) {
        const p = partners.find((x) => x.id === bd.partner_id);
        if (p) {
          base.partner_id = p.id;
          base.venue_name = p.name;
          base.address = p.address || "";
          base.instagram = p.instagram || "";
        }
      }
    }
    setItems((prev) => [
      ...prev,
      {
        localId: crypto.randomUUID(),
        fileName: "Sem flyer",
        thumbDataUrl: "",
        status: "ready",
        expanded: true,
        form: base,
      },
    ]);
  }

  /**
   * Aplica padrões do lote em TODOS os eventos já carregados, em uma única
   * atualização de estado. Evita reprocessar IA e evita re-render a cada
   * tecla nos campos de padrão.
   */
  const applyBatchDefaultsToAll = useCallback(() => {
    const bd = batchDefaultsRef.current;
    if (!bd.enabled) {
      toast.info("Ative os padrões antes de aplicar.");
      return;
    }
    const partner = bd.partner_id ? partners.find((p) => p.id === bd.partner_id) || null : null;
    let touched = 0;
    setItems((prev) =>
      prev.map((it) => {
        if (it.status !== "ready") return it;
        const force = bd.mode === "all";
        const fillMissing = bd.mode === "missing";
        const f = it.form;
        const hasDate = !!f.date_time && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(f.date_time);
        const hasTime = hasDate && f.time_is_unknown !== true;
        const next: EventFormData = { ...f };
        let changed = false;

        if (bd.date || bd.time) {
          const useBatchDate = force ? !!bd.date : fillMissing ? (!hasDate && !!bd.date) : false;
          const useBatchTime = force ? !!bd.time : fillMissing ? (!hasTime && !!bd.time) : false;
          const baseDate = useBatchDate ? bd.date : (hasDate ? f.date_time.slice(0, 10) : "");
          const baseTime = useBatchTime ? bd.time : (hasTime ? f.date_time.slice(11, 16) : "");
          if (baseDate && baseTime) {
            const dt = `${baseDate}T${baseTime}`;
            if (dt !== f.date_time) { next.date_time = dt; next.time_is_unknown = false; changed = true; }
          } else if (baseDate) {
            const dt = `${baseDate}T00:00`;
            if (dt !== f.date_time) { next.date_time = dt; next.time_is_unknown = true; changed = true; }
          }
        }
        if (bd.partner_id && partner && (force || (fillMissing && !f.partner_id))) {
          if (next.partner_id !== partner.id) {
            next.partner_id = partner.id;
            next.venue_name = partner.name;
            next.address = partner.address || "";
            next.instagram = partner.instagram || "";
            changed = true;
          }
        }
        if (bd.category && (force || (fillMissing && !f.category))) {
          if (next.category !== bd.category) { next.category = bd.category; changed = true; }
        }
        if (bd.sub_category && (force || (fillMissing && !(f as any)._sub))) {
          if ((next as any)._sub !== bd.sub_category) { (next as any)._sub = bd.sub_category; changed = true; }
        }
        if (changed) touched++;
        return changed ? { ...it, form: next } : it;
      }),
    );
    toast.success(`Padrões aplicados em ${touched} evento(s).`);
  }, [partners]);


  async function handleGenerateDescription(localId: string) {
    const it = items.find((x) => x.localId === localId);
    if (!it || !it.form.title) return;
    setGeneratingDescIds((s) => new Set(s).add(localId));
    try {
      const { data, error } = await supabase.functions.invoke("generate-description", {
        body: {
          title: it.form.title,
          venue_name: it.form.venue_name,
          address: it.form.address,
          date_time: it.form.date_time,
          category: it.form.category,
          sub_category: (it.form as any)._sub || "",
          partner_id: it.form.partner_id || undefined,
          seed_index: Date.now() % 10000 + Math.floor(Math.random() * 100),
        },
      });
      if (error) throw error;
      const rich = data?.descricao_rica || data?.description;
      if (rich) {
        patchForm(localId, { description: rich });
        if (data?.chamada_site) toast.success(`Copy: "${data.chamada_site}"`);
      }
    } catch {
      toast.error("Erro ao gerar descrição");
    } finally {
      setGeneratingDescIds((s) => {
        const n = new Set(s);
        n.delete(localId);
        return n;
      });
    }
  }

  async function handleGenerateAllCaptions() {
    const targets = items.filter((it) => it.status === "ready" && it.form.title && !it.form.description);
    if (!targets.length) {
      toast.info("Todas as legendas já foram geradas");
      return;
    }
    setBulkGenerating(true);
    toast.info(`Gerando ${targets.length} legenda(s)...`);
    for (const it of targets) {
      await handleGenerateDescription(it.localId);
    }
    setBulkGenerating(false);
    toast.success("Legendas do lote geradas!");
  }

  /**
   * ✨ Fase 2B — Gera títulos + descrições + SEO + caption IG para todos os itens
   * elegíveis do lote, usando a edge function generate-description (gpt-5-mini).
   *
   * Regras de pular item:
   *   - status !== "ready"
   *   - item marcado como duplicado (duplicateIds)
   *   - smartDuplicates.decision === "confirmed"
   *   - sem título OU sem (venue_name + date_time)
   *
   * Concorrência: 2 chamadas simultâneas, com progresso e botão Parar.
   * Confidence < 70 → marca needs_review (vai p/ rascunho mesmo se admin clicar Publicar).
   */
  async function handleBulkGenerateAi() {
    if (bulkAiRunning) return;
    const eligible = items.filter((it) => {
      if (it.status !== "ready") return false;
      if (it.archived) return false; // HOTFIX: não regenera arquivados
      if (!it.form.title) return false;
      if (!it.form.venue_name || !it.form.date_time) return false;
      const sd = smartDuplicates.get(it.localId);
      if (sd?.decision === "confirmed") return false;
      if (duplicateIds.has(it.localId)) return false;
      // HOTFIX: evita chamada dupla quando o worker automático já preencheu
      // description sem marcar needs_review. Admin ainda pode regerar item a
      // item via "Gerar descrição" no ReviewRow.
      const f = it.form as any;
      const alreadyDescribed = !!(f.description && f.description.length > 40);
      const flaggedForReview = Boolean(f.needs_review) || (Array.isArray(f.ai_warnings) && f.ai_warnings.length > 0);
      if (alreadyDescribed && !flaggedForReview) return false;
      return true;
    });


    const duplicatesSkipped = items.filter(
      (it) => duplicateIds.has(it.localId) || smartDuplicates.get(it.localId)?.decision === "confirmed",
    ).length;

    if (!eligible.length) {
      toast.info(`Nenhum item elegível. ${duplicatesSkipped} duplicado(s) ignorado(s).`);
      return;
    }

    bulkAiAbortRef.current = false;
    setBulkAiRunning(true);
    setBulkAiCounts({ generated: 0, review: 0, duplicatesSkipped, errors: 0 });
    setBulkAiProgress({ current: 0, total: eligible.length });
    toast.info(`Gerando ${eligible.length} descrição(ões) com IA...`);

    let completed = 0;
    const CONCURRENCY = 2;
    let cursor = 0;

    async function processOne(it: BulkItem) {
      if (bulkAiAbortRef.current) return;
      try {
        const { data, error } = await supabase.functions.invoke("generate-description", {
          body: {
            title: it.form.title,
            venue_name: it.form.venue_name,
            address: it.form.address,
            date_time: it.form.date_time,
            category: it.form.category,
            sub_category: (it.form as any)._sub || "",
            partner_id: it.form.partner_id || undefined,
            time_is_unknown: Boolean(it.form.time_is_unknown),
            ticket_url: it.form.ticket_url || "",
            instagram: it.form.instagram || "",
          },
        });
        if (error) throw error;

        const rich: string = data?.description_html || data?.descricao_rica || data?.description || "";
        const chamada: string | undefined = data?.title || data?.chamada_site;
        const warnings: string[] = Array.isArray(data?.warnings) ? data.warnings : [];
        const confidence: number | null =
          typeof data?.ai_confidence_score === "number" ? data.ai_confidence_score : null;
        const lowConfidence = typeof confidence === "number" && confidence < 70;

        patchForm(it.localId, {
          title: chamada || it.form.title,
          description: rich || it.form.description,
          short_summary: data?.short_summary || "",
          meta_title: data?.meta_title || "",
          meta_description: data?.meta_description || "",
          instagram_caption: data?.instagram_caption || "",
          ai_confidence_score: confidence,
          ai_warnings: warnings,
          needs_review: lowConfidence || warnings.length > 0,
        });

        setBulkAiCounts((c) => ({
          ...c,
          generated: c.generated + 1,
          review: c.review + (lowConfidence || warnings.length > 0 ? 1 : 0),
        }));
      } catch (err: any) {
        console.error("[bulk-ai] item failed", it.localId, err);
        setBulkAiCounts((c) => ({ ...c, errors: c.errors + 1 }));
      } finally {
        completed += 1;
        setBulkAiProgress({ current: completed, total: eligible.length });
      }
    }

    async function worker() {
      while (!bulkAiAbortRef.current) {
        const i = cursor++;
        if (i >= eligible.length) return;
        await processOne(eligible[i]);
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, eligible.length) }, worker));

    setBulkAiRunning(false);
    if (bulkAiAbortRef.current) {
      toast.warning(`Geração interrompida. ${completed}/${eligible.length} processados.`);
    } else {
      toast.success(`✅ ${completed} descrição(ões) geradas pela IA.`);
    }
  }

  function cancelBulkAi() {
    bulkAiAbortRef.current = true;
  }

  function handlePartnerSelect(localId: string, partnerId: string) {
    if (!partnerId) {
      patchForm(localId, { partner_id: "" });
      return;
    }
    const p = partners.find((x) => x.id === partnerId);
    if (!p) return;
    patchForm(localId, {
      partner_id: partnerId,
      venue_name: p.name,
      address: p.address || "",
      instagram: p.instagram || "",
    });
  }

  async function handleBulkSave(status: "draft" | "published") {
    const ready = items.filter((it) => it.status === "ready" && !it.archived);
    if (!ready.length) {
      toast.error("Nenhum evento pronto para salvar");
      return;
    }

    // ── Classificação fina ─────────────────────────────────────────────
    //   incomplete   → faltam dados essenciais (bloqueia, não é duplicado)
    //   confirmed    → duplicado real (image_hash, slug, score>=95)
    //   possible     → possível duplicado (60–94) → permite c/ Publicar mesmo assim
    //   clear        → ok
    const incomplete: BulkItem[] = [];
    const confirmed: BulkItem[] = [];
    const possibleBlocked: BulkItem[] = []; // possible sem forçar
    const possibleForced: BulkItem[] = []; // possible com forçar
    const clear: BulkItem[] = [];
    for (const it of ready) {
      if (itemFlags.incompleteIds.has(it.localId)) {
        incomplete.push(it);
      } else if (itemFlags.confirmedRealIds.has(it.localId)) {
        confirmed.push(it);
      } else if (itemFlags.possibleDupIds.has(it.localId)) {
        if (forcePublishIds.has(it.localId)) possibleForced.push(it);
        else possibleBlocked.push(it);
      } else {
        clear.push(it);
      }
    }

    const toInsert = [...clear, ...possibleForced];

    if (!toInsert.length) {
      const lines = ready.map((it, idx) => {
        const i = idx + 1;
        const titulo = it.form.title || "(sem título)";
        if (itemFlags.confirmedRealIds.has(it.localId)) {
          return `• Evento ${i} — ${titulo}: duplicado real já existente`;
        }
        if (itemFlags.possibleDupIds.has(it.localId)) {
          return `• Evento ${i} — ${titulo}: possível duplicado (use "Publicar mesmo assim" no item)`;
        }
        if (itemFlags.incompleteIds.has(it.localId)) {
          return `• Evento ${i} — ${titulo}: dados incompletos`;
        }
        return `• Evento ${i} — ${titulo}: pronto`;
      }).join("\n");
      toast.warning(
        `Nenhum evento foi publicado. Verifique os itens marcados abaixo.\n\n${lines}`,
        { duration: 14000 },
      );
      return;
    }

    // Confirmação se vai pular ou forçar duplicados
    if (confirmed.length || possibleBlocked.length || possibleForced.length || incomplete.length) {
      const summary =
        `📦 Resumo do lote\n` +
        `─────────────────\n` +
        `Eventos prontos: ${ready.length}\n` +
        `✅ Novos (sem suspeita): ${clear.length}\n` +
        (possibleForced.length ? `⚠ Possíveis duplicados forçados pelo admin: ${possibleForced.length}\n` : "") +
        (possibleBlocked.length ? `⚠ Possíveis duplicados ignorados: ${possibleBlocked.length}\n` : "") +
        (confirmed.length ? `🚫 Duplicados reais (não serão enviados): ${confirmed.length}\n` : "") +
        (incomplete.length ? `📝 Dados incompletos (não serão enviados): ${incomplete.length}\n` : "") +
        `\nSerão ${status === "published" ? "publicados" : "salvos como rascunho"}: ${toInsert.length}\n\nContinuar?`;
      if (!confirm(summary)) return;
    }

    setSaving(true);
    const tSave = performance.now();
    bulkLog("save_start", { count: toInsert.length, status });
    const nowIso = new Date().toISOString();

    // === Guard de ingestão por item — IMPORTANTE ===
    // O guard ainda pode retornar MESMO_FLYER/DUPLICATA, mas no fluxo em lote
    // a CLASSIFICAÇÃO acima já é a fonte de verdade. Guard só bloqueia
    // motivos que NÃO são duplicidade: FORA_DO_ESCOPO e EVENTO_NO_PASSADO.
    const guarded: Array<{
      it: BulkItem;
      payload: any;
      guard: Awaited<ReturnType<typeof validateBeforePublish>>;
      blocked: boolean;
      blockReason?: string;
    }> = [];
    for (const it of toInsert) {
      const isPossible = itemFlags.possibleDupIds.has(it.localId);
      const guard = await validateBeforePublish({
        source: "bulk",
        title: it.form.title,
        description: (it.form as any).description,
        venue_name: it.form.venue_name,
        partner_id: it.form.partner_id || null,
        date_time: it.form.date_time,
        image_url: it.form.image_url,
        image_hash: it.form.image_hash,
      });
      // Somente motivos NÃO-duplicidade bloqueiam aqui:
      const NON_DUP_BLOCKS = new Set(["FORA_DO_ESCOPO", "EVENTO_NO_PASSADO"]);
      const hardBlocks = guard.blockReasons.filter((r) => NON_DUP_BLOCKS.has(r));
      const needsReview = isPossible || guard.recommendedNeedsReview;
      const itemStatus: "draft" | "published" = (needsReview || hardBlocks.length) ? "draft" : status;
      const base = buildEventPayload(
        { ...it.form, needs_review: needsReview || (it.form as any).needs_review },
        { city: cityFilter, status: itemStatus },
      );
      const payload = {
        ...base,
        dedupe_key: generateEventDedupeKey({
          partner_id: it.form.partner_id || null,
          title: it.form.title,
          date_time: it.form.date_time,
          venue_name: it.form.venue_name,
        }),
        flyer_fingerprint: generateFlyerFingerprint({
          image_hash: it.form.image_hash,
          image_url: it.form.image_url,
        }),
        duplicate_checked_at: nowIso,
      };
      guarded.push({
        it,
        payload,
        guard,
        blocked: hardBlocks.length > 0,
        blockReason: hardBlocks.map((r) => REASON_LABELS[r] || r).join(", "),
      });
    }

    const guardBlocked = guarded.filter((g) => g.blocked);
    const payloads = guarded.filter((g) => !g.blocked).map((g) => g.payload);

    if (!payloads.length) {
      setSaving(false);
      const lines = guardBlocked
        .map((g, idx) => `• Evento ${idx + 1} — ${g.it.form.title || "(sem título)"}: ${g.blockReason || "validação"}`)
        .join("\n");
      toast.warning(
        `Nenhum evento foi publicado. Verifique os itens marcados abaixo.\n\n${lines}`,
        { duration: 14000 },
      );
      return;
    }

    try {
      const { data: insertedRows, error } = await supabase.from("events").insert(payloads as any).select("id");
      if (error) throw error;

      const ids = insertedRows || [];
      await Promise.all(
        guarded
          .filter((g) => !g.blocked)
          .map((g, idx) => persistValidationLog(g.guard.validationLog, ids[idx]?.id ?? null)),
      );
      await Promise.all(guardBlocked.map((g) => persistValidationLog(g.guard.validationLog)));

      const skippedTotal = confirmed.length + possibleBlocked.length + incomplete.length + guardBlocked.length;
      toast.success(
        `Lote: ${clear.length} novo(s) • ${possibleForced.length} forçado(s) • ${skippedTotal} não enviado(s)`,
        { duration: 8000 },
      );
      if (guardBlocked.length) {
        const reasons = Array.from(new Set(guardBlocked.flatMap((g) => g.guard.blockReasons))).map((r) => REASON_LABELS[r] || r);
        toast.warning(`Motivos de validação: ${reasons.join(", ")}`, { duration: 9000 });
      }
      bulkLog("save_done", { count: payloads.length, duration_ms: Math.round(performance.now() - tSave) });
      void clearBulkDraft();
      navigate("/admin/eventos");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }


  const readyCount = items.filter((it) => it.status === "ready" && !it.archived).length;
  const processingCount = items.filter((it) => it.status === "uploading" || it.status === "extracting").length;
  const queuedCount = items.filter((it) => it.status === "queued").length;
  const errorCount = items.filter((it) => it.status === "error").length;
  const cancelledCount = items.filter((it) => it.status === "cancelled").length;
  const archivedCount = items.filter((it) => it.archived).length;
  const totalCount = items.length;
  const doneForProgress = readyCount + errorCount + cancelledCount + archivedCount;
  const progressPct = totalCount ? Math.round((doneForProgress / totalCount) * 100) : 0;
  const isProcessing = processingCount > 0 || queuedCount > 0;

  // HOTFIX — abas para separar Atuais / Revisão / Prontos / Erros / Arquivados.
  // Estado local: filtro atual e helper de visibilidade.
  const [activeTab, setActiveTab] = useState<BulkTab>("atuais");
  const needsReviewCount = items.filter(
    (it) =>
      !it.archived &&
      it.status === "ready" &&
      (itemFlags.incompleteIds.has(it.localId) ||
        itemFlags.possibleDupIds.has(it.localId) ||
        Boolean((it.form as any).needs_review) ||
        it.pastness === "ambiguous"),
  ).length;
  const atuaisCount = items.filter(
    (it) => !it.archived && it.status !== "error" && it.status !== "cancelled",
  ).length;

  const visibleItems = useMemo(() => {
    return items.filter((it) => {
      if (activeTab === "todos") return true;
      if (activeTab === "arquivados") return !!it.archived;
      if (it.archived) return false;
      if (activeTab === "atuais") return it.status !== "error" && it.status !== "cancelled";
      if (activeTab === "prontos") return it.status === "ready" && !itemFlags.incompleteIds.has(it.localId);
      if (activeTab === "erros") return it.status === "error" || it.status === "cancelled";
      if (activeTab === "revisao") {
        if (it.status !== "ready") return false;
        return (
          itemFlags.incompleteIds.has(it.localId) ||
          itemFlags.possibleDupIds.has(it.localId) ||
          Boolean((it.form as any).needs_review) ||
          it.pastness === "ambiguous"
        );
      }
      return true;
    });
  }, [items, activeTab, itemFlags]);

  const setArchived = useCallback((localId: string, archived: boolean) => {
    setItems((prev) => prev.map((it) => (it.localId === localId ? { ...it, archived } : it)));
  }, []);



  // FASE 10G.1.3 — telemetria de runtime para o AdminSystem
  useEffect(() => {
    updateBulkRuntimeStats({
      queueSize: processingCount + queuedCount,
      readyCount,
      errorCount,
      cancelledCount,
      descriptionQueueSize: descWorker.pendingCount(),
      activeWorkers: processingCount,
      cancelRequested: cancelRef.current,
    });
  }, [processingCount, queuedCount, readyCount, errorCount, cancelledCount, descWorker]);
  useEffect(() => () => { resetBulkRuntimeStats(); }, []);

  // FASE 10G.1.3 — Auto-save em IndexedDB (debounced 1.2s)
  useEffect(() => {
    if (items.length === 0) return;
    const handle = setTimeout(() => {
      const slim = items.map((it) => ({
        form: it.form,
        status: it.status,
        fileName: it.fileName,
        errorMsg: it.errorMsg,
      }));
      void saveBulkDraft(slim);
      bulkLog("autosave", { count: slim.length });
    }, 1200);
    return () => clearTimeout(handle);
  }, [items]);

  return (
    <div className="md:ml-44 max-w-3xl pb-12">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </button>

      {/* FASE 10G.1.3 — banner de recuperação de rascunho */}
      {draftRecoveryOffer && (
        <div className="mb-3 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] text-foreground/90">
            Encontramos um processamento anterior ({draftRecoveryOffer.count} item{draftRecoveryOffer.count === 1 ? "" : "s"} ·{" "}
            {new Date(draftRecoveryOffer.ts).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}). Deseja continuar?
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRecoverDraft}
              className="rounded-lg bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground hover:opacity-90"
            >
              Continuar
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="rounded-lg border border-border/50 bg-secondary/40 px-3 py-1 text-[11px] hover:bg-secondary/60"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-foreground">Criar Eventos em Lote</h1>
          <p className="text-[11px] text-muted-foreground">
            Suba os banners e a IA preenche título, data, local e categoria.
          </p>
        </div>
        {items.length > 0 && (
          <span className="text-[10px] sm:text-[11px] text-muted-foreground whitespace-normal sm:whitespace-nowrap text-right">
            {readyCount} pronto{readyCount === 1 ? "" : "s"} · {processingCount} proc · {queuedCount} fila · {errorCount} erro{cancelledCount > 0 ? ` · ${cancelledCount} cancel.` : ""}
          </span>
        )}
      </div>

      {/* Barra de progresso geral do lote — sticky no mobile durante processamento */}
      {totalCount > 0 && (isProcessing || cancelRequested) && (
        <div
          className="sticky top-0 z-30 -mx-3 sm:mx-0 mb-3 px-3 sm:px-0 py-2 bg-background/95 backdrop-blur-md border-b border-border/30 sm:border-0 sm:bg-transparent sm:backdrop-blur-none sm:static sm:py-0"
          aria-label="Progresso do lote"
        >
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/60">
            <div
              className={`h-full transition-all duration-300 ${cancelRequested ? "bg-amber-500" : "bg-gradient-to-r from-primary to-accent"}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="text-[10px] text-muted-foreground truncate">
              {doneForProgress}/{totalCount} processados ({progressPct}%){cancelRequested ? " · cancelando…" : ""}
            </p>
            {isProcessing && !cancelRequested && (
              <button
                type="button"
                onClick={handleCancelBatch}
                className="flex shrink-0 items-center gap-1 rounded-lg border border-amber-500/50 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-200 hover:bg-amber-500/20"
              >
                <StopCircle className="h-3 w-3" /> Cancelar
              </button>
            )}
          </div>
        </div>
      )}


      {/* === 🧭 Padrões do Lote (opcional) === */}
      <BatchDefaultsSection
        value={batchDefaults}
        onChange={setBatchDefaults}
        partners={partners}
        onApply={applyBatchDefaultsToAll}
        hasItems={items.length > 0}
      />


      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border/50 bg-card/40 hover:border-primary/50 hover:bg-primary/5"
        }`}
      >
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-2">
          <Upload className="h-5 w-5 text-primary" />
        </div>
        <p className="text-sm font-semibold text-foreground">
          Suba seus Flyers aqui (Lote)
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          A IA lê o flyer e preenche os campos automaticamente · múltiplos arquivos
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* HOTFIX — Abas: Atuais / Revisão / Prontos / Erros / Arquivados / Todos */}
      {items.length > 0 && (
        <div className="mt-4 -mx-1 flex flex-wrap gap-1 overflow-x-auto scrollbar-hide px-1">
          {([
            ["atuais", "Atuais", atuaisCount],
            ["revisao", "Precisa revisão", needsReviewCount],
            ["prontos", "Prontos", readyCount],
            ["erros", "Com erro", errorCount + cancelledCount],
            ["arquivados", "Arquivados", archivedCount],
            ["todos", "Todos", items.length],
          ] as Array<[BulkTab, string, number]>).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                activeTab === key
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border/50 bg-secondary/40 text-muted-foreground hover:bg-secondary/60"
              }`}
            >
              {label} <span className="opacity-70">({count})</span>
            </button>
          ))}
        </div>
      )}

      {/* Thumbnail grid */}
      {items.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Banners ({visibleItems.length}/{items.length})
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {visibleItems.map((it) => (

              <div key={it.localId} className="relative aspect-square rounded-lg overflow-hidden border border-border/40 bg-secondary/30 group">
                {it.thumbDataUrl ? (
                  <img
                    src={it.thumbDataUrl}
                    alt={it.fileName}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground animate-pulse">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                  {it.status === "queued" && (
                    <div className="flex items-center gap-1 text-[9px] text-white/80">
                      <Loader2 className="h-2.5 w-2.5 animate-spin opacity-60" /> fila
                    </div>
                  )}
                  {it.status === "uploading" && (
                    <div className="flex items-center gap-1 text-[9px] text-white">
                      <Loader2 className="h-2.5 w-2.5 animate-spin" /> upload
                    </div>
                  )}
                  {it.status === "extracting" && (
                    <div className="flex items-center gap-1 text-[9px] text-primary-foreground bg-primary/80 rounded px-1">
                      <Sparkles className="h-2.5 w-2.5 animate-pulse" /> IA lendo
                    </div>
                  )}
                  {it.status === "ready" && (
                    <div className="flex items-center gap-1 text-[9px] text-emerald-300">
                      <CheckCircle2 className="h-2.5 w-2.5" /> pronto
                    </div>
                  )}
                  {it.status === "error" && (
                    <div className="flex items-center gap-1 justify-between">
                      <span className="flex items-center gap-1 text-[9px] text-destructive">
                        <AlertCircle className="h-2.5 w-2.5" /> erro
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); retryItem(it.localId); }}
                        className="text-[9px] rounded bg-white/20 px-1 py-0.5 text-white hover:bg-white/30"
                        title={it.errorMsg || "Tentar novamente"}
                      >
                        retry
                      </button>
                    </div>
                  )}
                  {it.status === "cancelled" && (
                    <div className="flex items-center gap-1 text-[9px] text-amber-300">
                      <X className="h-2.5 w-2.5" /> cancelado
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeItem(it.localId); }}
                  className="absolute top-1 right-1 rounded-full bg-black/70 p-0.5 text-white opacity-0 group-hover:opacity-100 transition"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review list */}
      {items.length > 0 && (
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Revisão do lote
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleBulkGenerateAi}
                disabled={bulkAiRunning}
                className="admin-glow flex items-center gap-1 rounded-lg bg-gradient-to-r from-primary to-accent px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:opacity-95 transition disabled:opacity-50"
                title="Gera título, descrição, SEO e legenda Instagram para todos os itens elegíveis (gpt-5-mini)"
              >
                {bulkAiRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {bulkAiRunning
                  ? `Gerando ${bulkAiProgress.current} de ${bulkAiProgress.total}…`
                  : "✨ Gerar títulos e descrições do lote com IA"}
              </button>
              {bulkAiRunning && (
                <button
                  type="button"
                  onClick={cancelBulkAi}
                  className="flex items-center gap-1 rounded-lg border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-[11px] font-semibold text-destructive hover:bg-destructive/20 transition"
                >
                  <X className="h-3 w-3" /> Parar
                </button>
              )}
              <button
                type="button"
                onClick={handleGenerateAllCaptions}
                disabled={bulkGenerating || bulkAiRunning}
                className="flex items-center gap-1 rounded-lg border border-border/50 bg-secondary/30 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-secondary/50 transition disabled:opacity-50"
                title="(Legado) preenche apenas descrição em itens sem texto"
              >
                {bulkGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {bulkGenerating ? "Gerando..." : "Só descrições vazias"}
              </button>
              <button
                type="button"
                onClick={addBlankItem}
                className="admin-glow flex items-center gap-1 rounded-lg border border-primary/40 px-2.5 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/10 transition"
              >
                <Plus className="h-3 w-3" /> Adicionar manual
              </button>
              {errorCount > 0 && (
                <button
                  type="button"
                  onClick={retryAllFailures}
                  className="flex items-center gap-1 rounded-lg border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-[11px] font-semibold text-destructive hover:bg-destructive/20 transition"
                  title="Reprocessa apenas itens com status = erro"
                >
                  <AlertCircle className="h-3 w-3" /> Reprocessar falhas ({errorCount})
                </button>
              )}
              {descErrorCount > 0 && (
                <button
                  type="button"
                  onClick={handleRequeueDescriptionErrors}
                  className="flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/20 transition"
                  title="Reenfileira descrições que falharam (não afeta o flyer)"
                >
                  <Sparkles className="h-3 w-3" /> Reprocessar descrições com erro ({descErrorCount})
                </button>
              )}
              <label
                className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-secondary/40 px-2.5 py-1.5 text-[11px] text-muted-foreground cursor-pointer hover:bg-secondary/60 transition"
                title="Não chama generate-description durante a leitura do flyer"
              >
                <input
                  type="checkbox"
                  className="h-3 w-3 accent-primary"
                  checked={skipDescriptions}
                  onChange={(e) => setSkipDescriptions(e.target.checked)}
                />
                Pular descrições
              </label>
              <button
                type="button"
                onClick={handleClearFlyerCache}
                className="flex items-center gap-1 rounded-lg border border-border/50 bg-secondary/40 px-2.5 py-1.5 text-[11px] text-muted-foreground hover:bg-secondary/60 transition"
                title="Remove o cache IndexedDB + sessionStorage de flyers"
              >
                <X className="h-3 w-3" /> Limpar cache de flyers{cacheCount > 0 ? ` (${cacheCount})` : ""}
              </button>
            </div>
          </div>


          {/* ✨ Contadores Fase 2B */}
          {(bulkAiRunning || bulkAiCounts.generated + bulkAiCounts.review + bulkAiCounts.duplicatesSkipped + bulkAiCounts.errors > 0) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-emerald-300/80">Gerados c/ IA</p>
                <p className="text-sm font-bold text-emerald-200">{bulkAiCounts.generated}</p>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-amber-300/80">Revisar (conf&lt;70)</p>
                <p className="text-sm font-bold text-amber-200">{bulkAiCounts.review}</p>
              </div>
              <div className="rounded-lg border border-muted-foreground/30 bg-secondary/30 px-2.5 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Duplicados ignorados</p>
                <p className="text-sm font-bold text-foreground">{bulkAiCounts.duplicatesSkipped}</p>
              </div>
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-destructive/80">Erros</p>
                <p className="text-sm font-bold text-destructive">{bulkAiCounts.errors}</p>
              </div>
            </div>
          )}

          {/* Resumo de classificação do lote */}
          {readyCount > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-destructive/80">Duplicados reais</p>
                <p className="text-sm font-bold text-destructive">{itemFlags.confirmedRealIds.size}</p>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-amber-300/80">Possíveis duplicados</p>
                <p className="text-sm font-bold text-amber-200">{itemFlags.possibleDupIds.size}</p>
              </div>
              <div className="rounded-lg border border-muted-foreground/30 bg-secondary/30 px-2.5 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Dados incompletos</p>
                <p className="text-sm font-bold text-foreground">{itemFlags.incompleteIds.size}</p>
              </div>
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5">
                <p className="text-[9px] uppercase tracking-wide text-destructive/80">Erros</p>
                <p className="text-sm font-bold text-destructive">{errorCount}</p>
              </div>
            </div>
          )}

          {visibleItems.length === 0 && (
            <p className="text-[11px] text-muted-foreground italic px-1 py-4">
              Nenhum item nesta aba. Troque de filtro para ver outros itens do lote.
            </p>
          )}
          {visibleItems.map((it, idx) => (
            <ReviewRow
              key={it.localId}
              index={idx}
              item={it}
              partners={partners}
              isDuplicate={itemFlags.confirmedRealIds.has(it.localId)}
              isPossibleDup={itemFlags.possibleDupIds.has(it.localId)}
              isIncomplete={itemFlags.incompleteIds.has(it.localId)}
              classificationReason={itemFlags.reasonById.get(it.localId)}
              forcePublish={forcePublishIds.has(it.localId)}
              onToggleForcePublish={() => toggleForcePublish(it.localId)}
              smartDup={smartDuplicates.get(it.localId)}
              isArchived={!!it.archived}
              pastness={it.pastness}
              onToggleArchived={() => setArchived(it.localId, !it.archived)}
              onPartnerChange={(pid) => handlePartnerSelect(it.localId, pid)}
              onChangeForm={(patch) => patchForm(it.localId, patch)}
              onToggleExpand={() => patchItem(it.localId, { expanded: !it.expanded })}
              onRemove={() => removeItem(it.localId)}
              onGenerateDesc={() => handleGenerateDescription(it.localId)}
              generatingDesc={generatingDescIds.has(it.localId)}
              onChangeFormFull={(form) => patchForm(it.localId, form)}
            />
          ))}

        </div>
      )}

      {/* Actions */}
      {items.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            disabled={saving || readyCount === 0}
            onClick={() => handleBulkSave("draft")}
            className="admin-glow flex items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground hover:bg-secondary/80 transition disabled:opacity-50 flex-1"
          >
            <Save className="h-4 w-4" />
            {saving ? "Publicando no Ecossistema..." : "Guardar na Base"}
          </button>
          <button
            type="button"
            disabled={saving || readyCount === 0}
            onClick={() => handleBulkSave("published")}
            className={`admin-glow flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95 transition disabled:opacity-50 flex-1 ${
              !saving && readyCount > 0
                ? "animate-pulse shadow-[0_0_18px_hsl(var(--primary)/0.55),0_0_36px_hsl(var(--primary)/0.3)]"
                : ""
            }`}
          >
            <Send className="h-4 w-4" />
            {saving ? "Publicando no Ecossistema..." : `LANÇAR NO ECOSSISTEMA (${readyCount})`}
          </button>
        </div>
      )}
    </div>
  );
};

/* ──────────────────────────────────────────────
   Compact review row
────────────────────────────────────────────── */
interface ReviewRowProps {
  index: number;
  item: BulkItem;
  partners: Partner[];
  isDuplicate?: boolean;
  isPossibleDup?: boolean;
  isIncomplete?: boolean;
  classificationReason?: string;
  forcePublish?: boolean;
  onToggleForcePublish?: () => void;
  smartDup?: DuplicateConfidenceResult;
  onPartnerChange: (id: string) => void;
  onChangeForm: (patch: Partial<EventFormData>) => void;
  onChangeFormFull: (form: EventFormData) => void;
  onToggleExpand: () => void;
  onRemove: () => void;
  onGenerateDesc: () => void;
  generatingDesc: boolean;
}

function ReviewRowBase({
  index, item, partners, isDuplicate, isPossibleDup, isIncomplete,
  classificationReason, forcePublish, onToggleForcePublish,
  smartDup, onPartnerChange, onChangeForm,
  onChangeFormFull, onToggleExpand, onRemove, onGenerateDesc, generatingDesc,
}: ReviewRowProps) {
  const inputCls = "w-full rounded-md border border-border/50 bg-background px-2 py-1.5 text-xs outline-none focus:border-primary/50 transition";
  const isProcessing = item.status === "uploading" || item.status === "extracting";

  const containerCls = isDuplicate
    ? "border-destructive/80 ring-2 ring-destructive/40 shadow-[0_0_18px_hsl(var(--destructive)/0.45)]"
    : isPossibleDup
    ? "border-amber-500/60 ring-1 ring-amber-500/30"
    : isIncomplete
    ? "border-muted-foreground/40 ring-1 ring-muted-foreground/20"
    : "border-border/40";

  return (
    <div className={`rounded-xl border bg-card overflow-hidden transition ${containerCls}`}>
      {isDuplicate && (
        <div className="bg-destructive/10 border-b border-destructive/30 px-3 py-2 text-[11px] font-semibold text-destructive flex items-start gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div>🚫 Duplicado real — não será enviado</div>
            {classificationReason && (
              <div className="opacity-90 font-normal mt-0.5">{classificationReason}</div>
            )}
          </div>
          <button
            type="button"
            onClick={onToggleExpand}
            className="rounded-md border border-destructive/40 px-2 py-0.5 text-[10px] font-semibold hover:bg-destructive/20 transition shrink-0"
          >
            Editar
          </button>
        </div>
      )}
      {!isDuplicate && isPossibleDup && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-3 py-2 text-[11px] font-semibold text-amber-500 flex items-start gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div>⚠ Possível duplicado — revise antes de publicar</div>
            {classificationReason && (
              <div className="opacity-90 font-normal mt-0.5">{classificationReason}</div>
            )}
            {smartDup?.matched_fields?.length ? (
              <div className="opacity-75 font-normal mt-0.5">
                Coincidências: {smartDup.matched_fields.join(" • ")}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onToggleForcePublish}
            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition shrink-0 ${
              forcePublish
                ? "bg-amber-500/30 text-amber-100 border border-amber-400"
                : "border border-amber-500/40 hover:bg-amber-500/20"
            }`}
          >
            {forcePublish ? "✓ Publicar mesmo assim" : "Publicar mesmo assim"}
          </button>
        </div>
      )}
      {!isDuplicate && !isPossibleDup && isIncomplete && (
        <div className="bg-secondary/40 border-b border-muted-foreground/30 px-3 py-2 text-[11px] font-semibold text-muted-foreground flex items-start gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div>📝 Revisar dados incompletos</div>
            {classificationReason && (
              <div className="opacity-90 font-normal mt-0.5">{classificationReason}</div>
            )}
          </div>
          <button
            type="button"
            onClick={onToggleExpand}
            className="rounded-md border border-muted-foreground/40 px-2 py-0.5 text-[10px] font-semibold hover:bg-secondary transition shrink-0"
          >
            Editar dados
          </button>
        </div>
      )}
      {item.categoryWarning && !isDuplicate && !isPossibleDup && !isIncomplete && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-3 py-1.5 text-[10px] font-semibold text-amber-500 flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3" />
          ⚠️ Verifique a categoria: {item.categoryWarning}
        </div>
      )}
      <div className="flex items-stretch gap-2 p-2">
        {/* thumb */}
        <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-secondary/40">
          {item.thumbDataUrl || item.form.image_url ? (
            <img
              src={item.thumbDataUrl || item.form.image_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
            </div>
          )}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* fields */}
        <div className="flex-1 min-w-0 grid grid-cols-2 gap-1.5">
          <div className="col-span-2">
            <input
              className={inputCls}
              placeholder={isProcessing ? "Analisando a noite..." : "Qual o nome da fera?"}
              value={item.form.title}
              onChange={(e) => {
                const t = e.target.value.toUpperCase();
                onChangeForm({ title: t, slug: t ? slugify(t) : "" });
              }}
              disabled={isProcessing}
            />
          </div>
          <div>
            <input
              type="datetime-local"
              className={inputCls}
              value={item.form.date_time}
              onChange={(e) => onChangeForm({ date_time: e.target.value })}
              disabled={isProcessing}
            />
          </div>
          <div>
            <select
              className={inputCls}
              value={item.form.partner_id}
              onChange={(e) => onPartnerChange(e.target.value)}
              disabled={isProcessing}
            >
              <option value="">— Sem parceiro —</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* actions */}
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={onRemove}
            className="admin-glow-destructive rounded-md border border-destructive/30 p-1 text-destructive hover:bg-destructive/10 transition"
            title="Remover"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onToggleExpand}
            disabled={isProcessing}
            className="admin-glow flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/20 transition disabled:opacity-50"
          >
            {item.expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Detalhes
          </button>
        </div>
      </div>

      {item.status === "error" && (
        <div className="px-3 pb-2 text-[10px] text-destructive">
          {item.errorMsg || "Erro ao processar este flyer."}
        </div>
      )}

      {item.expanded && (
        <div className="border-t border-border/40 bg-background/50 p-3">
          <EventFormBlock
            index={index}
            form={item.form}
            partners={partners}
            onChange={(_i, updated) => onChangeFormFull(updated)}
            onGenerateDescription={onGenerateDesc}
            generatingDesc={generatingDesc}
          />
        </div>
      )}
    </div>
  );
}

// Memoiza para evitar re-render em massa do lote a cada patchItem
const ReviewRow = memo(ReviewRowBase, (prev, next) => {
  return (
    prev.item === next.item &&
    prev.partners === next.partners &&
    prev.isDuplicate === next.isDuplicate &&
    prev.isPossibleDup === next.isPossibleDup &&
    prev.isIncomplete === next.isIncomplete &&
    prev.classificationReason === next.classificationReason &&
    prev.forcePublish === next.forcePublish &&
    prev.smartDup === next.smartDup &&
    prev.generatingDesc === next.generatingDesc &&
    prev.index === next.index
  );
});

/* ──────────────────────────────────────────────
   Padrões do Lote — campos globais opcionais
────────────────────────────────────────────── */
interface BatchDefaultsSectionProps {
  value: BatchDefaults;
  onChange: (next: BatchDefaults) => void;
  partners: Partner[];
  onApply: () => void;
  hasItems: boolean;
}

const BatchDefaultsSection = memo(function BatchDefaultsSection({
  value, onChange, partners, onApply, hasItems,
}: BatchDefaultsSectionProps) {
  const set = (patch: Partial<BatchDefaults>) => onChange({ ...value, ...patch });
  const inputCls = "w-full rounded-md border border-border/50 bg-background px-2 py-1.5 text-xs outline-none focus:border-primary/50 transition";
  const partnerName = value.partner_id ? partners.find((p) => p.id === value.partner_id)?.name : null;
  const previewParts = [
    value.date ? `Data: ${value.date.split("-").reverse().join("/")}` : null,
    value.time ? `Hora: ${value.time}` : null,
    partnerName ? `Local: ${partnerName}` : null,
    value.category ? `Categoria: ${value.category}` : null,
  ].filter(Boolean);

  return (
    <div className={`mb-4 rounded-xl border ${value.enabled ? "border-primary/40 bg-primary/5" : "border-border/40 bg-card/40"} p-3 transition`}>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => set({ enabled: e.target.checked })}
          className="h-3.5 w-3.5 accent-primary"
        />
        <span className="text-xs font-semibold text-foreground">🧭 Preencher automaticamente eventos sem informações</span>
        <span className="text-[10px] text-muted-foreground">(opcional)</span>
      </label>

      {value.enabled && (
        <div className="mt-3 space-y-2.5">
          {previewParts.length > 0 && (
            <div className="rounded-md border border-primary/20 bg-background/60 px-2.5 py-2 text-[10px] text-muted-foreground leading-relaxed">
              <div className="text-foreground font-semibold mb-1">Padrões definidos</div>
              {previewParts.map((p, i) => <div key={i}>{p}</div>)}
              <div className="mt-1.5 opacity-80">
                Quando o flyer não informar esses dados, a Roxou utilizará os valores acima.
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Data padrão</label>
              <input
                type="date"
                className={inputCls}
                value={value.date}
                onChange={(e) => set({ date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Horário padrão</label>
              <input
                type="time"
                className={inputCls}
                value={value.time}
                onChange={(e) => set({ time: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-medium text-muted-foreground">Local padrão (parceiro)</label>
              <select
                className={inputCls}
                value={value.partner_id}
                onChange={(e) => set({ partner_id: e.target.value })}
              >
                <option value="">— Sem padrão —</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Categoria padrão</label>
              <select
                className={inputCls}
                value={value.category}
                onChange={(e) => set({ category: e.target.value, sub_category: supportsGenre(e.target.value) ? value.sub_category : "" })}
              >
                <option value="">— Sem padrão —</option>
                {ADMIN_MAIN_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            {supportsGenre(value.category) && (
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Gênero padrão</label>
                <select
                  className={inputCls}
                  value={value.sub_category}
                  onChange={(e) => set({ sub_category: e.target.value })}
                >
                  <option value="">— Sem padrão —</option>
                  {ADMIN_MUSICAL_SUBS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5 pt-1 border-t border-border/30">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="batch-mode"
                checked={value.mode === "missing"}
                onChange={() => set({ mode: "missing" })}
                className="h-3 w-3 accent-primary"
              />
              <span className="text-[11px] text-foreground">
                ✅ <strong>Completar apenas dados ausentes</strong> <span className="opacity-70">(recomendado)</span>
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="batch-mode"
                checked={value.mode === "all"}
                onChange={() => set({ mode: "all" })}
                className="h-3 w-3 accent-primary"
              />
              <span className="text-[11px] text-foreground">
                ⚠️ <strong>Substituir todos os dados pelos valores acima</strong>
              </span>
            </label>
          </div>

          <button
            type="button"
            onClick={onApply}
            disabled={!hasItems}
            className="admin-glow w-full rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-[11px] font-semibold text-primary hover:bg-primary/20 transition disabled:opacity-40"
          >
            Aplicar padrões ao lote
          </button>
          <p className="text-[10px] text-muted-foreground -mt-1">
            Os padrões são aplicados apenas quando você clicar no botão — digitar aqui não reprocessa eventos.
          </p>
        </div>
      )}
    </div>
  );
});


export default EventoBulkForm;

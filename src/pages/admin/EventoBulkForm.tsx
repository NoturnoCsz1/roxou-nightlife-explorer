import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Send, Sparkles, Loader2, Upload, X, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, Image as ImageIcon, Save,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import EventFormBlock, { emptyEventForm, slugify, type EventFormData } from "@/components/admin/EventFormBlock";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { buildEventPayload } from "@/lib/adminEventPayload";
import { sha256File } from "@/lib/imageHash";
import {
  findPossibleDuplicateEvent,
  type DuplicateResult,
  type ExistingEvent,
} from "@/lib/eventDuplicateValidator";

type Partner = Tables<"partners">;
type ItemStatus = "uploading" | "extracting" | "ready" | "error";

interface BulkItem {
  localId: string;
  fileName: string;
  thumbDataUrl: string; // local preview
  status: ItemStatus;
  errorMsg?: string;
  expanded: boolean;
  form: EventFormData;
  categoryWarning?: string | null;
}

function normalize(s: string) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function matchPartner(name: string | null, partners: Partner[], confidence?: string): Partner | null {
  if (!name) return null;
  // Only auto-match when AI is highly confident on venue name
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
  // Require strong match (exact or substring of meaningful length)
  return bestScore >= 4 ? best : null;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function formatDateForInput(iso: string | null): string {
  if (!iso) return "";
  // expects "YYYY-MM-DDTHH:MM" — accept ISO as well
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
  if (m) return `${m[1]}T${m[2]}`;
  try {
    const d = new Date(iso);
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
  } catch {}
  return "";
}

type AdminFeedback = {
  venue_name: string | null;
  corrected_category: string | null;
  corrected_sub_category: string | null;
};

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
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Detect duplicates: slug exists in DB or appears more than once in current items
  function getDuplicateSet(): Set<string> {
    const dup = new Set<string>();
    const counts = new Map<string, number>();
    const imageHashes = new Set(dbEvents.map((e) => e.image_hash).filter(Boolean));
    for (const it of items) {
      const s = (it.form.slug || "").trim();
      if (!s) continue;
      counts.set(s, (counts.get(s) || 0) + 1);
    }
    for (const it of items) {
      const s = (it.form.slug || "").trim();
      if (!s) continue;
      const sameSignature = dbEvents.some((e) =>
        normalize(e.title) === normalize(it.form.title) &&
        normalize(e.venue_name || "") === normalize(it.form.venue_name || "") &&
        e.date_time?.slice(0, 10) === it.form.date_time?.slice(0, 10),
      );
      if (dbSlugs.has(s) || (counts.get(s) || 0) > 1 || (!!it.form.image_hash && imageHashes.has(it.form.image_hash)) || sameSignature) {
        dup.add(it.localId);
      }
    }
    return dup;
  }
  const duplicateIds = getDuplicateSet();

  /**
   * Validação inteligente (aditiva): score 0–100 por item, comparando
   * candidato vs base de eventos. Não bloqueia publicação — apenas marca.
   */
  const smartDuplicates = (() => {
    const map = new Map<string, DuplicateResult>();
    if (!dbEvents.length) return map;
    const existing: ExistingEvent[] = dbEvents.map((e) => ({
      id: e.id,
      title: e.title,
      date_time: e.date_time,
      venue_name: e.venue_name,
      image_hash: e.image_hash,
      slug: e.slug,
    }));
    for (const it of items) {
      if (!it.form.title || !it.form.date_time) continue;
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
        },
        existing,
      );
      if (result.level !== "none") {
        map.set(it.localId, result);
        // Log discreto, sem quebrar fluxo
        console.warn("[DuplicateEventCheck]", {
          localId: it.localId,
          title: it.form.title,
          score: result.duplicate_score,
          level: result.level,
          matched: result.matched_event_title,
          fields: result.matched_fields,
        });
      }
    }
    return map;
  })();

  function patchItem(localId: string, patch: Partial<BulkItem>) {
    setItems((prev) => prev.map((it) => (it.localId === localId ? { ...it, ...patch } : it)));
  }
  function patchForm(localId: string, patch: Partial<EventFormData>) {
    setItems((prev) =>
      prev.map((it) => (it.localId === localId ? { ...it, form: { ...it.form, ...patch } } : it)),
    );
  }

  async function uploadAndProcess(file: File, localId: string) {
    try {
      const imageHash = await sha256File(file);
      // 1. upload to storage
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `events/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("uploads").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      patchItem(localId, { status: "extracting" });
      patchForm(localId, { image_url: publicUrl });

      // 2. AI extract — wait fully and validate before downstream calls
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
        },
      });
      if (extractResp.error) throw extractResp.error;
      const data = extractResp.data;
      if (!data || typeof data !== "object") {
        patchItem(localId, { status: "ready" });
        return;
      }
      if (data.error && !data.title) {
        // graceful: keep image, ask user to fill manually
        patchItem(localId, { status: "ready" });
        return;
      }

      const matched = matchPartner(data.venue_name, partners, data.venue_confidence);
      const dateInput = formatDateForInput(data.date_iso);
      const warnings: string[] = [];
      if (data.category_override_reason) warnings.push(data.category_override_reason);
      if (data.date_needs_review) warnings.push(`📅 Data precisa revisão${data.date_validation_note ? `: ${data.date_validation_note}` : ""}`);
      if (data.date_validation_note && !data.date_needs_review) warnings.push(`📅 ${data.date_validation_note}`);
      if (data.genre_needs_review) warnings.push("🎵 Gênero musical com baixa certeza — confira");
      const categoryWarning: string | null = warnings.length ? warnings.join(" • ") : null;

      let readyForm: EventFormData | null = null;
      setItems((prev) =>
        prev.map((it) => {
          if (it.localId !== localId) return it;
          const upperTitle = (data.title || it.form.title || "").toUpperCase();
          const next: EventFormData = {
            ...it.form,
            image_url: publicUrl,
            image_hash: imageHash,
            title: upperTitle,
            slug: upperTitle ? slugify(upperTitle) : it.form.slug,
            date_time: dateInput || it.form.date_time,
            category: data.category || it.form.category,
            venue_name: matched ? matched.name : (data.venue_name || ""),
            address: matched ? (matched.address || "") : (data.address || ""),
            instagram: matched ? (matched.instagram || "") : (data.instagram || ""),
            partner_id: matched ? matched.id : "",
            ticket_url: "",
            verification_source: "instagram",
            opportunity_tags: data.opportunity_tags || [],
            ...(data.sub_category ? { _sub: data.sub_category } as any : {}),
            ...(data.ai_confidence ? { ai_confidence: data.ai_confidence } as any : {}),
            ...(typeof data.needs_review === "boolean" ? { needs_review: data.needs_review } as any : {}),
          };
          readyForm = next;
          return { ...it, form: next, status: "ready", categoryWarning };
        }),
      );

      // Auto-generate rich description (Persona V2) — only after metadata is confirmed valid
      const f = readyForm as EventFormData | null;
      if (f && f.title && f.title.length > 3) {
        try {
          const previousDescs = items
            .map((x) => x.form.description)
            .filter((d): d is string => !!d && d.length > 30)
            .slice(-5);
          const descResp = await supabase.functions.invoke("generate-description", {
            body: {
              title: f.title,
              venue_name: f.venue_name || "",
              address: f.address || "",
              date_time: f.date_time || "",
              category: f.category || "festa",
              sub_category: (f as any)._sub || "",
              image_url: f.image_url || "",
              seed_index: Date.now() % 10000 + Math.floor(Math.random() * 100),
              previous_descriptions: previousDescs,
            },
          });
          if (!descResp.error && descResp.data) {
            const rich = descResp.data?.descricao_rica || descResp.data?.description;
            if (rich && typeof rich === "string") {
              patchForm(localId, { description: rich });
            }
          }
        } catch (descErr) {
          console.warn("[bulk] auto description failed", descErr);
        }
      }
    } catch (err: any) {
      console.error("[bulk] process error", err);
      patchItem(localId, { status: "error", errorMsg: err?.message || "Falha ao processar" });
    }
  }

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!arr.length) return;

    const newItems: BulkItem[] = [];
    for (const file of arr) {
      const localId = crypto.randomUUID();
      const thumbDataUrl = await fileToDataUrl(file);
      newItems.push({
        localId,
        fileName: file.name,
        thumbDataUrl,
        status: "uploading",
        expanded: false,
        form: emptyEventForm(),
      });
    }
    setItems((prev) => [...prev, ...newItems]);

    // process sequentially to be gentle with rate limits
    for (let i = 0; i < arr.length; i++) {
      await uploadAndProcess(arr[i], newItems[i].localId);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  }

  function removeItem(localId: string) {
    setItems((prev) => prev.filter((it) => it.localId !== localId));
  }
  function addBlankItem() {
    setItems((prev) => [
      ...prev,
      {
        localId: crypto.randomUUID(),
        fileName: "Sem flyer",
        thumbDataUrl: "",
        status: "ready",
        expanded: true,
        form: emptyEventForm(),
      },
    ]);
  }

  async function handleGenerateDescription(localId: string) {
    const it = items.find((x) => x.localId === localId);
    if (!it || !it.form.title) return;
    setGeneratingDescIds((s) => new Set(s).add(localId));
    try {
      const { data, error } = await supabase.functions.invoke("generate-description", {
        body: {
          title: it.form.title,
          venue_name: it.form.venue_name,
          date_time: it.form.date_time,
          category: it.form.category,
          sub_category: (it.form as any)._sub || "",
          image_url: it.form.image_url,
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
    const ready = items.filter((it) => it.status === "ready");
    if (!ready.length) {
      toast.error("Nenhum evento pronto para salvar");
      return;
    }
    const invalid = ready.findIndex((it) => !it.form.title || !it.form.slug || !it.form.date_time);
    if (invalid !== -1) {
      toast.error(`Evento ${invalid + 1}: Título, slug e data são obrigatórios`);
      return;
    }
    if (duplicateIds.size > 0) {
      toast.warning("⚠️ Este evento já foi postado. Revise os cards marcados antes de salvar.");
      return;
    }
    // dedupe by slug/title
    const seen = new Set<string>();
    for (const it of ready) {
      const k = `${it.form.slug}|${it.form.title.toLowerCase()}`;
      if (seen.has(k)) {
        toast.error(`Duplicidade detectada: ${it.form.title}`);
        return;
      }
      seen.add(k);
    }

    setSaving(true);
    const payloads = ready.map((it) => buildEventPayload(it.form, { city: cityFilter, status }));
    try {
      const { error } = await supabase.from("events").insert(payloads);
      if (error) throw error;
      toast.success(`${ready.length} evento(s) ${status === "published" ? "publicado(s)" : "salvo(s) como rascunho"}!`);
      navigate("/admin/eventos");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  const readyCount = items.filter((it) => it.status === "ready").length;
  const processingCount = items.filter((it) => it.status === "uploading" || it.status === "extracting").length;
  const errorCount = items.filter((it) => it.status === "error").length;

  return (
    <div className="md:ml-44 max-w-3xl pb-12">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </button>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-foreground">Criar Eventos em Lote</h1>
          <p className="text-[11px] text-muted-foreground">
            Suba os banners e a IA preenche título, data, local e categoria.
          </p>
        </div>
        {items.length > 0 && (
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            {readyCount} pronto(s) · {processingCount} processando · {errorCount} erro
          </span>
        )}
      </div>

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

      {/* Thumbnail grid */}
      {items.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Banners ({items.length})
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {items.map((it) => (
              <div key={it.localId} className="relative aspect-square rounded-lg overflow-hidden border border-border/40 bg-secondary/30 group">
                {it.thumbDataUrl ? (
                  <img src={it.thumbDataUrl} alt={it.fileName} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1">
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
                    <div className="flex items-center gap-1 text-[9px] text-destructive">
                      <AlertCircle className="h-2.5 w-2.5" /> erro
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
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleGenerateAllCaptions}
                disabled={bulkGenerating}
                className="admin-glow flex items-center gap-1 rounded-lg bg-gradient-to-r from-primary to-accent px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:opacity-95 transition disabled:opacity-50"
              >
                {bulkGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {bulkGenerating ? "Gerando legendas..." : "✨ Gerar Legendas do Lote"}
              </button>
              <button
                type="button"
                onClick={addBlankItem}
                className="admin-glow flex items-center gap-1 rounded-lg border border-primary/40 px-2.5 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/10 transition"
              >
                <Plus className="h-3 w-3" /> Adicionar manual
              </button>
            </div>
          </div>

          {items.map((it, idx) => (
            <ReviewRow
              key={it.localId}
              index={idx}
              item={it}
              partners={partners}
              isDuplicate={duplicateIds.has(it.localId)}
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
  onPartnerChange: (id: string) => void;
  onChangeForm: (patch: Partial<EventFormData>) => void;
  onChangeFormFull: (form: EventFormData) => void;
  onToggleExpand: () => void;
  onRemove: () => void;
  onGenerateDesc: () => void;
  generatingDesc: boolean;
}

function ReviewRow({
  index, item, partners, isDuplicate, onPartnerChange, onChangeForm,
  onChangeFormFull, onToggleExpand, onRemove, onGenerateDesc, generatingDesc,
}: ReviewRowProps) {
  const inputCls = "w-full rounded-md border border-border/50 bg-background px-2 py-1.5 text-xs outline-none focus:border-primary/50 transition";
  const isProcessing = item.status === "uploading" || item.status === "extracting";

  return (
    <div className={`rounded-xl border bg-card overflow-hidden transition ${
      isDuplicate
        ? "border-destructive/80 ring-2 ring-destructive/40 animate-pulse shadow-[0_0_18px_hsl(var(--destructive)/0.45)]"
        : "border-border/40"
    }`}>
      {isDuplicate && (
        <div className="bg-destructive/10 border-b border-destructive/30 px-3 py-1.5 text-[10px] font-semibold text-destructive flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3" />
          ⚠️ CONTEÚDO DUPLICADO: Verifique se este evento já foi cadastrado.
        </div>
      )}
      {item.categoryWarning && !isDuplicate && (
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

export default EventoBulkForm;

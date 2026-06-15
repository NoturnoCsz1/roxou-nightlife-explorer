/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps -- preservado do original (Fase 6D) */
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Loader2, Plus, Eye, XCircle, Trash2, ExternalLink,
  Link as LinkIcon, ChevronDown, ChevronUp,
  Calendar, MapPin, Clock, FileText, Globe, Instagram, Ticket
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ImageUpload from "@/components/admin/ImageUpload";

/* ── types ── */

interface CaptureRow {
  id: string;
  title: string | null;
  post_url: string;
  instagram_handle: string;
  source_type: string;
  caption: string | null;
  observation: string | null;
  image_url: string | null;
  import_status: string;
  event_id: string | null;
  partner_id: string | null;
  venue_name: string | null;
  suggested_date: string | null;
  confidence: string | null;
  error_detail: string | null;
  created_at: string;
  partner_name?: string;
}



const STATUS_CONFIG: Record<string, { label: string; cls: string; emoji: string }> = {
  pending: { label: "Novo", cls: "text-yellow-400 bg-yellow-400/10", emoji: "🆕" },
  novo: { label: "Novo", cls: "text-yellow-400 bg-yellow-400/10", emoji: "🆕" },
  em_analise: { label: "Em análise", cls: "text-blue-400 bg-blue-400/10", emoji: "🔍" },
  aprovado: { label: "Aprovado", cls: "text-green-400 bg-green-400/10", emoji: "✅" },
  rejeitado: { label: "Rejeitado", cls: "text-muted-foreground bg-secondary/50", emoji: "❌" },
  virou_evento: { label: "Virou evento", cls: "text-primary bg-primary/10", emoji: "🎉" },
  imported: { label: "Virou evento", cls: "text-primary bg-primary/10", emoji: "🎉" },
  skipped: { label: "Rejeitado", cls: "text-muted-foreground bg-secondary/50", emoji: "❌" },
  error: { label: "Erro", cls: "text-destructive bg-destructive/10", emoji: "⚠️" },
};

const FILTER_TABS: { key: string; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Novos" },
  { key: "em_analise", label: "Em análise" },
  { key: "aprovado", label: "Aprovados" },
  { key: "rejeitado", label: "Rejeitados" },
  { key: "virou_evento", label: "Criados" },
];

/* ── helpers ── */

function detectSourceType(url: string): string {
  if (!url) return "manual";
  const lower = url.toLowerCase();
  if (lower.includes("instagram.com")) return "instagram";
  if (lower.includes("eventou.com")) return "eventou";
  if (lower.includes("sympla.com")) return "sympla";
  return "link";
}

function extractInstagramHandle(url: string): string {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("instagram.com")) return "";
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[0] || "";
  } catch {
    return "";
  }
}

function sourceIcon(type: string) {
  switch (type) {
    case "instagram": return <Instagram className="h-3 w-3" />;
    case "eventou": return <Globe className="h-3 w-3" />;
    case "sympla": return <Ticket className="h-3 w-3" />;
    case "manual": return <FileText className="h-3 w-3" />;
    default: return <LinkIcon className="h-3 w-3" />;
  }
}

function sourceLabel(type: string) {
  switch (type) {
    case "instagram": return "Instagram";
    case "eventou": return "Eventou";
    case "sympla": return "Sympla";
    case "manual": return "Manual";
    default: return "Link";
  }
}

/* ── main component ── */

const Captacao = () => {
  const navigate = useNavigate();
  const { cityFilter } = useAdminProfile();

  const [items, setItems] = useState<CaptureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<CaptureRow | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQ, setSearchQ] = useState("");

  // form state
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"link" | "manual">("link");
  const [saving, setSaving] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [form, setForm] = useState({
    url: "",
    title: "",
    date: "",
    time: "",
    venue: "",
    observation: "",
    image_url: "",
  });

  async function autoDetectFromUrl(url: string) {
    const source = detectSourceType(url);
    if (source !== "instagram" && source !== "link") return;
    setScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-instagram", {
        body: { url: url.trim() },
      });
      if (error) throw error;
      if (data?.success) {
        setForm(f => ({
          ...f,
          image_url: f.image_url || data.image_url || data.screenshot || "",
          title: f.title || data.title || "",
          observation: f.observation || (data.caption || data.description || "").slice(0, 500),
        }));
        toast.success("Dados detectados automaticamente");
      }
    } catch (err) {
      console.error("Auto-detect failed:", err);
    } finally {
      setScraping(false);
    }
  }

  function handleUrlPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").trim();
    if (pasted && (pasted.startsWith("http://") || pasted.startsWith("https://"))) {
      setTimeout(() => autoDetectFromUrl(pasted), 150);
    }
  }

  // partners for selector
  const [partners, setPartners] = useState<{ id: string; name: string }[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState("");

  useEffect(() => {
    loadItems();
    loadPartners();
  }, []);

  async function loadPartners() {
    let q = supabase.from("partners").select("id, name").eq("active", true).order("name");
    if (cityFilter) q = q.eq("city", cityFilter);
    const { data } = await q;
    setPartners(data || []);
  }

  async function loadItems() {
    setLoading(true);
    let query = supabase
      .from("instagram_imports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (cityFilter) {
      const { data: cityPartners } = await supabase
        .from("partners").select("id").eq("city", cityFilter);
      const ids = (cityPartners || []).map(p => p.id);
      if (ids.length > 0) {
        query = query.in("partner_id", ids);
      } else {
        setItems([]);
        setLoading(false);
        return;
      }
    }

    const { data } = await query;
    if (data && data.length > 0) {
      const partnerIds = [...new Set(data.filter(d => d.partner_id).map(d => d.partner_id!))];
      let partnerMap: Record<string, string> = {};
      if (partnerIds.length > 0) {
        const { data: ps } = await supabase.from("partners").select("id, name").in("id", partnerIds);
        if (ps) partnerMap = Object.fromEntries(ps.map(p => [p.id, p.name]));
      }
      setItems(data.map(d => ({
        ...d,
        source_type: (d as any).source_type || "instagram",
        title: (d as any).title || null,
        venue_name: (d as any).venue_name || null,
        suggested_date: (d as any).suggested_date || null,
        observation: (d as any).observation || null,
        partner_name: d.partner_id ? partnerMap[d.partner_id] : undefined,
      })));
    } else {
      setItems([]);
    }
    setLoading(false);
  }

  const filtered = useMemo(() => {
    let list = items;
    if (activeFilter !== "all") {
      list = list.filter(i => {
        if (activeFilter === "pending") return i.import_status === "pending" || i.import_status === "novo";
        if (activeFilter === "virou_evento") return i.import_status === "virou_evento" || i.import_status === "imported";
        if (activeFilter === "rejeitado") return i.import_status === "rejeitado" || i.import_status === "skipped";
        return i.import_status === activeFilter;
      });
    }
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      list = list.filter(i =>
        (i.title || "").toLowerCase().includes(q) ||
        (i.caption || "").toLowerCase().includes(q) ||
        (i.observation || "").toLowerCase().includes(q) ||
        (i.venue_name || "").toLowerCase().includes(q) ||
        (i.partner_name || "").toLowerCase().includes(q) ||
        (i.instagram_handle || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, activeFilter, searchQ]);

  function resetForm() {
    setForm({ url: "", title: "", date: "", time: "", venue: "", observation: "", image_url: "" });
    setSelectedPartnerId("");
    setShowForm(false);
  }

  async function handleSave() {
    if (formMode === "link" && !form.url.trim()) {
      toast.error("Cole um link para capturar");
      return;
    }
    if (formMode === "manual" && !form.title.trim()) {
      toast.error("Informe o título do evento");
      return;
    }

    setSaving(true);
    const sourceType = formMode === "manual" ? "manual" : detectSourceType(form.url);
    const handle = sourceType === "instagram" ? extractInstagramHandle(form.url) : "";

    // auto-match partner by instagram handle
    let partnerId = selectedPartnerId || null;
    if (!partnerId && handle) {
      const { data: matched } = await supabase
        .from("partners").select("id").ilike("instagram", `%${handle}%`).limit(1);
      if (matched?.[0]) partnerId = matched[0].id;
    }

    const suggestedDate = form.date
      ? `${form.date}T${form.time || "00:00"}:00-03:00`
      : null;

    const { error } = await supabase.from("instagram_imports").insert({
      post_url: form.url.trim() || `manual-${Date.now()}`,
      instagram_handle: handle || "manual",
      title: form.title.trim() || null,
      source_type: sourceType,
      caption: form.observation.trim() || null,
      observation: form.observation.trim() || null,
      image_url: form.image_url || null,
      venue_name: form.venue.trim() || null,
      suggested_date: suggestedDate,
      partner_id: partnerId,
      import_status: "pending",
    } as any);

    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
    } else {
      toast.success("Captação salva!");
      resetForm();
      loadItems();
    }
    setSaving(false);
  }

  async function handleStatusChange(row: CaptureRow, newStatus: string) {
    await supabase.from("instagram_imports").update({ import_status: newStatus } as any).eq("id", row.id);
    toast.success(`Status atualizado para ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
    loadItems();
  }

  function handleCreateEvent(row: CaptureRow) {
    navigate("/admin/eventos/novo", {
      state: {
        duplicate: {
          title: row.title || "",
          description: row.caption || row.observation || "",
          category: "",
          venue_name: row.venue_name || "",
          address: "",
          instagram: row.instagram_handle || "",
          image_url: row.image_url || "",
          partner_id: row.partner_id || "",
          date_time: row.suggested_date ? row.suggested_date.slice(0, 16) : "",
        },
        instagram_import_id: row.id,
      },
    });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await supabase.from("instagram_imports").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    toast.success("Registro removido");
    loadItems();
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    items.forEach(i => {
      const s = i.import_status;
      c[s] = (c[s] || 0) + 1;
      // merge aliases
      if (s === "novo") c["pending"] = (c["pending"] || 0) + 1;
      if (s === "imported") c["virou_evento"] = (c["virou_evento"] || 0) + 1;
      if (s === "skipped") c["rejeitado"] = (c["rejeitado"] || 0) + 1;
    });
    return c;
  }, [items]);

  return (
    <div className="space-y-4 md:ml-44">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Captação</h1>
          <p className="text-[10px] text-muted-foreground">Capture e gerencie sugestões de eventos</p>
        </div>
        <button
          onClick={() => { setShowForm(f => !f); setFormMode("link"); }}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition"
        >
          <Plus className="h-3.5 w-3.5" />
          Captar
        </button>
      </div>

      {/* New capture form */}
      {showForm && (
        <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
          {/* Mode tabs */}
          <div className="flex gap-1 p-0.5 rounded-lg bg-secondary/30">
            <button
              onClick={() => setFormMode("link")}
              className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition ${formMode === "link" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LinkIcon className="h-3 w-3 inline mr-1" />
              Por link
            </button>
            <button
              onClick={() => setFormMode("manual")}
              className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition ${formMode === "manual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <FileText className="h-3 w-3 inline mr-1" />
              Manual
            </button>
          </div>

          {formMode === "link" && (
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Link do evento</label>
              <div className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="url"
                    value={form.url}
                    onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                    onPaste={handleUrlPaste}
                    placeholder="Instagram, Eventou, Sympla ou qualquer link"
                    className="w-full rounded-lg border border-border/60 bg-background pl-8 pr-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                {scraping && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
              </div>
              {scraping && (
                <p className="text-[10px] text-primary mt-1 flex items-center gap-1">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" /> Detectando imagem e dados...
                </p>
              )}
              {form.url && !scraping && (
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                  {sourceIcon(detectSourceType(form.url))} {sourceLabel(detectSourceType(form.url))}
                </span>
              )}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Título do evento</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Ex: Show de MPB no Bar do João"
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                <Calendar className="h-3 w-3 inline mr-1" />Data
              </label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                <Clock className="h-3 w-3 inline mr-1" />Hora
              </label>
              <input
                type="time"
                value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              <MapPin className="h-3 w-3 inline mr-1" />Local
            </label>
            <input
              value={form.venue}
              onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
              placeholder="Nome do local"
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Parceiro</label>
            <select
              value={selectedPartnerId}
              onChange={e => setSelectedPartnerId(e.target.value)}
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Nenhum parceiro</option>
              {partners.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Observação</label>
            <textarea
              value={form.observation}
              onChange={e => setForm(f => ({ ...f, observation: e.target.value }))}
              placeholder="Informações extras, notas..."
              rows={2}
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Imagem</label>
            <ImageUpload
              currentUrl={form.image_url}
              onUploaded={(url) => setForm(f => ({ ...f, image_url: url }))}
              folder="events"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Salvar na fila
            </button>
            <button
              onClick={resetForm}
              className="rounded-lg px-3 py-2.5 text-xs text-muted-foreground hover:bg-secondary/50 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Buscar captações..."
            className="w-full rounded-lg border border-border/60 bg-background pl-8 pr-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {FILTER_TABS.map(tab => {
            const count = counts[tab.key] || 0;
            const isActive = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70"
                }`}
              >
                {tab.label}
                {count > 0 && <span className="ml-1 opacity-70">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border/40 bg-card p-8 text-center">
          <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma captação encontrada.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Use o botão "Captar" para adicionar eventos à fila.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(row => (
            <CaptureCard
              key={row.id}
              row={row}
              onCreateEvent={() => handleCreateEvent(row)}
              onStatusChange={(status) => handleStatusChange(row, status)}
              onDelete={() => setDeleteTarget(row)}
            />
          ))}
        </div>
      )}

      {/* Delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover captação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover "{deleteTarget?.title || deleteTarget?.post_url}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* ── Card ── */

function CaptureCard({
  row,
  onCreateEvent,
  onStatusChange,
  onDelete,
}: {
  row: CaptureRow;
  onCreateEvent: () => void;
  onStatusChange: (status: string) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_CONFIG[row.import_status] || STATUS_CONFIG.pending;
  const isPending = row.import_status === "pending" || row.import_status === "novo";
  const isAnalise = row.import_status === "em_analise";
  const canAct = isPending || isAnalise || row.import_status === "aprovado";

  return (
    <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
      <div
        className="flex items-start gap-3 p-3 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        {row.image_url && (
          <img
            src={row.image_url}
            alt=""
            className="h-14 w-14 rounded-lg object-cover shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${status.cls}`}>
              {status.label}
            </span>
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/70">
              {sourceIcon(row.source_type)} {sourceLabel(row.source_type)}
            </span>
          </div>
          <p className="text-sm font-semibold text-foreground truncate">
            {row.title || row.caption?.slice(0, 60) || row.post_url}
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
            {row.suggested_date && (
              <span className="flex items-center gap-0.5">
                <Calendar className="h-2.5 w-2.5" />
                {new Date(row.suggested_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </span>
            )}
            {row.venue_name && (
              <span className="flex items-center gap-0.5">
                <MapPin className="h-2.5 w-2.5" />
                {row.venue_name}
              </span>
            )}
            {row.partner_name && (
              <span>• {row.partner_name}</span>
            )}
          </div>
        </div>
        <div className="shrink-0 pt-1">
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-border/20 pt-2">
          {/* Details */}
          {(row.observation || row.caption) && (
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {row.observation || row.caption}
            </p>
          )}

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
            <span>
              {new Date(row.created_at).toLocaleDateString("pt-BR")} {new Date(row.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
            {row.post_url && !row.post_url.startsWith("manual-") && (
              <a
                href={row.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary flex items-center gap-0.5 hover:underline"
                onClick={e => e.stopPropagation()}
              >
                <ExternalLink className="h-2.5 w-2.5" /> Abrir link
              </a>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 pt-1">
            {canAct && (
              <button
                onClick={(e) => { e.stopPropagation(); onCreateEvent(); }}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 transition"
              >
                <Eye className="h-3 w-3" /> Criar evento
              </button>
            )}
            {isPending && (
              <button
                onClick={(e) => { e.stopPropagation(); onStatusChange("em_analise"); }}
                className="flex items-center justify-center gap-1 rounded-lg bg-blue-500/10 text-blue-400 px-3 py-2 text-[11px] font-semibold hover:bg-blue-500/20 transition"
              >
                🔍 Analisar
              </button>
            )}
            {(isPending || isAnalise) && (
              <button
                onClick={(e) => { e.stopPropagation(); onStatusChange("rejeitado"); }}
                className="flex items-center justify-center gap-1 rounded-lg bg-secondary/50 px-3 py-2 text-[11px] font-semibold text-muted-foreground hover:bg-secondary transition"
              >
                <XCircle className="h-3 w-3" /> Ignorar
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="flex items-center justify-center rounded-lg px-2 py-2 hover:bg-destructive/10 transition"
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Captacao;

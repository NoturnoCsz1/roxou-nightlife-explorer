import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Instagram, RefreshCw, Sparkles, CheckCircle2, AlertTriangle,
  Lock, Users, Image as ImageIcon, ExternalLink,
} from "lucide-react";

interface Props {
  partnerId: string;
  onApplied?: () => void;
}

type PartnerIG = any;

const statusConfig: Record<string, { label: string; cls: string; icon: any }> = {
  synced: { label: "Instagram sincronizado", cls: "bg-green-400/10 text-green-400 border-green-400/30", icon: CheckCircle2 },
  not_found: { label: "Perfil não encontrado", cls: "bg-destructive/10 text-destructive border-destructive/30", icon: AlertTriangle },
  private: { label: "Perfil privado", cls: "bg-yellow-400/10 text-yellow-400 border-yellow-400/30", icon: Lock },
  no_permission: { label: "Sem permissão", cls: "bg-orange-400/10 text-orange-400 border-orange-400/30", icon: Lock },
  error: { label: "Precisa revisar", cls: "bg-yellow-400/10 text-yellow-400 border-yellow-400/30", icon: AlertTriangle },
};

function formatNumber(n?: number | null) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(iso?: string | null) {
  if (!iso) return "nunca";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

export default function PartnerInstagramAura({ partnerId, onApplied }: Props) {
  const [partner, setPartner] = useState<PartnerIG | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("partners").select("*").eq("id", partnerId).maybeSingle();
    setPartner(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [partnerId]);

  async function handleSync() {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("partner-instagram-sync", {
        body: { partner_id: partnerId },
      });
      if (error) throw error;
      if ((data as any)?.ok) toast.success("Instagram sincronizado!");
      else toast.warning((data as any)?.error || "Sincronização concluída com avisos");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao sincronizar");
    } finally {
      setSyncing(false);
    }
  }

  async function applyAuraSuggestions() {
    if (!partner?.aura_suggestions) return;
    const s = partner.aura_suggestions as any;
    const locked: string[] = partner.manual_locked_fields || [];
    const update: any = {};
    if (s.summary && !locked.includes("short_description") && !partner.short_description) {
      update.short_description = s.summary;
    }
    if (Array.isArray(s.tags)) update.aura_partner_tags = s.tags.slice(0, 12);
    if (s.summary) update.aura_partner_summary = s.summary;
    if (typeof s.activity_score === "number") update.aura_partner_score = Math.round(s.activity_score);
    const { error } = await supabase.from("partners").update(update).eq("id", partnerId);
    if (error) toast.error(error.message);
    else {
      toast.success("Sugestões da Aura aplicadas!");
      onApplied?.();
      await load();
    }
  }

  async function toggleLock(field: string) {
    const cur: string[] = partner.manual_locked_fields || [];
    const next = cur.includes(field) ? cur.filter((f) => f !== field) : [...cur, field];
    await supabase.from("partners").update({ manual_locked_fields: next }).eq("id", partnerId);
    await load();
  }

  if (loading) return <div className="rounded-xl border border-border/40 bg-card p-4 text-xs text-muted-foreground">Carregando Instagram...</div>;
  if (!partner) return null;

  const status = partner.instagram_sync_status as string | null;
  const cfg = status ? statusConfig[status] : null;
  const StatusIcon = cfg?.icon;
  const aura = partner.aura_suggestions as any;
  const posts: any[] = partner.instagram_recent_posts || [];

  return (
    <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Instagram className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Instagram & Aura</h3>
          {cfg && StatusIcon && (
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.cls}`}>
              <StatusIcon className="h-3 w-3" /> {cfg.label}
            </span>
          )}
        </div>
        <button
          onClick={handleSync}
          disabled={syncing || !partner.instagram}
          className="flex items-center gap-1.5 rounded-lg bg-primary/15 px-3 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/25 transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando..." : "Sincronizar agora"}
        </button>
      </div>

      <div className="text-[10px] text-muted-foreground">
        Última sincronização: <span className="text-foreground/80">{timeAgo(partner.instagram_last_sync_at)}</span>
        {partner.instagram_sync_error && <> • <span className="text-destructive">{partner.instagram_sync_error}</span></>}
      </div>

      {/* IG profile preview */}
      {partner.instagram_username && (
        <div className="flex items-start gap-3 rounded-lg border border-border/30 bg-background/50 p-3">
          {partner.instagram_profile_picture_url ? (
            <img
              src={partner.instagram_profile_picture_url}
              alt={partner.instagram_name || partner.instagram_username}
              className="h-14 w-14 rounded-full object-cover border border-primary/30"
            />
          ) : (
            <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center">
              <Instagram className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <a
                href={`https://instagram.com/${partner.instagram_username}`}
                target="_blank" rel="noopener noreferrer"
                className="text-sm font-semibold text-foreground hover:text-primary truncate inline-flex items-center gap-1"
              >
                @{partner.instagram_username}
                <ExternalLink className="h-3 w-3" />
              </a>
              {partner.instagram_name && <span className="text-[11px] text-muted-foreground truncate">• {partner.instagram_name}</span>}
            </div>
            {partner.instagram_bio && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{partner.instagram_bio}</p>}
            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{formatNumber(partner.instagram_followers_count)} seguidores</span>
              <span className="flex items-center gap-1"><ImageIcon className="h-3 w-3" />{formatNumber(partner.instagram_media_count)} posts</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent posts */}
      {posts.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {posts.slice(0, 6).map((p) => (
            <a
              key={p.id}
              href={p.permalink}
              target="_blank" rel="noopener noreferrer"
              className="relative aspect-square overflow-hidden rounded-lg border border-border/30 hover:border-primary/40 transition group"
            >
              <img
                src={p.thumbnail_url || p.media_url}
                alt=""
                className="h-full w-full object-cover group-hover:scale-105 transition"
                loading="lazy"
              />
            </a>
          ))}
        </div>
      )}

      {/* Aura suggestions */}
      {aura && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-bold text-primary">Sugestões da Aura</span>
          </div>
          {aura.summary && <p className="text-xs text-foreground/90">{aura.summary}</p>}
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            {aura.audience && <div><span className="text-muted-foreground">Público:</span> <span className="text-foreground">{aura.audience}</span></div>}
            {aura.vibe && <div><span className="text-muted-foreground">Vibe:</span> <span className="text-foreground">{aura.vibe}</span></div>}
            {aura.category_guess && <div><span className="text-muted-foreground">Categoria:</span> <span className="text-foreground">{aura.category_guess}</span></div>}
            {aura.best_day && <div><span className="text-muted-foreground">Melhor dia:</span> <span className="text-foreground">{aura.best_day}</span></div>}
            {aura.event_frequency && <div><span className="text-muted-foreground">Frequência:</span> <span className="text-foreground">{aura.event_frequency}</span></div>}
            {typeof aura.activity_score === "number" && <div><span className="text-muted-foreground">Score:</span> <span className="text-foreground font-semibold">{aura.activity_score}/100</span></div>}
          </div>
          {Array.isArray(aura.tags) && aura.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {aura.tags.slice(0, 8).map((t: string) => (
                <span key={t} className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-semibold text-primary">{t}</span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={applyAuraSuggestions}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1 text-[10px] font-semibold text-primary-foreground hover:bg-primary/90 transition"
            >
              <Sparkles className="h-3 w-3" /> Aplicar sugestões
            </button>
            <button
              onClick={() => toggleLock("short_description")}
              className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-secondary/80 transition"
            >
              <Lock className="h-3 w-3" />
              {(partner.manual_locked_fields || []).includes("short_description") ? "Desbloquear descrição" : "Bloquear descrição"}
            </button>
          </div>
        </div>
      )}

      {!partner.instagram && (
        <p className="text-[11px] text-muted-foreground italic">Cadastre o Instagram para sincronizar automaticamente.</p>
      )}
    </div>
  );
}

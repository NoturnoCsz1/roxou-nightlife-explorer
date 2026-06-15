/* eslint-disable @typescript-eslint/no-explicit-any -- preservado do original (Fase 6H) */
import { useEffect, useState } from "react";
import { Shield, AlertTriangle, Flag, Ban, Eye, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Report {
  id: string;
  reporter_id: string | null;
  target_user_id: string | null;
  category: string;
  severity: string;
  evidence: string | null;
  status: string;
  created_at: string;
}

interface RiskScore {
  user_id: string;
  score: number;
  badge: string;
  signals: any;
  computed_at: string;
}

interface UserState {
  user_id: string;
  is_muted: boolean;
  is_banned: boolean;
  mute_until: string | null;
  notes: string | null;
}

interface FlaggedMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  is_flagged: boolean;
}

const sevColors: Record<string, string> = {
  critical: "bg-red-500/20 text-red-300 border-red-500/40",
  high: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  low: "bg-blue-500/20 text-blue-300 border-blue-500/40",
};

const badgeColors: Record<string, string> = {
  critical: "bg-red-500/20 text-red-300",
  high: "bg-orange-500/20 text-orange-300",
  medium: "bg-yellow-500/20 text-yellow-300",
  low: "bg-blue-500/20 text-blue-300",
  normal: "bg-green-500/20 text-green-300",
};

export default function AdminSecurity() {
  const [reports, setReports] = useState<Report[]>([]);
  const [risks, setRisks] = useState<RiskScore[]>([]);
  const [states, setStates] = useState<UserState[]>([]);
  const [flagged, setFlagged] = useState<FlaggedMessage[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    const [r, rs, st, fm] = await Promise.all([
      supabase.from("security_reports").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("user_risk_scores").select("*").order("score", { ascending: false }).limit(20),
      supabase.from("community_user_states").select("*").or("is_muted.eq.true,is_banned.eq.true").limit(50),
      supabase.from("community_messages").select("id,user_id,message,created_at,is_flagged").eq("is_flagged", true).order("created_at", { ascending: false }).limit(30),
    ]);
    setReports((r.data as any) || []);
    setRisks((rs.data as any) || []);
    setStates((st.data as any) || []);
    setFlagged((fm.data as any) || []);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  async function updateReportStatus(id: string, status: string) {
    const { error } = await supabase.from("security_reports").update({ status } as any).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    toast.success("Status atualizado");
  }

  async function recomputeUser(userId: string) {
    const { error } = await supabase.rpc("compute_user_risk_score" as any, { _user_id: userId });
    if (error) { toast.error("Erro ao recomputar"); return; }
    toast.success("Score recalculado");
    loadAll();
  }

  const counts = {
    pending: reports.filter(r => r.status === "pending").length,
    high: reports.filter(r => r.severity === "high" || r.severity === "critical").length,
    banned: states.filter(s => s.is_banned).length,
    muted: states.filter(s => s.is_muted).length,
  };

  return (
    <div className="space-y-4 p-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Central de Segurança</h1>
        </div>
        <button
          onClick={loadAll}
          className="inline-flex items-center gap-1 rounded-lg bg-primary/15 border border-primary/40 px-3 py-1.5 text-[11px] font-bold uppercase text-primary hover:bg-primary/25 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KPI label="Reports pendentes" value={counts.pending} color="text-yellow-400" icon={<Flag className="h-4 w-4" />} />
        <KPI label="Severidade alta/crítica" value={counts.high} color="text-red-400" icon={<AlertTriangle className="h-4 w-4" />} />
        <KPI label="Banidos" value={counts.banned} color="text-orange-400" icon={<Ban className="h-4 w-4" />} />
        <KPI label="Mutados" value={counts.muted} color="text-blue-400" icon={<Eye className="h-4 w-4" />} />
      </div>

      {/* Reports recentes */}
      <section className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl p-3">
        <h2 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
          <Flag className="h-4 w-4 text-primary" /> Denúncias recentes
        </h2>
        <div className="space-y-2 max-h-[420px] overflow-y-auto">
          {reports.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma denúncia.</p>}
          {reports.map(r => (
            <div key={r.id} className="rounded-xl border border-border/30 bg-background/60 p-2.5 text-xs space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase ${sevColors[r.severity] || sevColors.medium}`}>{r.severity}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">{r.category}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
                <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${r.status === "resolved" ? "bg-green-500/15 text-green-400" : r.status === "dismissed" ? "bg-muted text-muted-foreground" : "bg-yellow-500/15 text-yellow-400"}`}>{r.status}</span>
              </div>
              {r.evidence && <p className="text-foreground/80 break-words">{r.evidence}</p>}
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                {r.target_user_id && <span>alvo: <code className="text-primary">{r.target_user_id.slice(0, 8)}</code></span>}
                {r.reporter_id && <span>· por: <code>{r.reporter_id.slice(0, 8)}</code></span>}
              </div>
              {r.status === "pending" && (
                <div className="flex gap-1 mt-1">
                  <button onClick={() => updateReportStatus(r.id, "resolved")} className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-green-500/15 text-green-400 hover:bg-green-500/25">Resolver</button>
                  <button onClick={() => updateReportStatus(r.id, "dismissed")} className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/70">Descartar</button>
                  {r.target_user_id && <button onClick={() => recomputeUser(r.target_user_id!)} className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-primary/15 text-primary hover:bg-primary/25">↻ Score</button>}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-3">
        {/* Top risco */}
        <section className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl p-3">
          <h2 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-400" /> Top usuários por risco
          </h2>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {risks.length === 0 && <p className="text-xs text-muted-foreground">Sem dados.</p>}
            {risks.map(r => (
              <div key={r.user_id} className="flex items-center gap-2 rounded-lg border border-border/30 bg-background/60 p-2 text-xs">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${badgeColors[r.badge] || badgeColors.normal}`}>{r.badge}</span>
                <code className="text-foreground/80 text-[10px]">{r.user_id.slice(0, 12)}</code>
                <span className="ml-auto font-bold text-foreground">{r.score}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Banidos/Mutados */}
        <section className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl p-3">
          <h2 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
            <Ban className="h-4 w-4 text-red-400" /> Banidos / Mutados
          </h2>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {states.length === 0 && <p className="text-xs text-muted-foreground">Nenhum.</p>}
            {states.map(s => (
              <div key={s.user_id} className="flex items-center gap-2 rounded-lg border border-border/30 bg-background/60 p-2 text-xs">
                {s.is_banned && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/20 text-red-300">BAN</span>}
                {s.is_muted && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-yellow-500/20 text-yellow-300">MUTE</span>}
                <code className="text-foreground/80 text-[10px]">{s.user_id.slice(0, 12)}</code>
                {s.mute_until && <span className="ml-auto text-[10px] text-muted-foreground">até {new Date(s.mute_until).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Mensagens flagadas */}
      <section className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl p-3">
        <h2 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
          <Eye className="h-4 w-4 text-yellow-400" /> Mensagens flagadas
        </h2>
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {flagged.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma.</p>}
          {flagged.map(m => (
            <div key={m.id} className="rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-2 text-xs">
              <p className="text-foreground/90 break-words">{m.message}</p>
              <div className="text-[10px] text-muted-foreground mt-1">
                <code>{m.user_id.slice(0, 12)}</code> · {new Date(m.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function KPI({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl p-3">
      <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground">
        {icon} {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

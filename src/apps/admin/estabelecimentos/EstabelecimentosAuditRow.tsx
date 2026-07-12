import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, Ban, CheckCircle2, Edit2, ExternalLink, Eye, Gauge,
  Instagram as InstagramIcon, Loader2, Map as MapIcon, MapPin, RefreshCw, ShieldCheck, Sparkles, Star, Tag, Wand2,
} from "lucide-react";
import { EstabelecimentosFeaturesDialog } from "./EstabelecimentosFeaturesDialog";
import type { ApplyKey, Establishment, ManualCoordsState, Metrics, SingleAI, Status, SuggestAI } from "./types";
import { FLAG_LABELS, STATUS_META } from "./types";
import { computeFlags, computeScore, scoreTone } from "./scoring";
import { EstabelecimentosManualCoords } from "./EstabelecimentosManualCoords";
import { EstabelecimentosAiAnalysisPanel } from "./EstabelecimentosAiAnalysisPanel";
import { EstabelecimentosAiSuggestPanel } from "./EstabelecimentosAiSuggestPanel";

interface Props {
  e: Establishment;
  metrics: Metrics | undefined;
  busy: string | null;
  aiBusy: string | null;
  suggestBusy: string | null;
  applyBusy: string | null;
  aiResult: SingleAI | undefined;
  suggestResult: SuggestAI | undefined;
  applySel: Record<ApplyKey, boolean> | undefined;
  defaultApplySel: (e: Establishment, s: SuggestAI) => Record<ApplyKey, boolean>;
  manualOpen: ManualCoordsState | undefined;
  setManualOpen: (m: ManualCoordsState | null) => void;
  onSetStatus: (s: Status) => void;
  onValidateInstagram: () => void;
  onGenerateCoordinates: () => void;
  onAnalyzeOne: () => void;
  onSuggestOne: () => void;
  onReloadOne: () => void;
  onSaveManualCoords: (lat: number, lng: number) => Promise<void>;
  onCloseAiResult: () => void;
  onCloseSuggest: () => void;
  onToggleApplySel: (k: ApplyKey) => void;
  onApply: () => void;
  onOpenMap: () => void;
}

export function EstabelecimentosAuditRow(props: Props) {
  const { e, metrics: m } = props;
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const flags = computeFlags(e);
  const cur = (e.status as Status) || (e.active ? "ativo" : "bloqueado");
  const meta = STATUS_META[cur];
  const score = computeScore(e);
  const tone = scoreTone(score);

  return (
    <div className="rounded-xl border border-border/40 bg-card p-3 space-y-2">
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
            disabled={props.busy === e.id}
            onClick={() => props.onSetStatus(s)}
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
        <Link to={`/admin/parceiros/${e.id}/editar`} className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary hover:bg-primary/20">
          <Edit2 className="h-3 w-3" /> Editar
        </Link>
        <button disabled={props.busy === e.id} onClick={props.onValidateInstagram} className="inline-flex items-center gap-1 rounded-lg bg-secondary/60 px-2.5 py-1 text-[10px] font-semibold hover:bg-secondary">
          <InstagramIcon className="h-3 w-3" /> Validar Instagram
        </button>
        <button disabled={props.busy === e.id} onClick={props.onGenerateCoordinates} className="inline-flex items-center gap-1 rounded-lg bg-secondary/60 px-2.5 py-1 text-[10px] font-semibold hover:bg-secondary">
          {props.busy === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
          Geocodificar endereço
        </button>
        {e.latitude != null && e.longitude != null && (
          <button onClick={props.onOpenMap} className="inline-flex items-center gap-1 rounded-lg bg-secondary/60 px-2.5 py-1 text-[10px] font-semibold hover:bg-secondary">
            <MapIcon className="h-3 w-3" /> Ver no mapa
          </button>
        )}
        <button disabled={props.aiBusy === e.id} onClick={props.onAnalyzeOne} className="inline-flex items-center gap-1 rounded-lg bg-primary/15 px-2.5 py-1 text-[10px] font-semibold text-primary hover:bg-primary/25">
          {props.aiBusy === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          Analisar com IA
        </button>
        <button disabled={props.suggestBusy === e.id} onClick={props.onSuggestOne}
          className="inline-flex items-center gap-1 rounded-lg bg-fuchsia-500/15 px-2.5 py-1 text-[10px] font-semibold text-fuchsia-300 hover:bg-fuchsia-500/25"
          title="Gera sugestões de categoria, estilo e descrição (não salva)"
        >
          {props.suggestBusy === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
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
          onClick={() => props.setManualOpen(props.manualOpen
            ? null
            : { lat: e.latitude?.toString() || "", lng: e.longitude?.toString() || "", url: "" })}
          className="inline-flex items-center gap-1 rounded-lg bg-secondary/60 px-2.5 py-1 text-[10px] font-semibold hover:bg-secondary"
        >
          <MapPin className="h-3 w-3" /> Coordenadas manuais
        </button>
        <button onClick={() => setFeaturesOpen(true)} className="inline-flex items-center gap-1 rounded-lg bg-secondary/60 px-2.5 py-1 text-[10px] font-semibold hover:bg-secondary">
          <Tag className="h-3 w-3" /> Características
        </button>
        <button onClick={props.onReloadOne} className="inline-flex items-center gap-1 rounded-lg bg-secondary/60 px-2.5 py-1 text-[10px] font-semibold hover:bg-secondary">
          <RefreshCw className="h-3 w-3" /> Recarregar dados
        </button>
        <a href={`/local/${e.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-secondary/60 px-2.5 py-1 text-[10px] font-semibold hover:bg-secondary">
          <ExternalLink className="h-3 w-3" /> Ver página
        </a>
      </div>

      {props.manualOpen && (
        <EstabelecimentosManualCoords
          e={e}
          state={props.manualOpen}
          busy={props.busy === e.id}
          onChange={(next) => props.setManualOpen(next)}
          onSave={async (lat, lng) => {
            await props.onSaveManualCoords(lat, lng);
            props.setManualOpen(null);
          }}
          onCancel={() => props.setManualOpen(null)}
        />
      )}

      {props.aiResult && (
        <EstabelecimentosAiAnalysisPanel
          e={e}
          r={props.aiResult}
          onClose={props.onCloseAiResult}
          onGenerateCoordinates={props.onGenerateCoordinates}
          onValidateInstagram={props.onValidateInstagram}
          onSetStatus={props.onSetStatus}
        />
      )}

      {props.suggestResult && (
        <EstabelecimentosAiSuggestPanel
          e={e}
          s={props.suggestResult}
          applyBusy={props.applyBusy === e.id}
          sel={props.applySel ?? props.defaultApplySel(e, props.suggestResult)}
          toggle={props.onToggleApplySel}
          onClose={props.onCloseSuggest}
          onApply={props.onApply}
        />
      )}
    </div>
  );
}

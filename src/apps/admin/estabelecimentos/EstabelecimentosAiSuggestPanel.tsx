import { Link } from "react-router-dom";
import {
  CheckCircle2, Edit2, Instagram as InstagramIcon, Loader2, Wand2, X,
} from "lucide-react";
import type { ApplyKey, Establishment, SuggestAI } from "./types";

interface Props {
  e: Establishment;
  s: SuggestAI;
  applyBusy: boolean;
  sel: Record<ApplyKey, boolean>;
  toggle: (k: ApplyKey) => void;
  onClose: () => void;
  onApply: () => void;
}

export function EstabelecimentosAiSuggestPanel({ e, s, applyBusy, sel, toggle, onClose, onApply }: Props) {
  const confCls = s.confidence === "alta"
    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
    : s.confidence === "media"
      ? "bg-sky-500/15 text-sky-400 border-sky-500/40"
      : "bg-amber-500/15 text-amber-400 border-amber-500/40";

  const ig = s.instagram;
  const src = ig?.source ?? "cadastro";
  const igMeta = src === "instagram_validated"
    ? { label: "Instagram validado", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40", icon: "✅" }
    : src === "instagram_not_validated"
      ? { label: "Instagram não validado", cls: "bg-amber-500/15 text-amber-300 border-amber-500/40", icon: "⚠️" }
      : { label: "Cadastro interno", cls: "bg-secondary/40 text-muted-foreground border-border/40", icon: "📋" };

  const rows: { k: ApplyKey; label: string; preview: string; enabled: boolean }[] = [
    { k: "type", label: "Categoria", preview: s.suggested_type_label, enabled: !!s.suggested_type },
    { k: "music_style_primary", label: "Estilo principal", preview: s.suggested_music_primary, enabled: !!s.suggested_music_primary },
    { k: "music_styles_secondary", label: "Estilos secundários", preview: (s.suggested_music_secondary || []).join(", ") || "—", enabled: (s.suggested_music_secondary?.length ?? 0) > 0 },
    { k: "short_description", label: "Descrição curta", preview: s.suggested_description, enabled: !!s.suggested_description },
    ...(s.suggested_full_description
      ? [{ k: "full_description" as ApplyKey, label: "Descrição completa", preview: s.suggested_full_description, enabled: true }]
      : []),
    ...(s.suggested_address
      ? [{
          k: "address" as ApplyKey,
          label: e.address?.trim()
            ? "Endereço e coordenadas (sobrescrever)"
            : "Endereço e coordenadas",
          preview: [
            s.suggested_formatted_address || s.suggested_address,
            s.suggested_latitude != null && s.suggested_longitude != null
              ? `· ${s.suggested_latitude.toFixed(4)},${s.suggested_longitude.toFixed(4)}` : "",
          ].filter(Boolean).join(" "),
          enabled: true,
        }]
      : []),
  ];
  const anyChecked = rows.some(r => r.enabled && sel[r.k]);

  return (
    <div className="mt-2 rounded-lg border border-fuchsia-500/40 bg-gradient-to-br from-fuchsia-500/5 to-purple-500/5 p-3 space-y-2 relative">
      <button onClick={onClose} className="absolute top-1.5 right-1.5 text-muted-foreground hover:text-foreground">
        <X className="h-3 w-3" />
      </button>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Wand2 className="h-3.5 w-3.5 text-fuchsia-400" />
        <span className="text-[11px] font-bold uppercase tracking-wide">Sugestões da IA</span>
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${confCls}`}>
          confiança {s.confidence}
        </span>
      </div>

      <div className="rounded-md border border-border/30 bg-background/40 px-2 py-1.5 text-[10px] space-y-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold uppercase tracking-wide text-muted-foreground">Fonte usada pela IA:</span>
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${igMeta.cls}`}>
            {igMeta.icon} {igMeta.label}
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

        {s.suggested_address && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-300">📍 Endereço sugerido</div>
              <div className="flex items-center gap-1">
                {s.address_source && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-200 border border-emerald-500/30">
                    {s.address_source === "ambos" ? "Instagram + Google Maps"
                      : s.address_source === "google_maps" ? "Google Maps"
                      : s.address_source === "instagram" ? "Instagram"
                      : s.address_source === "website" ? "Website"
                      : s.address_source === "cadastro" ? "Cadastro" : "—"}
                  </span>
                )}
                {s.address_confidence && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${
                    s.address_confidence === "alta" ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/40"
                    : s.address_confidence === "media" ? "bg-amber-500/20 text-amber-200 border-amber-500/40"
                    : "bg-rose-500/20 text-rose-200 border-rose-500/40"
                  }`}>
                    {s.address_confidence}
                  </span>
                )}
              </div>
            </div>
            <div className="text-[11px] text-foreground/90 font-medium">{s.suggested_formatted_address || s.suggested_address}</div>
            {s.suggested_neighborhood && (
              <div className="text-[10px] text-foreground/70">Bairro: <span className="text-foreground/90">{s.suggested_neighborhood}</span></div>
            )}
            {(s.suggested_latitude != null && s.suggested_longitude != null) && (
              <div className="text-[9px] text-muted-foreground font-mono">
                {s.suggested_latitude.toFixed(6)}, {s.suggested_longitude.toFixed(6)}
                {s.address_partial_match && <span className="ml-1 text-amber-400">(parcial)</span>}
              </div>
            )}
            {s.address_evidence && (
              <div className="text-[10px] italic text-foreground/70">↳ {s.address_evidence}</div>
            )}
            {s.address_confidence === "baixa" && (
              <div className="text-[10px] text-amber-300 bg-amber-500/10 rounded px-1.5 py-1 border border-amber-500/30">
                ⚠️ Confiança baixa — revise antes de aplicar.
              </div>
            )}
            {e.address?.trim() && (
              <div className="text-[10px] text-amber-300">
                ⚠️ Já existe endereço cadastrado. Aplicar irá sobrescrever — marque manualmente.
              </div>
            )}
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
            disabled={applyBusy || !anyChecked}
            onClick={onApply}
            className="inline-flex items-center gap-1 rounded-lg bg-fuchsia-500/20 hover:bg-fuchsia-500/30 disabled:opacity-50 disabled:cursor-not-allowed px-2.5 py-1 text-[10px] font-semibold text-fuchsia-200 border border-fuchsia-500/40"
          >
            {applyBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
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
    </div>
  );
}

/**
 * Campaign Links — Fase GAP B/C
 *
 * Gera links UTM + texto pronto WhatsApp/Instagram para um evento ou lista VIP,
 * opcionalmente atribuídos a um promoter. Não cria tabelas: o vínculo é feito
 * via `utm_content=promoter:<slug>` e capturado pelo `analytics_events` existente.
 */
import { withUtm } from "@/lib/utm";

const PUBLIC_BASE =
  typeof window !== "undefined" ? window.location.origin : "https://roxou.com.br";

export interface CampaignTarget {
  kind: "event" | "vip_list";
  /** slug do evento ou public_slug da lista VIP */
  slug: string;
  /** título exibido no texto compartilhado */
  title: string;
  /** ISO date opcional, exibido no texto */
  whenIso?: string | null;
  partnerSlug?: string | null;
}

export interface CampaignContext {
  promoterSlug?: string | null;
  promoterName?: string | null;
  source?: "whatsapp" | "instagram" | "stories" | "feed" | "link";
}

function relativePath(target: CampaignTarget): string {
  if (target.kind === "event") return `/evento/${target.slug}`;
  // lista VIP pública usa slug curto
  return `/vip/${target.slug}`;
}

export function buildCampaignUrl(
  target: CampaignTarget,
  ctx: CampaignContext = {},
): string {
  const path = `${PUBLIC_BASE}${relativePath(target)}`;
  return withUtm(path, {
    source: ctx.source ?? "promoter",
    medium: ctx.source === "whatsapp" ? "whatsapp" : "social",
    campaign: target.slug,
    content: ctx.promoterSlug ? `promoter:${ctx.promoterSlug}` : undefined,
  });
}

function formatWhen(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      weekday: "short",
    });
  } catch {
    return "";
  }
}

export function buildWhatsappText(target: CampaignTarget, ctx: CampaignContext = {}) {
  const url = buildCampaignUrl(target, { ...ctx, source: "whatsapp" });
  const when = formatWhen(target.whenIso);
  const intro = ctx.promoterName
    ? `🎟️ *${target.title}*${when ? ` — ${when}` : ""}\nGaranta sua entrada comigo (${ctx.promoterName}):`
    : `🎟️ *${target.title}*${when ? ` — ${when}` : ""}\nGaranta sua entrada:`;
  return `${intro}\n${url}`;
}

export function buildInstagramCaption(target: CampaignTarget, ctx: CampaignContext = {}) {
  const url = buildCampaignUrl(target, { ...ctx, source: "instagram" });
  const when = formatWhen(target.whenIso);
  const line = ctx.promoterName ? `Lista com ${ctx.promoterName} 👇` : "Entre na lista 👇";
  return `${target.title}${when ? ` • ${when}` : ""}\n${line}\n${url}\n\n#roxou #lista #vip`;
}

export function buildWhatsappShareLink(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

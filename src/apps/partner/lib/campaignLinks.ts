/**
 * Campaign Links — Fase Final
 *
 * Helpers para gerar links UTM, QRs e textos prontos por canal.
 * Reutiliza `withUtm` central. Não cria tabelas.
 */
import { withUtm } from "@/shared/utils/utm";

const PUBLIC_BASE =
  typeof window !== "undefined" ? window.location.origin : "https://roxou.com.br";

export type CampaignChannel =
  | "whatsapp"
  | "instagram"
  | "stories"
  | "feed"
  | "bio"
  | "qrcode"
  | "link";

export type CampaignTargetKind =
  | "event"
  | "vip_list"
  | "reservation"
  | "excursion"
  | "bio";

export interface CampaignTarget {
  kind: CampaignTargetKind;
  /** slug ou identificador público (slug do evento, public_slug da lista, slug do partner para bio, etc.) */
  slug: string;
  /** título exibido nos textos compartilhados */
  title: string;
  /** ISO date opcional */
  whenIso?: string | null;
  /** slug do evento associado, usado em utm_campaign */
  eventSlug?: string | null;
}

export interface CampaignContext {
  promoterSlug?: string | null;
  promoterName?: string | null;
  channel?: CampaignChannel;
}

function relativePath(target: CampaignTarget): string {
  switch (target.kind) {
    case "event":
      return `/evento/${target.slug}`;
    case "vip_list":
      return `/vip/${target.slug}`;
    case "reservation":
      return `/reservar/${target.slug}`;
    case "excursion":
      return `/transportes/excursoes/${target.slug}`;
    case "bio":
      return `/bio/${target.slug}`;
  }
}

export function buildCampaignUrl(
  target: CampaignTarget,
  ctx: CampaignContext = {},
): string {
  const path = `${PUBLIC_BASE}${relativePath(target)}`;
  const channel = ctx.channel ?? "link";
  const medium =
    channel === "whatsapp"
      ? "whatsapp"
      : channel === "qrcode"
        ? "qr"
        : channel === "bio"
          ? "bio"
          : "social";
  return withUtm(path, {
    source: "promoter",
    medium,
    campaign: target.eventSlug ?? target.slug,
    content: ctx.promoterSlug ? `promoter:${ctx.promoterSlug}` : undefined,
    term: channel,
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
  const url = buildCampaignUrl(target, { ...ctx, channel: "whatsapp" });
  const when = formatWhen(target.whenIso);
  const intro = ctx.promoterName
    ? `🎟️ *${target.title}*${when ? ` — ${when}` : ""}\nGaranta sua entrada comigo (${ctx.promoterName}):`
    : `🎟️ *${target.title}*${when ? ` — ${when}` : ""}\nGaranta sua entrada:`;
  return `${intro}\n${url}`;
}

export function buildInstagramCaption(target: CampaignTarget, ctx: CampaignContext = {}) {
  const url = buildCampaignUrl(target, { ...ctx, channel: "instagram" });
  const when = formatWhen(target.whenIso);
  const line = ctx.promoterName ? `Lista com ${ctx.promoterName} 👇` : "Entre na lista 👇";
  return `${target.title}${when ? ` • ${when}` : ""}\n${line}\n${url}\n\n#roxou #lista #vip`;
}

export function buildStoriesText(target: CampaignTarget, ctx: CampaignContext = {}) {
  const url = buildCampaignUrl(target, { ...ctx, channel: "stories" });
  const when = formatWhen(target.whenIso);
  return `🔥 ${target.title}${when ? ` — ${when}` : ""}\nLink na bio ou:\n${url}`;
}

export function buildFeedText(target: CampaignTarget, ctx: CampaignContext = {}) {
  const url = buildCampaignUrl(target, { ...ctx, channel: "feed" });
  const when = formatWhen(target.whenIso);
  const promoterLine = ctx.promoterName ? `\nLista com ${ctx.promoterName}.` : "";
  return `${target.title}${when ? ` — ${when}` : ""}${promoterLine}\n\nGaranta seu nome: ${url}\n\n#roxou #vip #lista #eventos`;
}

export function buildBioUrl(partnerSlug: string, ctx: CampaignContext = {}) {
  return buildCampaignUrl(
    { kind: "bio", slug: partnerSlug, title: "Bio", eventSlug: partnerSlug },
    { ...ctx, channel: "bio" },
  );
}

export function buildWhatsappShareLink(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export async function nativeShare(payload: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  try {
    await navigator.share(payload);
    return true;
  } catch {
    return false;
  }
}

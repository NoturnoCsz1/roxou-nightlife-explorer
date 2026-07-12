/**
 * Onda 16 — Lead Intelligence
 * Compositor puro para VenueAction[] e LeadLink[] a partir de um VenueProfile.
 */
import type { VenueProfile } from "../types/venueProfile";
import type { LeadLink } from "../types/lead";
import type { VenueAction } from "../types/venueAction";
import {
  buildInstagramLink,
  buildMapsLink,
  buildPhoneLink,
  buildWhatsappLink,
} from "./leadLinkService";

export interface BuildVenueActionsOptions {
  /** URL da página atual — usada nas mensagens de WhatsApp. */
  pageUrl?: string;
  /** Reserva: rota interna já resolvida (ex.: /reservar/<slug>). */
  reservationUrl?: string | null;
  /** Lista VIP: rota interna já resolvida (ex.: /vip/<slug>). */
  vipListUrl?: string | null;
  /** Ingresso: rota interna já resolvida (ex.: /evento/<slug>). */
  ticketUrl?: string | null;
}

function toAction(
  id: VenueAction["id"],
  label: string,
  icon: VenueAction["icon"],
  url: string | null,
  trackingChannel: VenueAction["trackingChannel"],
): VenueAction {
  return { id, label, icon, url, trackingChannel, enabled: !!url };
}

export function buildVenueActions(
  profile: VenueProfile,
  opts: BuildVenueActionsOptions = {},
): VenueAction[] {
  const contact = profile.contact ?? {};
  const location = profile.location ?? {};
  const menu = profile.menu?.[0]?.url ?? null;

  const whatsappUrl = contact.whatsapp
    ? buildWhatsappLink({ phone: contact.whatsapp, url: opts.pageUrl })
    : null;
  const phoneUrl = contact.telefone ? buildPhoneLink(contact.telefone) : null;
  const igUrl = contact.instagram ? buildInstagramLink(contact.instagram) : null;
  const siteUrl = contact.website ?? null;
  const mapsUrl =
    location.googlePlaceId ||
    location.latitude != null ||
    location.address
      ? buildMapsLink({
          placeId: location.googlePlaceId,
          latitude: location.latitude,
          longitude: location.longitude,
          query: location.address,
          directions: true,
        })
      : null;

  return [
    toAction("reserve", "Reservar Mesa", "calendar", opts.reservationUrl ?? null, "reservation"),
    toAction("whatsapp", "WhatsApp", "whatsapp", whatsappUrl, "whatsapp"),
    toAction("call", "Ligar", "phone", phoneUrl, "phone"),
    toAction("instagram", "Instagram", "instagram", igUrl, "instagram"),
    toAction("website", "Site", "globe", siteUrl, "website"),
    toAction("menu", "Cardápio", "menu", menu, "menu"),
    toAction("directions", "Como Chegar", "map", mapsUrl, "directions"),
    toAction("vip_list", "Lista VIP", "star", opts.vipListUrl ?? null, "vip_list"),
    toAction("buy_ticket", "Comprar Ingresso", "ticket", opts.ticketUrl ?? null, "event"),
  ];
}

export function buildLeadLinks(
  profile: VenueProfile,
  opts: BuildVenueActionsOptions = {},
): LeadLink[] {
  return buildVenueActions(profile, opts)
    .filter((a) => a.enabled && a.url)
    .map((a) => ({ channel: a.trackingChannel, url: a.url as string, label: a.label }));
}

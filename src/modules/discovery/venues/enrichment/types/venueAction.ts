/**
 * Onda 16 — Lead Intelligence
 * Estrutura para renderizar as ações rápidas de um estabelecimento.
 * Consumida futuramente pela página do local.
 */
import type { LeadChannel } from "./lead";

export type VenueActionId =
  | "reserve"
  | "whatsapp"
  | "call"
  | "instagram"
  | "website"
  | "menu"
  | "directions"
  | "vip_list"
  | "buy_ticket";

export type VenueActionIcon =
  | "calendar"
  | "whatsapp"
  | "phone"
  | "instagram"
  | "globe"
  | "menu"
  | "map"
  | "star"
  | "ticket";

export interface VenueAction {
  id: VenueActionId;
  label: string;
  icon: VenueActionIcon;
  url: string | null;
  trackingChannel: LeadChannel;
  enabled: boolean;
}

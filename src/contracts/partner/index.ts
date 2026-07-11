/**
 * Partner Pro — barrel público.
 *
 * Descobertas e outros módulos SÓ podem importar deste barrel:
 *
 *   import type { PublicReservationLink, PublicVipLink, PublicBio }
 *     from "@contracts/partner";
 */
export type {
  PublicReservationLink,
  PublicReservationLinkStatus,
} from "./publicReservationLink";
export type { PublicVipLink, PublicVipLinkStatus } from "./publicVipLink";
export type { PublicBio } from "./publicBio";

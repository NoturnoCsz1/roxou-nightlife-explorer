/**
 * Roxou Descobertas — barrel público.
 *
 * QUALQUER módulo externo (partner, transport, admin, integrations)
 * deve importar exclusivamente deste barrel:
 *
 *   import type { PublicEvent, PublicVenue } from "@contracts/discovery";
 *
 * Nunca:
 *   import ... from "@modules/discovery/pages/..."
 *   import ... from "src/pages/v3/..."
 */
export type {
  PublicEvent,
  PublicEventStatus,
  PublicEventUrl,
} from "./publicEvent";
export type { PublicVenue, PublicVenueUrl } from "./publicVenue";

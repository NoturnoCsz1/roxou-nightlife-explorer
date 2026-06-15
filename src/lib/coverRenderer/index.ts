/**
 * Public entrypoint for the Roxou cover renderer.
 *
 * Refactor (Fase 4): the original monolithic src/lib/coverRenderer.ts (1441 LOC)
 * was split into this folder. The public API is preserved byte-equivalent; all
 * existing imports (`from "@/lib/coverRenderer"`) keep working unchanged.
 */

// Types & visual constants (public)
export type { ArtFormat, CoverEvent, CoverPartner } from "./types";
export { FORMAT_SIZES } from "./types";

// Image helper (public)
export { loadImage } from "./utils";

// Template renderers (public)
export { renderCoverAgenda } from "./templates/agenda";
export { renderCoverTopRoles } from "./templates/topRoles";
export { renderCoverWeekend } from "./templates/weekend";
export { renderCoverPartners } from "./templates/partners";
export { renderFlyer } from "./templates/flyer";
export { renderBannerFestival } from "./templates/banner";
export { renderCoverDestaque } from "./templates/destaque";
export { renderCTASlide } from "./templates/cta";
export { renderStoryV3 } from "./templates/storyV3";

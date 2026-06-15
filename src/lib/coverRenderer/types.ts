/**
 * Shared types and visual constants for Roxou cover renderers.
 * Extracted verbatim from the original src/lib/coverRenderer.ts.
 */

export const BG = "#0f0a1a";
export const ACCENT = "#e91e8c";
export const ACCENT_ALT = "#9333ea";
export const WHITE = "#ffffff";
export const MUTED = "rgba(255,255,255,0.5)";

export type ArtFormat = "feed" | "story" | "flyer" | "banner";

export const FORMAT_SIZES: Record<ArtFormat, { w: number; h: number; label: string }> = {
  feed:   { w: 1080, h: 1350, label: "Feed 4:5" },
  story:  { w: 1080, h: 1920, label: "Story 9:16" },
  flyer:  { w: 1080, h: 1350, label: "Flyer" },
  banner: { w: 1920, h: 1080, label: "Banner Festival" },
};

export interface CoverEvent {
  title: string;
  date_time: string;
  venue_name: string | null;
  category: string;
  image_url: string | null;
  description?: string | null;
  ticket_url?: string | null;
  sub_category?: string | null;
}

export interface CoverPartner {
  name: string;
  logo_url: string | null;
  views: number;
}

export const WEEKDAYS = ["DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];

// Story V3 palette
export const STORY_BG = "#09090B";
export const STORY_PURPLE = "#7C3AED";
export const STORY_VIOLET = "#A855F7";
export const STORY_LILAC = "#C084FC";

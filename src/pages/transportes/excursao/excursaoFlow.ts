/**
 * Helpers compartilhados pelo fluxo público de excursões
 * (detalhe → assentos → passageiro → confirmação → acompanhar).
 *
 * Mantém formatadores, paleta de assentos e persistência leve em
 * sessionStorage para passar estado entre as sub-páginas sem URL longa.
 */
import type { PublicSeat } from "@/services/publicExcursoes";

export function formatBRL(cents: number): string {
  if (cents <= 0) return "Grátis";
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export const seatPalette: Record<
  PublicSeat["status"],
  { cls: string; label: string; disabled: boolean }
> = {
  free: {
    cls: "bg-emerald-500/20 border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30",
    label: "Livre",
    disabled: false,
  },
  reserved: {
    cls: "bg-amber-500/20 border-amber-400/40 text-amber-200 opacity-70",
    label: "Reservado",
    disabled: true,
  },
  paid: {
    cls: "bg-blue-500/20 border-blue-400/40 text-blue-200 opacity-70",
    label: "Pago",
    disabled: true,
  },
  boarded: {
    cls: "bg-fuchsia-500/20 border-fuchsia-400/40 text-fuchsia-200 opacity-70",
    label: "Embarcado",
    disabled: true,
  },
  cancelled: {
    cls: "bg-zinc-500/10 border-zinc-500/30 text-zinc-500 line-through opacity-60",
    label: "Cancelado",
    disabled: true,
  },
};

// =============================================================
// Estado temporário do fluxo de compra (apenas frontend)
// =============================================================

const STORAGE_PREFIX = "roxou:excursao:";

export interface ExcursaoFlowState {
  seat_id?: string;
  seat_number?: string;
  name?: string;
  phone?: string;
  doc?: string;
}

export function readFlow(slug: string): ExcursaoFlowState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_PREFIX + slug);
    if (!raw) return {};
    return JSON.parse(raw) as ExcursaoFlowState;
  } catch {
    return {};
  }
}

export function writeFlow(slug: string, patch: ExcursaoFlowState): ExcursaoFlowState {
  const next = { ...readFlow(slug), ...patch };
  try {
    window.sessionStorage.setItem(STORAGE_PREFIX + slug, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function clearFlow(slug: string): void {
  try {
    window.sessionStorage.removeItem(STORAGE_PREFIX + slug);
  } catch {
    /* ignore */
  }
}

// =============================================================
// Stepper visual (1/4 · 2/4 · 3/4 · 4/4)
// =============================================================

export const EXCURSAO_STEPS = [
  { key: "detalhe", label: "Viagem" },
  { key: "assentos", label: "Assento" },
  { key: "passageiro", label: "Passageiro" },
  { key: "confirmacao", label: "Confirmar" },
] as const;

export type ExcursaoStepKey = (typeof EXCURSAO_STEPS)[number]["key"];

/**
 * Partner Validator service — leitura/validação de QR Codes.
 *
 * Tipos suportados:
 *  - vip          → partner_vip_list_entries (via get_vip_entry_by_token / id direto)
 *  - reservation  → partner_reservations
 *  - invite       → ainda não disponível (stub)
 *
 * Sem novas tabelas. Reutiliza RPCs e serviços existentes.
 * RLS: check-in só funciona se o usuário Partner tiver acesso ao parceiro.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  getVipEntryByToken,
  checkInVipEntry,
  type PartnerVipEntry,
} from "./partnerVipLists";
import {
  getReservation,
  completeReservation,
  type PartnerReservationRow,
} from "./partnerReservations";

export type ValidatorItemType = "vip" | "reservation" | "invite" | "unknown";

export interface ParsedQrPayload {
  type: ValidatorItemType;
  /** Token público (UUID) quando aplicável (vip legacy). */
  token: string | null;
  /** ID direto da entidade quando vier em &id=. */
  id: string | null;
  /** Conteúdo original para fallback/diagnóstico. */
  raw: string;
}

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Aceita formatos:
 *  - `roxou://checkin?type=vip&token=<uuid>`
 *  - `roxou://checkin?type=reservation&id=<uuid>`
 *  - `https://roxou.com.br/checkin/<token>` (compat antigo)
 *  - `https://roxou.com.br/checkin?type=...&token=...`
 *  - `<uuid>` puro → assume VIP token
 */
export function parseQrPayload(raw: string): ParsedQrPayload {
  const value = (raw ?? "").trim();
  if (!value) return { type: "unknown", token: null, id: null, raw: value };

  // UUID puro → vip token
  if (UUID_RE.test(value) && value.length <= 64 && !value.includes("/")) {
    const m = value.match(UUID_RE);
    return { type: "vip", token: m?.[0] ?? value, id: null, raw: value };
  }

  let url: URL | null = null;
  try {
    // Normaliza roxou:// para URL
    const normalized = value.startsWith("roxou://")
      ? value.replace("roxou://", "https://roxou.local/")
      : value;
    url = new URL(normalized);
  } catch {
    url = null;
  }

  if (url) {
    const params = url.searchParams;
    const typeParam = (params.get("type") || "").toLowerCase();
    const token = params.get("token");
    const id = params.get("id");

    // /checkin/<token>
    const checkinMatch = url.pathname.match(/\/checkin\/([^/?#]+)/i);
    if (checkinMatch?.[1] && !typeParam) {
      return { type: "vip", token: checkinMatch[1], id: null, raw: value };
    }

    // /vip/<slug>/sucesso/<token> ou /<partner>/vip/sucesso/<token>
    const sucessoMatch = url.pathname.match(/\/sucesso\/([^/?#]+)/i);
    if (sucessoMatch?.[1] && !typeParam) {
      return { type: "vip", token: sucessoMatch[1], id: null, raw: value };
    }

    if (typeParam === "vip" || typeParam === "reservation" || typeParam === "invite") {
      return {
        type: typeParam,
        token: token ?? null,
        id: id ?? null,
        raw: value,
      };
    }

    // Fallback: extrai UUID da string
    const m = value.match(UUID_RE);
    if (m) return { type: "vip", token: m[0], id: null, raw: value };
  }

  return { type: "unknown", token: null, id: null, raw: value };
}

export type ValidationOutcome =
  | "valid"
  | "already_used"
  | "expired"
  | "not_found"
  | "wrong_event"
  | "unsupported"
  | "error";

export interface ValidationResult {
  outcome: ValidationOutcome;
  type: ValidatorItemType;
  message: string;
  /** Dados extras p/ exibição. */
  vipEntry?: PartnerVipEntry | null;
  reservation?: PartnerReservationRow | null;
  /** Função para confirmar check-in quando outcome === "valid". */
  confirm?: () => Promise<ValidationResult>;
  /** Identificador legível. */
  ref?: string;
}

async function findVipEntry(
  parsed: ParsedQrPayload,
): Promise<PartnerVipEntry | null> {
  if (parsed.token) {
    try {
      return await getVipEntryByToken(parsed.token);
    } catch {
      // continua p/ fallback por id
    }
  }
  if (parsed.id) {
    const { data, error } = await supabase
      .from("partner_vip_list_entries")
      .select("*")
      .eq("id", parsed.id)
      .maybeSingle();
    if (error) return null;
    return (data as unknown as PartnerVipEntry) ?? null;
  }
  return null;
}

async function validateVip(parsed: ParsedQrPayload): Promise<ValidationResult> {
  const entry = await findVipEntry(parsed);
  if (!entry) {
    return {
      outcome: "not_found",
      type: "vip",
      message: "Inscrição VIP não encontrada.",
    };
  }
  const ref = entry.name;
  if (entry.status === "cancelled") {
    return {
      outcome: "expired",
      type: "vip",
      message: "Inscrição cancelada.",
      vipEntry: entry,
      ref,
    };
  }
  if (entry.status === "no_show") {
    return {
      outcome: "expired",
      type: "vip",
      message: "Marcado como no-show.",
      vipEntry: entry,
      ref,
    };
  }
  if (entry.status === "checked_in") {
    return {
      outcome: "already_used",
      type: "vip",
      message: "Entrada já confirmada.",
      vipEntry: entry,
      ref,
    };
  }
  return {
    outcome: "valid",
    type: "vip",
    message: `${entry.name} · ${entry.people_count} pessoa(s)`,
    vipEntry: entry,
    ref,
    confirm: async () => {
      try {
        const updated = await checkInVipEntry(entry.id);
        return {
          outcome: "valid",
          type: "vip",
          message: "Check-in confirmado!",
          vipEntry: updated,
          ref: updated.name,
        };
      } catch (err) {
        return {
          outcome: "error",
          type: "vip",
          message:
            err instanceof Error ? err.message : "Falha ao confirmar entrada.",
          vipEntry: entry,
          ref,
        };
      }
    },
  };
}

async function validateReservation(
  parsed: ParsedQrPayload,
  partnerId: string | null,
): Promise<ValidationResult> {
  const id = parsed.id ?? parsed.token;
  if (!id) {
    return {
      outcome: "not_found",
      type: "reservation",
      message: "QR de reserva sem identificador.",
    };
  }
  if (!partnerId) {
    return {
      outcome: "error",
      type: "reservation",
      message: "Selecione um estabelecimento.",
    };
  }
  let row: PartnerReservationRow | null = null;
  try {
    row = await getReservation(id, partnerId);
  } catch (err) {
    return {
      outcome: "error",
      type: "reservation",
      message:
        err instanceof Error ? err.message : "Falha ao buscar reserva.",
    };
  }
  if (!row) {
    return {
      outcome: "not_found",
      type: "reservation",
      message: "Reserva não encontrada neste estabelecimento.",
    };
  }
  const ref = row.name ?? row.id.slice(0, 8);
  if (row.status === "cancelled") {
    return {
      outcome: "expired",
      type: "reservation",
      message: "Reserva cancelada.",
      reservation: row,
      ref,
    };
  }
  if (row.status === "no_show") {
    return {
      outcome: "expired",
      type: "reservation",
      message: "Reserva marcada como no-show.",
      reservation: row,
      ref,
    };
  }
  if (row.status === "completed") {
    return {
      outcome: "already_used",
      type: "reservation",
      message: "Reserva já realizada.",
      reservation: row,
      ref,
    };
  }
  return {
    outcome: "valid",
    type: "reservation",
    message: `${ref} · ${row.people_count ?? 1} pessoa(s)`,
    reservation: row,
    ref,
    confirm: async () => {
      try {
        const updated = await completeReservation(row!.id);
        return {
          outcome: "valid",
          type: "reservation",
          message: "Check-in da reserva confirmado!",
          reservation: updated,
          ref: updated.name ?? updated.id.slice(0, 8),
        };
      } catch (err) {
        return {
          outcome: "error",
          type: "reservation",
          message:
            err instanceof Error ? err.message : "Falha ao confirmar reserva.",
          reservation: row,
          ref,
        };
      }
    },
  };
}

const DEV = typeof import.meta !== "undefined" && Boolean(import.meta.env?.DEV);

export async function validateQrCode(
  raw: string,
  partnerId: string | null,
): Promise<ValidationResult & { parsed: ParsedQrPayload }> {
  if (DEV) console.log("[VALIDATOR] raw scan:", raw);
  const parsed = parseQrPayload(raw);
  if (DEV) console.log("[VALIDATOR] parsed payload:", parsed);

  let r: ValidationResult;
  try {
    if (parsed.type === "vip") {
      r = await validateVip(parsed);
    } else if (parsed.type === "reservation") {
      r = await validateReservation(parsed, partnerId);
    } else if (parsed.type === "invite") {
      r = {
        outcome: "unsupported",
        type: "invite",
        message: "Convites ainda não estão disponíveis. Em breve.",
      };
    } else {
      r = {
        outcome: "not_found",
        type: "unknown",
        message: "QR Code não reconhecido.",
      };
    }
  } catch (err) {
    if (DEV) console.error("[VALIDATOR] rpc error:", err);
    r = {
      outcome: "error",
      type: parsed.type,
      message: err instanceof Error ? err.message : "Erro inesperado.",
    };
  }

  if (DEV) console.log("[VALIDATOR] validation result:", r);
  return { ...r, parsed };
}

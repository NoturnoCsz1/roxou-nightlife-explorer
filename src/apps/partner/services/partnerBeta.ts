/**
 * Partner Beta service — Fase 9K
 *
 * - trackBetaEvent: registra métricas de uso (login, criar evento, etc.).
 * - submitBetaFeedback: salva feedback enviado pelo widget.
 */
import { supabase } from "@/integrations/supabase/client";

export type BetaAction =
  | "login"
  | "create_event"
  | "edit_profile"
  | "open_reservations"
  | "open_vip_list"
  | "open_analytics"
  | "open_dashboard"
  | "open_settings"
  | "feedback_sent";

export interface TrackEventInput {
  action: BetaAction;
  page?: string | null;
  partnerId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function trackBetaEvent(input: TrackEventInput): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return;
  try {
    await supabase.from("partner_beta_metrics").insert({
      user_id: userId,
      partner_id: input.partnerId ?? null,
      page: input.page ?? null,
      action: input.action,
      metadata: (input.metadata ?? {}) as never,
    });
  } catch {
    // Falha silenciosa: métricas não devem quebrar o app.
  }
}

export async function submitBetaFeedback(input: {
  message: string;
  page?: string | null;
  partnerId?: string | null;
}): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("Usuário não autenticado.");
  const message = input.message.trim();
  if (!message) throw new Error("Mensagem obrigatória.");
  const { error } = await supabase.from("partner_beta_feedback").insert({
    user_id: userId,
    partner_id: input.partnerId ?? null,
    page: input.page ?? null,
    message,
  });
  if (error) throw error;
  void trackBetaEvent({
    action: "feedback_sent",
    page: input.page,
    partnerId: input.partnerId,
  });
}

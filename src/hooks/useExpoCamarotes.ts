import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CamaroteStatus = "available" | "reserved" | "sold";

export interface Camarote {
  number: number;
  status: CamaroteStatus;
  customer_name: string | null;
  notes: string | null;
  updated_at: string;
}

type Mode = "public" | "admin";

/**
 * Fetch camarotes.
 * - mode="public" (default): reads the curated view `public_expo2026_camarotes`
 *   which exposes only number/status/updated_at (customer_name/notes are
 *   never returned to anon). Uses polling instead of realtime, since Postgres
 *   Changes only work on base tables.
 * - mode="admin": reads the full base table (requires admin RLS) and
 *   subscribes to realtime updates.
 */
export function useExpoCamarotes(mode: Mode = "public") {
  const [camarotes, setCamarotes] = useState<Camarote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      if (mode === "admin") {
        const { data, error } = await supabase
          .from("expo2026_camarotes" as any)
          .select("number,status,customer_name,notes,updated_at")
          .order("number", { ascending: true });
        if (error) throw error;
        setCamarotes((data ?? []) as unknown as Camarote[]);
      } else {
        const { data, error } = await supabase
          .from("public_expo2026_camarotes" as any)
          .select("number,status,updated_at")
          .order("number", { ascending: true });
        if (error) throw error;
        setCamarotes(
          ((data ?? []) as any[]).map((r) => ({
            number: r.number,
            status: r.status,
            customer_name: null,
            notes: null,
            updated_at: r.updated_at,
          })),
        );
      }
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar camarotes");
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    refetch();

    if (mode === "admin") {
      const channel = supabase
        .channel("expo-camarotes-admin")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "expo2026_camarotes" },
          (payload: any) => {
            setCamarotes((prev) => {
              const next = [...prev];
              if (payload.eventType === "DELETE") {
                return next.filter((c) => c.number !== payload.old?.number);
              }
              const row = payload.new as Camarote;
              const idx = next.findIndex((c) => c.number === row.number);
              if (idx >= 0) next[idx] = row;
              else next.push(row);
              return next.sort((a, b) => a.number - b.number);
            });
          },
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }

    // Public mode: poll every 30s (view has no realtime).
    const t = setInterval(refetch, 30_000);
    return () => clearInterval(t);
  }, [refetch, mode]);

  return { camarotes, loading, error, refetch };
}

export const STATUS_LABEL: Record<CamaroteStatus, string> = {
  available: "Disponível",
  reserved: "Reservado",
  sold: "Vendido",
};

export const STATUS_COLOR: Record<CamaroteStatus, string> = {
  available: "bg-emerald-500",
  reserved: "bg-amber-400",
  sold: "bg-rose-500",
};

export const STATUS_TEXT_COLOR: Record<CamaroteStatus, string> = {
  available: "text-emerald-400",
  reserved: "text-amber-300",
  sold: "text-rose-400",
};

export const WHATSAPP_NUMBER = "5518991086855";

export function buildCamaroteWhatsappUrl(number: number) {
  const msg = `Olá! Tenho interesse no camarote ${String(number).padStart(2, "0")} da Expo Prudente 2026. Ele ainda está disponível?`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

export function buildCamaroteGeneralWhatsappUrl() {
  const msg = "Olá! Quero consultar os camarotes disponíveis da Expo Prudente 2026.";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

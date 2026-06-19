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

/**
 * Fetch all 120 camarotes + subscribe to realtime changes.
 * Returns a stable array sorted by number.
 */
export function useExpoCamarotes() {
  const [camarotes, setCamarotes] = useState<Camarote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("expo2026_camarotes" as any)
        .select("number,status,customer_name,notes,updated_at")
        .order("number", { ascending: true });
      if (error) throw error;
      setCamarotes((data ?? []) as unknown as Camarote[]);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar camarotes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
    const channel = supabase
      .channel("expo-camarotes")
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
  }, [refetch]);

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

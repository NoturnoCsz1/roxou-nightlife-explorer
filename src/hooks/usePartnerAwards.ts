import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type PartnerAward = Tables<"partner_awards">;

export type AwardWithPartner = PartnerAward & {
  partner?: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    type: string | null;
    city: string | null;
  } | null;
};

const MONTH_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function formatAwardPeriod(month?: number | null, year?: number | null): string {
  if (!month || !year) return "";
  const m = MONTH_PT[(month - 1) % 12];
  return `${m} ${year}`;
}

/** Active awards for a single partner — used in the partner hero badge. */
export function usePartnerAwards(partnerId?: string | null) {
  const [awards, setAwards] = useState<PartnerAward[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!partnerId) {
      setAwards([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("partner_awards")
      .select("*")
      .eq("partner_id", partnerId)
      .eq("active", true)
      .order("year", { ascending: false, nullsFirst: false })
      .order("month", { ascending: false, nullsFirst: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn("[usePartnerAwards]", error);
          setAwards([]);
        } else {
          setAwards((data || []) as PartnerAward[]);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [partnerId]);

  return { awards, loading };
}

/** Awards for a given type (e.g. "melhor_bar_mes"), most recent first, with partner joined. */
export function useAwardsByType(awardType: string) {
  const [awards, setAwards] = useState<AwardWithPartner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("partner_awards")
      .select("*, partner:partners(id, name, slug, logo_url, type, city)")
      .eq("award_type", awardType)
      .eq("active", true)
      .order("year", { ascending: false, nullsFirst: false })
      .order("month", { ascending: false, nullsFirst: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn("[useAwardsByType]", error);
          setAwards([]);
        } else {
          setAwards((data || []) as AwardWithPartner[]);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [awardType]);

  return { awards, loading };
}

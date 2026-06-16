/**
 * PartnerContextValue + contexto React (Fase 9C).
 * Arquivo separado para satisfazer react-refresh/only-export-components.
 */
import { createContext } from "react";
import type { User } from "@supabase/supabase-js";
import type {
  PartnerAccess,
  PartnerSubscription,
  PartnerSummary,
} from "../services/partnerAuth";
import type { PartnerRole } from "../types";

export interface PartnerContextValue {
  user: User | null;
  partners: PartnerAccess[];
  selectedPartner: PartnerSummary | null;
  selectedPartnerId: string | null;
  role: PartnerRole | null;
  subscription: PartnerSubscription | null;
  isLoading: boolean;
  error: Error | null;
  canEditProfile: boolean;
  canManageEvents: boolean;
  canManageReservations: boolean;
  canViewAnalytics: boolean;
  setSelectedPartnerId: (id: string | null) => void;
  refresh: () => Promise<void>;
}

export const PartnerContext = createContext<PartnerContextValue | null>(null);

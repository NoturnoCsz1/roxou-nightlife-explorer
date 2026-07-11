/**
 * Contrato compartilhado entre `eventoFormActions.ts` e `eventoFormSubmit.ts`.
 *
 * Extraído para um módulo neutro para eliminar o ciclo:
 *   eventoFormSubmit → eventoFormActions (type)
 *   eventoFormActions → eventoFormSubmit (impl)
 *
 * Nenhuma alteração de forma: apenas realocação da interface preservando
 * assinatura idêntica.
 */
import type React from "react";
import type {
  DuplicateCandidate,
  EventoFormState,
  Partner,
} from "@/apps/admin/eventos/form/types";

export interface EventoFormActionDeps {
  id: string | undefined;
  isEdit: boolean;
  cityFilter: string | null;
  navigate: (to: number | string) => void;
  eventouImportId: string | null | undefined;

  form: EventoFormState;
  setForm: React.Dispatch<React.SetStateAction<EventoFormState>>;
  partners: Partner[];

  originalSnapshot: React.MutableRefObject<{
    category: string;
    sub_category: string | null;
    description: string | null;
    venue_name: string | null;
  } | null>;

  duplicateCandidate: DuplicateCandidate;
  allowDuplicate: boolean;
  setDuplicateCandidate: (v: DuplicateCandidate) => void;
  setAllowDuplicate: (v: boolean) => void;
  setManualVenue: (v: boolean) => void;
  setSuggestedPartner: (v: Partner | null) => void;

  setSaving: (v: boolean) => void;
  setGeneratingDesc: (v: boolean) => void;
  setReprocessing: (v: boolean) => void;
  setReprocessingSports: (v: boolean) => void;
  setDeleting: (v: boolean) => void;
  setDeleteOpen: (v: boolean) => void;
}

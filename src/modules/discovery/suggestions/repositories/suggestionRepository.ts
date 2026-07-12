/**
 * SuggestionRepository — implementação in-memory.
 *
 * Sem Supabase. Sem I/O. Serve como contrato e implementação de
 * referência para o Suggestion Engine. Ondas futuras podem prover
 * um adapter persistente respeitando a mesma interface.
 */
import type {
  Suggestion,
  SuggestionKind,
  SuggestionStatus,
} from "../types/suggestion";

export interface SuggestionListFilter {
  kind?: SuggestionKind;
  status?: SuggestionStatus;
  targetId?: string | null;
  source?: Suggestion["source"];
}

export interface SuggestionRepository {
  create(suggestion: Suggestion): Promise<Suggestion>;
  update(id: string, patch: Partial<Suggestion>): Promise<Suggestion | null>;
  getById(id: string): Promise<Suggestion | null>;
  list(filter?: SuggestionListFilter): Promise<Suggestion[]>;
  remove(id: string): Promise<boolean>;
  clear(): Promise<void>;
}

export function createInMemorySuggestionRepository(): SuggestionRepository {
  const store = new Map<string, Suggestion>();

  return {
    async create(suggestion) {
      store.set(suggestion.id, suggestion);
      return suggestion;
    },
    async update(id, patch) {
      const current = store.get(id);
      if (!current) return null;
      // Preserva o discriminante `kind` para manter tipagem consistente.
      const next = { ...current, ...patch, kind: current.kind } as Suggestion;
      store.set(id, next);
      return next;
    },
    async getById(id) {
      return store.get(id) ?? null;
    },
    async list(filter = {}) {
      const rows = Array.from(store.values());
      return rows.filter((r) => {
        if (filter.kind && r.kind !== filter.kind) return false;
        if (filter.status && r.status !== filter.status) return false;
        if (filter.source && r.source !== filter.source) return false;
        if (filter.targetId !== undefined && r.targetId !== filter.targetId) {
          return false;
        }
        return true;
      });
    },
    async remove(id) {
      return store.delete(id);
    },
    async clear() {
      store.clear();
    },
  };
}

/** Instância singleton para uso em ondas futuras / testes. */
export const suggestionRepository: SuggestionRepository =
  createInMemorySuggestionRepository();

/**
 * SuggestionService — orquestra ciclo de vida de sugestões.
 *
 * Regras invioláveis:
 * - Nenhum dado é aplicado automaticamente (approve apenas marca).
 * - Confidence é normalizada em 0–100.
 * - Status inicial é `pending` (salvo override explícito).
 * - Merge NÃO consolida em produção; apenas colapsa duplicatas
 *   equivalentes dentro do próprio Suggestion Engine.
 */
import type {
  SuggestionListFilter,
  SuggestionRepository,
} from "../repositories/suggestionRepository";
import { suggestionRepository as defaultRepo } from "../repositories/suggestionRepository";
import type {
  Suggestion,
  SuggestionGroup,
  SuggestionInput,
  SuggestionKind,
} from "../types/suggestion";

export interface SuggestionServiceDeps {
  repository?: SuggestionRepository;
  now?: () => Date;
  generateId?: () => string;
}

export interface ApproveOptions {
  reviewedBy?: string;
}
export interface RejectOptions {
  reviewedBy?: string;
  reason?: string;
}

function clampConfidence(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 100) return 100;
  return Math.round(v);
}

function defaultId(): string {
  // Determinístico o bastante para in-memory; ondas futuras podem
  // injetar um gerador criptográfico via `generateId`.
  const rand = Math.random().toString(36).slice(2, 10);
  return `sg_${Date.now().toString(36)}_${rand}`;
}

function keyForGroup(s: Suggestion): string {
  return `${s.kind}::${s.targetId ?? ""}::${s.targetSlug ?? ""}`;
}

/** Chave de deduplicação (usada por mergeSuggestions). */
function keyForMerge(s: Suggestion): string {
  const payloadKey = JSON.stringify(s.payload);
  return `${keyForGroup(s)}::${payloadKey}`;
}

export interface SuggestionService {
  createSuggestion<S extends Suggestion>(input: SuggestionInput<S>): Promise<S>;
  approveSuggestion(id: string, options?: ApproveOptions): Promise<Suggestion | null>;
  rejectSuggestion(id: string, options?: RejectOptions): Promise<Suggestion | null>;
  expireSuggestion(id: string): Promise<Suggestion | null>;
  /** Marca como `expired` todas as sugestões pendentes com `expiresAt <= now`. */
  expireDueSuggestions(): Promise<Suggestion[]>;
  groupSuggestions(
    suggestions?: Suggestion[],
    options?: { kind?: SuggestionKind },
  ): Promise<SuggestionGroup[]>;
  /**
   * Colapsa sugestões equivalentes (mesmo kind+target+payload). Mantém a
   * de maior confidence; agrega fontes/rationale em `metadata.mergedFrom`.
   */
  mergeSuggestions(suggestions?: Suggestion[]): Promise<Suggestion[]>;
  list(filter?: SuggestionListFilter): Promise<Suggestion[]>;
}

export function createSuggestionService(
  deps: SuggestionServiceDeps = {},
): SuggestionService {
  const repository = deps.repository ?? defaultRepo;
  const now = deps.now ?? (() => new Date());
  const generateId = deps.generateId ?? defaultId;

  async function updateStatus(
    id: string,
    patch: Partial<Suggestion>,
  ): Promise<Suggestion | null> {
    const nowIso = now().toISOString();
    return repository.update(id, { ...patch, updatedAt: nowIso });
  }

  return {
    async createSuggestion<S extends Suggestion>(input: SuggestionInput<S>): Promise<S> {
      const nowIso = now().toISOString();
      const suggestion = {
        ...(input as unknown as S),
        id: generateId(),
        confidence: clampConfidence(input.confidence),
        status: input.status ?? "pending",
        createdAt: nowIso,
        updatedAt: nowIso,
        reviewedBy: null,
        reviewedAt: null,
      } as S;
      await repository.create(suggestion);
      return suggestion;
    },

    async approveSuggestion(id, options = {}) {
      const nowIso = now().toISOString();
      return updateStatus(id, {
        status: "approved",
        reviewedAt: nowIso,
        reviewedBy: options.reviewedBy ?? null,
      });
    },

    async rejectSuggestion(id, options = {}) {
      const nowIso = now().toISOString();
      const current = await repository.getById(id);
      const metadata = {
        ...(current?.metadata ?? {}),
        ...(options.reason ? { rejectionReason: options.reason } : {}),
      };
      return updateStatus(id, {
        status: "rejected",
        reviewedAt: nowIso,
        reviewedBy: options.reviewedBy ?? null,
        metadata,
      });
    },

    async expireSuggestion(id) {
      return updateStatus(id, { status: "expired" });
    },

    async expireDueSuggestions() {
      const nowMs = now().getTime();
      const rows = await repository.list({ status: "pending" });
      const expired: Suggestion[] = [];
      for (const s of rows) {
        if (!s.expiresAt) continue;
        if (new Date(s.expiresAt).getTime() <= nowMs) {
          const updated = await updateStatus(s.id, { status: "expired" });
          if (updated) expired.push(updated);
        }
      }
      return expired;
    },

    async groupSuggestions(suggestions, options = {}) {
      const rows = suggestions ?? (await repository.list());
      const filtered = options.kind ? rows.filter((s) => s.kind === options.kind) : rows;
      const groups = new Map<string, SuggestionGroup>();
      for (const s of filtered) {
        const key = keyForGroup(s);
        const group = groups.get(key);
        if (group) {
          group.suggestions.push(s);
        } else {
          groups.set(key, {
            key,
            kind: s.kind,
            targetId: s.targetId ?? null,
            suggestions: [s],
          });
        }
      }
      return Array.from(groups.values());
    },

    async mergeSuggestions(suggestions) {
      const rows = suggestions ?? (await repository.list());
      const byKey = new Map<string, Suggestion>();
      for (const s of rows) {
        const key = keyForMerge(s);
        const current = byKey.get(key);
        if (!current) {
          byKey.set(key, s);
          continue;
        }
        const winner = s.confidence > current.confidence ? s : current;
        const loser = winner === s ? current : s;
        const mergedFrom = [
          ...((winner.metadata?.mergedFrom as unknown[]) ?? []),
          {
            id: loser.id,
            source: loser.source,
            confidence: loser.confidence,
            rationale: loser.rationale ?? null,
          },
        ];
        byKey.set(key, {
          ...winner,
          metadata: { ...(winner.metadata ?? {}), mergedFrom },
        });
      }
      return Array.from(byKey.values());
    },

    async list(filter) {
      return repository.list(filter);
    },
  };
}

/** Instância singleton default (repositório in-memory). */
export const suggestionService: SuggestionService = createSuggestionService();

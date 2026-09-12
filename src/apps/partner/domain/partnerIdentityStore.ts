/**
 * PartnerIdentityStore — cache único da identidade do Partner Pro.
 *
 * Antes desta camada, três consumidores independentes
 * (`usePartnerSession`, `usePartnerBetaAccess` e `PartnerProvider`)
 * chamavam `auth.getUser()` + `fetchOfficialMemberships()` cada um por
 * conta própria, e todos refaziam a consulta a cada evento de
 * `onAuthStateChange` (inclusive TOKEN_REFRESHED), disparando o loader
 * global do painel durante a navegação.
 *
 * Aqui a identidade (usuário + memberships + venues) é resolvida UMA vez
 * por sessão, com deduplicação de chamadas concorrentes e invalidação
 * apenas quando o usuário autenticado realmente muda.
 *
 * Não altera regras de autorização: o conteúdo continua vindo do backend
 * oficial sob RLS. Só evita repetir a mesma consulta.
 */
import {
  partnerBackendIsDedicated,
  partnerSupabase,
} from "../backend/partnerSupabase";
import {
  buildPartnerSession,
  type PartnerSession,
  type RawMembershipRow,
} from "./partnerSession";
import {
  fetchLegacyBinding,
  fetchOfficialMemberships,
} from "./partnerSessionGateway";

export interface PartnerIdentity {
  userId: string | null;
  email: string | null;
  memberships: RawMembershipRow[];
  /** Erro real da consulta de memberships (não é tratado como "sem acesso"). */
  error: Error | null;
}

const EMPTY_IDENTITY: PartnerIdentity = {
  userId: null,
  email: null,
  memberships: [],
  error: null,
};

let cache: PartnerIdentity | null = null;
let inFlight: Promise<PartnerIdentity> | null = null;
let listenerAttached = false;
let knownUserId: string | null | undefined = undefined;
const subscribers = new Set<() => void>();

function notify() {
  for (const fn of subscribers) fn();
}

function ensureAuthListener() {
  if (listenerAttached) return;
  listenerAttached = true;
  partnerSupabase.auth.onAuthStateChange((event, session) => {
    // Renovação de token não muda identidade — ignorar evita refetch/loader.
    if (event === "TOKEN_REFRESHED") return;
    const uid = session?.user?.id ?? null;
    if (knownUserId === undefined) {
      knownUserId = uid;
      return;
    }
    if (uid === knownUserId) return;
    knownUserId = uid;
    cache = null;
    inFlight = null;
    notify();
  });
}

/** Identidade já resolvida, sem disparar rede. */
export function getCachedPartnerIdentity(): PartnerIdentity | null {
  return cache;
}

export function invalidatePartnerIdentity() {
  cache = null;
  inFlight = null;
}

export function subscribePartnerIdentity(fn: () => void): () => void {
  ensureAuthListener();
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

export async function loadPartnerIdentity(options?: {
  force?: boolean;
}): Promise<PartnerIdentity> {
  ensureAuthListener();
  if (!options?.force) {
    if (cache) return cache;
    if (inFlight) return inFlight;
  }

  const request = (async (): Promise<PartnerIdentity> => {
    const { data } = await partnerSupabase.auth.getUser();
    const user = data?.user ?? null;
    knownUserId = user?.id ?? null;

    if (!user) {
      cache = EMPTY_IDENTITY;
      return cache;
    }

    let memberships: RawMembershipRow[] = [];
    let error: Error | null = null;
    if (partnerBackendIsDedicated) {
      try {
        memberships = await fetchOfficialMemberships(user.id);
      } catch (err) {
        error = err instanceof Error ? err : new Error(String(err));
      }
    }

    cache = {
      userId: user.id,
      email: user.email ?? null,
      memberships,
      error,
    };
    return cache;
  })();

  inFlight = request;
  try {
    return await request;
  } finally {
    if (inFlight === request) inFlight = null;
  }
}

export interface ResolveCachedSessionOptions {
  preferredOrganizationId?: string | null;
  preferredVenueId?: string | null;
  force?: boolean;
}

/** PartnerSession completa a partir da identidade em cache. */
export async function resolvePartnerSessionCached(
  options: ResolveCachedSessionOptions = {},
): Promise<PartnerSession> {
  const identity = await loadPartnerIdentity({ force: options.force });
  if (!identity.userId) {
    return buildPartnerSession({ userId: null, memberships: [] });
  }

  // Vínculo legado só existe quando o Partner ainda compartilha o backend
  // antigo. No backend oficial a tabela nem existe — não consultar.
  const legacy = partnerBackendIsDedicated
    ? null
    : await fetchLegacyBinding(identity.userId);

  return buildPartnerSession({
    userId: identity.userId,
    memberships: identity.memberships,
    legacy,
    preferredOrganizationId: options.preferredOrganizationId ?? null,
    preferredVenueId: options.preferredVenueId ?? null,
  });
}

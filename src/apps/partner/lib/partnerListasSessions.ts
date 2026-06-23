/**
 * partnerListasSessions — wrapper para sessões operacionais de Listas VIP.
 * Reutiliza partnerSessions com namespace "<partnerId>::listas" para não
 * misturar com a operação de Reservas.
 */
import {
  closeSession as baseClose,
  getCurrentSession as baseGet,
  getSessionHistory as baseHistory,
  isSessionOpen as baseIsOpen,
  openSession as baseOpen,
  reopenSession as baseReopen,
  type PartnerSession,
} from "./partnerSessions";

const ns = (partnerId: string) => `${partnerId}::listas`;

export type { PartnerSession };

export const getCurrentListasSession = (p: string) => baseGet(ns(p));
export const getListasSessionHistory = (p: string) => baseHistory(ns(p));
export const isListasSessionOpen = (p: string) => baseIsOpen(ns(p));
export const openListasSession = (p: string) => baseOpen(ns(p));
export const closeListasSession = (p: string) => baseClose(ns(p));
export const reopenListasSession = (p: string, id: string) =>
  baseReopen(ns(p), id);

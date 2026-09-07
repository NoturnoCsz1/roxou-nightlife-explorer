/**
 * Superfície pública da camada de domínio do Partner Pro (Fase 2).
 * Módulos convertidos nas próximas fases devem importar daqui.
 */
export * from "./roles";
export * from "./partnerSession";
export { resolvePartnerSession } from "./partnerSessionGateway";

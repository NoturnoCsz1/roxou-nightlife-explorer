/**
 * Barril dos módulos CONVERTIDOS do Partner Pro (Fase 3).
 *
 * Reservas, VIP, Validador e Promotores sobre a tenancy oficial
 * (organizations → venues), consumindo exclusivamente `partnerSupabase`.
 */
export * from "./client";
export * from "./tenancy";
export * as reservationsOfficial from "@modules/partner/reservations/converged/reservationsOfficialService";
export * as vipOfficial from "@modules/partner/vip/converged/vipOfficialService";
export * as promotersOfficial from "@modules/partner/vip/converged/promotersOfficialService";
export * as validatorOfficial from "@modules/partner/validator/converged/validatorOfficialService";

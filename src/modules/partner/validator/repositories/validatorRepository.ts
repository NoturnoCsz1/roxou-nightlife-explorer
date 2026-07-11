/**
 * Repository do Validador QR (Partner Pro) — Onda 4.
 *
 * O validador não acessa uma tabela própria — orquestra chamadas a
 * `vipRepository` e `reservationsRepository`. Este barrel expõe as
 * funções puras (parse + validateQrCode) enquanto a orquestração
 * completa (uma fina camada de service) fica no arquivo do service.
 */
export {
  parseQrPayload,
  validateQrCode,
} from "@modules/partner/validator/services/validatorService";

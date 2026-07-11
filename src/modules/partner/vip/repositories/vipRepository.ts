/**
 * Repository de Lista VIP (Partner Pro) — Onda 4.
 * Ponto de entrada para acesso a dados de listas VIP e promoters.
 */
export {
  // Lists
  listVipLists,
  getVipList,
  createVipList,
  updateVipList,
  openVipList,
  closeVipList,
  archiveVipList,
  setVipListPublicEnabled,
  // Entries
  listVipEntries,
  addVipEntry,
  updateVipEntry,
  checkInVipEntry,
  cancelVipEntry,
  noShowVipEntry,
  markNoShowVipEntry,
  getVipEntryByToken,
} from "@modules/partner/vip/services/vipService";

export {
  listPromoters,
  createPromoter,
  updatePromoter,
  deactivatePromoter,
} from "@modules/partner/vip/services/promotersService";

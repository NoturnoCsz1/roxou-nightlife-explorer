/**
 * services/adminAuth.ts — re-export do helper de headers admin.
 * Mantido aqui para futuros services que precisem chamar Edge Functions
 * protegidas por `requireAdmin`.
 */
export { getAdminAuthHeaders, AdminSessionExpiredError } from "@/lib/adminFetch";

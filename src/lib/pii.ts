/**
 * PII helpers — mascaramento padrão para listagens.
 * Não revela dado completo; use RPC `crm_reveal_customer_field` para isso.
 */

export function normalizePhoneBR(phone?: string | null): string | null {
  if (!phone) return null;
  let d = phone.replace(/\D/g, "").replace(/^0+/, "");
  if (!d) return null;
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return d;
}

export function maskPhone(phone?: string | null): string {
  if (!phone) return "—";
  const d = phone.replace(/\D/g, "");
  if (d.length < 4) return "•••";
  const last = d.slice(-2);
  const first = d.slice(0, 2);
  return `+${first} •••• ${last}`;
}

export function maskEmail(email?: string | null): string {
  if (!email) return "—";
  const [u, h] = email.split("@");
  if (!h) return "•••";
  const head = u.slice(0, 2);
  return `${head}${"•".repeat(Math.max(1, u.length - 2))}@${h}`;
}

export function maskCpf(cpf?: string | null): string {
  if (!cpf) return "—";
  const d = cpf.replace(/\D/g, "");
  if (d.length < 4) return "•••";
  return `•••.•••.${d.slice(-5, -2)}-${d.slice(-2)}`;
}

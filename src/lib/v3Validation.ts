import { z } from "zod";

export const profileSchema = z.object({
  display_name: z.string().trim().min(2, "Mínimo 2 caracteres").max(80, "Máximo 80 caracteres"),
  nickname: z.string().trim().min(2, "Mínimo 2 caracteres").max(30, "Máximo 30 caracteres")
    .regex(/^[a-zA-Z0-9._-]+$/, "Use apenas letras, números, . _ ou -")
    .optional()
    .or(z.literal("")),
  whatsapp: z.string().trim().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, "Formato: (XX) XXXXX-XXXX")
    .optional()
    .or(z.literal("")),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

/** Aplica máscara BR (XX) XXXXX-XXXX progressivamente. */
export function maskWhatsappBR(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

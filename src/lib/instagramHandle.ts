/**
 * Normalização e validação de handle do Instagram.
 * Aceita: @usuario, usuario, https://www.instagram.com/usuario/, instagram.com/usuario?igsh=...
 * Retorna sempre o handle limpo (sem @, sem URL, sem barras, sem query).
 */

const INSTAGRAM_HOST_REGEX = /^(https?:\/\/)?(www\.)?instagram\.com\//i;

export function normalizeInstagramHandle(input: string | null | undefined): string {
  if (!input) return "";
  let s = String(input).trim();
  if (!s) return "";

  // Remove URL do Instagram (qualquer protocolo/www)
  s = s.replace(INSTAGRAM_HOST_REGEX, "");
  // Remove protocolo solto
  s = s.replace(/^https?:\/\//i, "");
  s = s.replace(/^www\./i, "");
  // Remove leading @
  s = s.replace(/^@+/, "");
  // Pega só o segmento antes de "/" (ignora /reels, /p/...)
  s = s.split("/")[0];
  // Remove query string
  s = s.split("?")[0];
  // Remove fragment
  s = s.split("#")[0];
  // Trim espaços
  s = s.trim();
  // Lowercase (handles IG são case-insensitive)
  s = s.toLowerCase();
  return s;
}

export interface InstagramValidationResult {
  ok: boolean;
  handle: string;
  error?: string;
}

/**
 * Valida handle do Instagram.
 * - 2 a 30 caracteres
 * - letras, números, ponto e underline
 * - se input parecia ser link, precisa ser do instagram.com
 */
export function validateInstagramHandle(input: string | null | undefined): InstagramValidationResult {
  const raw = (input || "").trim();
  if (!raw) return { ok: true, handle: "" }; // vazio é permitido (campo opcional)

  // Se parece URL e NÃO é instagram.com, rejeita
  if (/^https?:\/\//i.test(raw) || /\.[a-z]{2,}\//i.test(raw)) {
    if (!INSTAGRAM_HOST_REGEX.test(raw) && !/^(www\.)?instagram\.com\//i.test(raw)) {
      return { ok: false, handle: "", error: "Informe um @ do Instagram ou link válido do perfil." };
    }
  }

  const handle = normalizeInstagramHandle(raw);
  if (handle.length < 2 || handle.length > 30) {
    return { ok: false, handle, error: "Informe um @ do Instagram ou link válido do perfil." };
  }
  if (!/^[a-z0-9._]+$/.test(handle)) {
    return { ok: false, handle, error: "Informe um @ do Instagram ou link válido do perfil." };
  }
  return { ok: true, handle };
}

export function formatInstagramDisplay(handle: string | null | undefined): string {
  const h = normalizeInstagramHandle(handle);
  return h ? `@${h}` : "";
}

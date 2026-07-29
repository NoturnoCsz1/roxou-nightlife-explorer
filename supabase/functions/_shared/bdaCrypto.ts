/**
 * Utilitários de segurança do módulo Batalha de Aura (BDA).
 * Usados apenas em Edge Functions (server-side). Nenhum segredo vai ao frontend.
 */

const enc = new TextEncoder();

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashWithSalt(value: string, salt: string): Promise<string> {
  return sha256Hex(`${salt}::${value.trim().toLowerCase()}`);
}

async function aesKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("BDA_CPF_KEY");
  if (!secret) throw new Error("BDA_CPF_KEY não configurado");
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const clean = hex.startsWith("\\x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
}

/** Retorna string no formato hex do Postgres (`\x...`) pronta para coluna bytea. */
export async function encryptSensitive(plain: string): Promise<string> {
  const key = await aesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plain)),
  );
  const packed = new Uint8Array(iv.length + cipher.length);
  packed.set(iv, 0);
  packed.set(cipher, iv.length);
  return `\\x${toHex(packed)}`;
}

export async function decryptSensitive(hexValue: string): Promise<string> {
  const key = await aesKey();
  const packed = fromHex(hexValue);
  const iv = packed.slice(0, 12);
  const cipher = packed.slice(12);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return new TextDecoder().decode(plain);
}

/** Validação oficial de CPF (dígitos verificadores). */
export function isValidCpf(raw: string): boolean {
  const cpf = (raw || "").replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === parseInt(cpf[10]);
}

export function maskCpf(raw: string): string {
  const cpf = (raw || "").replace(/\D/g, "");
  if (cpf.length !== 11) return "***.***.***-**";
  return `***.***.${cpf.slice(6, 9)}-**`;
}

export function ageFromBirthDate(birthDate: string): number {
  const b = new Date(`${birthDate}T00:00:00-03:00`);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export function sanitizeText(value: unknown, max = 200): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}

/** Gera token forte de uso único e o hash para armazenamento. */
export async function createOpaqueToken(): Promise<{ token: string; hash: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = toHex(bytes);
  const salt = Deno.env.get("BDA_TOKEN_SALT") ?? "";
  const hash = await sha256Hex(`${salt}::${token}`);
  return { token, hash };
}

export async function hashToken(token: string): Promise<string> {
  const salt = Deno.env.get("BDA_TOKEN_SALT") ?? "";
  return sha256Hex(`${salt}::${token}`);
}

/** Decodifica data URL de imagem validando MIME real permitido. */
export function decodeImage(
  dataUrl: string,
  maxBytes = 3_000_000,
): { bytes: Uint8Array; contentType: string } | null {
  const match = /^data:(image\/(jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || "");
  if (!match) return null;
  const contentType = match[1];
  const binary = atob(match[3]);
  if (binary.length > maxBytes) return null;
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  // Verificação de magic bytes (MIME real)
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e;
  const isWebp =
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (!(isJpeg || isPng || isWebp)) return null;
  return { bytes, contentType };
}

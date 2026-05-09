// Strong validation helpers for driver registration

export function validateCPF(cpf: string): boolean {
  const c = cpf.replace(/\D/g, "");
  if (c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(c[i]) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(c[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === parseInt(c[10]);
}

export function maskCPF(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function maskCPFForDisplay(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.***.***-${d.slice(9)}`;
}

export function maskPhoneBR(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function validatePhoneBR(phone: string): boolean {
  const d = phone.replace(/\D/g, "");
  if (d.length < 10 || d.length > 11) return false;
  if (/^(\d)\1+$/.test(d)) return false;
  // DDD must be 11-99
  const ddd = parseInt(d.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  return true;
}

const PLATE_OLD = /^[A-Z]{3}-?\d{4}$/;
const PLATE_MERCOSUL = /^[A-Z]{3}\d[A-Z]\d{2}$/;

export function validatePlate(plate: string): boolean {
  const p = plate.replace(/\s/g, "").toUpperCase();
  if (p.length < 7 || p.length > 8) return false;
  return PLATE_OLD.test(p) || PLATE_MERCOSUL.test(p);
}

export function normalizePlate(plate: string): string {
  return plate.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 7);
}

const FAKE_NAME_TOKENS = ["teste", "test", "aaaa", "xxx", "asdf", "qwer", "1234", "abcd", "fulano", "sicrano"];

export function validateFullName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 6) return false;
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return false;
  const lower = trimmed.toLowerCase();
  if (FAKE_NAME_TOKENS.some((t) => lower.includes(t))) return false;
  if (!/[a-zA-ZÀ-ÿ]/.test(trimmed)) return false;
  return true;
}

const GENERIC_MODELS = ["carro", "teste", "test", "aaa", "xxx", "moto", "veiculo", "veículo", "1234"];

export function validateVehicleModel(model: string): boolean {
  const t = model.trim();
  if (t.length < 3) return false;
  const lower = t.toLowerCase();
  if (GENERIC_MODELS.includes(lower)) return false;
  return /[a-zA-ZÀ-ÿ]/.test(t);
}

export function validateNonEmpty(v: string, min = 2): boolean {
  return v.trim().length >= min;
}

export type ImageValidationError = "type" | "size" | "empty" | null;

export function validateImageFile(file: File): ImageValidationError {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!file || file.size === 0) return "empty";
  if (!allowed.includes(file.type)) return "type";
  if (file.size > 8 * 1024 * 1024) return "size";
  return null;
}

export interface DriverPayload {
  full_name: string;
  cpf: string;
  whatsapp: string;
  city: string;
  vehicle_model: string;
  vehicle_color: string;
  vehicle_plate: string;
  vehicle_type: string;
  face_photo_url?: string | null;
  vehicle_photo_url?: string | null;
  plate_photo_url?: string | null;
}

export function validateDriverRegistrationPayload(p: DriverPayload): string[] {
  const errs: string[] = [];
  if (!validateFullName(p.full_name)) errs.push("Nome completo inválido.");
  if (!validateCPF(p.cpf)) errs.push("CPF inválido.");
  if (!validatePhoneBR(p.whatsapp)) errs.push("Telefone/WhatsApp inválido.");
  if (!validateNonEmpty(p.city)) errs.push("Cidade obrigatória.");
  if (!validateVehicleModel(p.vehicle_model)) errs.push("Modelo do veículo inválido.");
  if (!validateNonEmpty(p.vehicle_color)) errs.push("Cor do veículo obrigatória.");
  if (!validatePlate(p.vehicle_plate)) errs.push("Placa do veículo inválida.");
  if (!validateNonEmpty(p.vehicle_type)) errs.push("Tipo do veículo obrigatório.");
  if (!p.face_photo_url) errs.push("Selfie obrigatória.");
  if (!p.vehicle_photo_url) errs.push("Foto do veículo obrigatória.");
  if (!p.plate_photo_url) errs.push("Foto da placa obrigatória.");
  return errs;
}

/**
 * PartnerRequestAccessPage — Formulário público de solicitação de acesso ao Partner Pro.
 *
 * Persiste em `partner_pro_requests` (anon INSERT permitido).
 * Normalização e validação client-side espelham as triggers do banco.
 * NÃO usar .select() após .insert() — RLS de SELECT exige is_admin().
 */
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const WHATSAPP_URL =
  "https://wa.me/5518997469865?text=" +
  encodeURIComponent("Olá! Quero solicitar acesso ao Roxou Partner Pro.");

const CATEGORIES = [
  "Excursão",
  "Casa Noturna",
  "Evento",
  "Bar",
  "Restaurante",
  "Outro",
];

type FormState = {
  estabelecimento: string;
  responsavel: string;
  whatsapp: string;
  instagram: string;
  cidade: string;
  categoria: string;
  mensagem: string;
};

const initial: FormState = {
  estabelecimento: "",
  responsavel: "",
  whatsapp: "",
  instagram: "",
  cidade: "",
  categoria: CATEGORIES[0],
  mensagem: "",
};

function normalizePhone(raw: string): string | null {
  let d = (raw || "").replace(/\D/g, "").replace(/^0+/, "");
  if (!d) return null;
  if (d.length === 10 || d.length === 11) d = "55" + d;
  if (d.length < 12 || d.length > 13) return null;
  return d;
}

function formatPhoneVisual(raw: string): string {
  const d = (raw || "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function normalizeInstagram(raw: string): string {
  let s = (raw || "").trim().toLowerCase();
  s = s.replace(/^(https?:\/\/)?(www\.)?instagram\.com\//, "");
  s = s.replace(/^@+/, "");
  s = s.split("/")[0].split("?")[0].split("#")[0];
  return s;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const PartnerRequestAccessPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initial);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (k: keyof FormState, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const phoneNormalized = useMemo(() => normalizePhone(form.whatsapp), [form.whatsapp]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const estabelecimento = form.estabelecimento.trim();
    const responsavel = form.responsavel.trim();
    const cidade = form.cidade.trim();

    if (estabelecimento.length < 3) return toast.error("Nome do estabelecimento muito curto.");
    if (responsavel.length < 3) return toast.error("Informe o nome do responsável.");
    if (!phoneNormalized) return toast.error("WhatsApp inválido. Use DDD + número.");
    if (cidade && cidade.length < 3) return toast.error("Cidade muito curta.");
    if (!form.categoria) return toast.error("Escolha uma categoria.");

    const instaNorm = normalizeInstagram(form.instagram);
    setLoading(true);
    try {
      const hash = await sha256Hex(phoneNormalized);

      // Dedupe via RPC pública (não dá pra SELECT direto por causa de RLS)
      const { data: dup } = await supabase.rpc("partner_pro_request_exists_for_phone", {
        _phone_hash: hash,
      });
      if (dup === true) {
        toast.message("Já recebemos uma solicitação com este WhatsApp.", {
          description: "Nossa equipe entrará em contato.",
        });
        setSubmitted(true);
        return;
      }

      const payload = {
        estabelecimento,
        responsavel,
        whatsapp: formatPhoneVisual(form.whatsapp),
        instagram: instaNorm ? `@${instaNorm}` : null,
        cidade: cidade || null,
        categoria: form.categoria,
        mensagem: form.mensagem.trim() || null,
        user_agent:
          typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 280) : null,
        source: "public_form",
        status: "pending" as const,
      };

      const { error } = await supabase.from("partner_pro_requests").insert(payload);
      if (error) {
        toast.error(`Não foi possível enviar: ${error.message}`);
        return;
      }
      toast.success("Solicitação enviada!");
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-8 bg-background">
        <div className="w-full max-w-md text-center space-y-4 rounded-2xl border border-border/40 bg-card/60 p-6">
          <h1 className="text-xl font-display font-bold text-primary">Solicitação recebida!</h1>
          <p className="text-sm text-muted-foreground">
            Em breve a equipe Roxou entrará em contato pelo WhatsApp informado.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="w-full h-11 inline-flex items-center justify-center rounded-md bg-emerald-500 text-white font-semibold"
            >
              Falar agora no WhatsApp
            </a>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="w-full h-11 rounded-md border border-border text-sm"
            >
              Voltar ao login
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-6 bg-background">
      <div className="w-full max-w-md space-y-4">
        <header className="text-center space-y-1">
          <h1 className="text-2xl font-display font-black text-primary tracking-tight">
            Solicitar acesso ao Roxou Partner Pro
          </h1>
          <p className="text-sm text-muted-foreground leading-snug">
            Conte sobre seu negócio. Nossa equipe entrará em contato pelo WhatsApp.
          </p>
        </header>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-border/40 bg-card/60 p-5 space-y-3"
        >
          <Field label="Nome do estabelecimento *" value={form.estabelecimento} onChange={(v) => update("estabelecimento", v)} />
          <Field label="Nome do responsável *" value={form.responsavel} onChange={(v) => update("responsavel", v)} />
          <Field
            label="WhatsApp *"
            value={form.whatsapp}
            onChange={(v) => update("whatsapp", formatPhoneVisual(v))}
            placeholder="(18) 99876-5432"
            inputMode="tel"
          />
          <Field label="Instagram" value={form.instagram} onChange={(v) => update("instagram", v)} placeholder="@seuperfil" />
          <Field label="Cidade" value={form.cidade} onChange={(v) => update("cidade", v)} placeholder="Presidente Prudente" />

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Categoria *</label>
            <select
              value={form.categoria}
              onChange={(e) => update("categoria", e.target.value)}
              className="w-full h-11 px-3 rounded-md border border-border bg-background text-foreground"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Mensagem (opcional)</label>
            <textarea
              value={form.mensagem}
              onChange={(e) => update("mensagem", e.target.value)}
              rows={3}
              placeholder="Conte mais sobre seu negócio..."
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-md bg-primary text-primary-foreground font-semibold disabled:opacity-60"
          >
            {loading ? "Enviando..." : "Enviar solicitação"}
          </button>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="w-full h-11 inline-flex items-center justify-center rounded-md border border-border text-sm"
          >
            Preferir WhatsApp direto
          </a>

          <div className="text-center pt-1">
            <Link to="/login" className="text-[11px] text-muted-foreground underline">
              Voltar ao login
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
};

const Field = ({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-muted-foreground">{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      className="w-full h-11 px-3 rounded-md border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/40"
    />
  </div>
);

export default PartnerRequestAccessPage;

/**
 * PartnerRequestAccessPage — Formulário público de solicitação de acesso ao Partner Pro.
 *
 * Persiste em `partner_pro_requests` (anon INSERT permitido). Admin aprova
 * via /admin/partner-access-requests aba "Prospects".
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const WHATSAPP_URL =
  "https://wa.me/5518997469865?text=" +
  encodeURIComponent("Olá! Quero solicitar acesso ao Roxou Partner Pro.");

const CATEGORIES = [
  "Bar",
  "Restaurante",
  "Evento",
  "Casa Noturna",
  "Excursão",
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

const PartnerRequestAccessPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initial);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (k: keyof FormState, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.estabelecimento.trim() ||
      !form.responsavel.trim() ||
      !form.whatsapp.trim()
    ) {
      toast.error("Preencha estabelecimento, responsável e WhatsApp.");
      return;
    }
    setLoading(true);

    const payload = {
      estabelecimento: form.estabelecimento.trim(),
      responsavel: form.responsavel.trim(),
      whatsapp: form.whatsapp.trim(),
      instagram: form.instagram.trim() || null,
      cidade: form.cidade.trim() || null,
      categoria: form.categoria,
      mensagem: form.mensagem.trim() || null,
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 280) : null,
      source: "public_form",
      status: "pending" as const,
    };

    // eslint-disable-next-line no-console
    console.log("[partner-pro-request] FORM STATE", form);
    // eslint-disable-next-line no-console
    console.log("[partner-pro-request] REQUEST PAYLOAD", payload);

    try {
      // IMPORTANT: não usar .select() aqui — a policy de SELECT exige is_admin()
      // e o `Prefer: return=representation` faria o INSERT inteiro ser revertido
      // para usuários anônimos (RLS error 42501).
      const { error } = await supabase
        .from("partner_pro_requests")
        .insert(payload);

      // eslint-disable-next-line no-console
      console.log("[partner-pro-request] SUPABASE RESPONSE", { error });

      if (error) {
        // eslint-disable-next-line no-console
        console.error("[partner-pro-request] SUPABASE ERROR", error);
        toast.error(`Não foi possível enviar: ${error.message}`);
        return;
      }

      toast.success("Solicitação enviada! Entraremos em contato em breve.");
      setSubmitted(true);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[partner-pro-request] EXCEPTION", err);
      toast.error(
        err instanceof Error
          ? `Erro: ${err.message}`
          : "Erro inesperado ao enviar solicitação.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-8 bg-background">
        <div className="w-full max-w-md text-center space-y-4 rounded-2xl border border-border/40 bg-card/60 p-6">
          <h1 className="text-xl font-display font-bold text-primary">
            Solicitação registrada
          </h1>
          <p className="text-sm text-muted-foreground">
            A equipe Roxou entrará em contato em breve pelo WhatsApp informado.
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
            Solicitar acesso
          </h1>
          <p className="text-sm text-muted-foreground leading-snug">
            Conte um pouco sobre o seu estabelecimento. Entraremos em contato pelo WhatsApp.
          </p>
        </header>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-border/40 bg-card/60 p-5 space-y-3"
        >
          <Field label="Nome do estabelecimento" value={form.estabelecimento} onChange={(v) => update("estabelecimento", v)} required />
          <Field label="Nome do responsável" value={form.responsavel} onChange={(v) => update("responsavel", v)} required />
          <Field label="WhatsApp" value={form.whatsapp} onChange={(v) => update("whatsapp", v)} required placeholder="(00) 00000-0000" />
          <Field label="Instagram" value={form.instagram} onChange={(v) => update("instagram", v)} placeholder="@seuperfil" />
          <Field label="Cidade" value={form.cidade} onChange={(v) => update("cidade", v)} />

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Categoria</label>
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
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-muted-foreground">{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      placeholder={placeholder}
      className="w-full h-11 px-3 rounded-md border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/40"
    />
  </div>
);

export default PartnerRequestAccessPage;

/**
 * PartnerRequestAccessPage — Formulário leve de solicitação de acesso.
 *
 * Não toca backend: persiste em localStorage e mostra tela de sucesso.
 * Fallback de contato direto via WhatsApp também disponível.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const STORAGE_KEY = "roxou:partner:access-requests";
const WHATSAPP_URL =
  "https://wa.me/5518997469865?text=" +
  encodeURIComponent(
    "Olá! Quero solicitar acesso ao Roxou Partner Pro.",
  );

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
};

const initial: FormState = {
  estabelecimento: "",
  responsavel: "",
  whatsapp: "",
  instagram: "",
  cidade: "",
  categoria: CATEGORIES[0],
};

const PartnerRequestAccessPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initial);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (k: keyof FormState, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.estabelecimento.trim() || !form.responsavel.trim() || !form.whatsapp.trim()) {
      toast.error("Preencha estabelecimento, responsável e WhatsApp.");
      return;
    }
    setLoading(true);
    try {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      list.push({ ...form, createdAt: new Date().toISOString() });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      setSubmitted(true);
    } catch {
      toast.error("Não foi possível salvar localmente. Tente o WhatsApp.");
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

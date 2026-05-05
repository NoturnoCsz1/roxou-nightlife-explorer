import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, User, MessageSquare, Send, ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SEO from "@/components/SEO";

const CONTACT_TYPES = [
  "Dúvidas sobre o evento",
  "Proposta comercial",
  "Patrocínio",
  "Imprensa",
  "Trabalhe com a gente",
  "Outro",
];

export default function Expo2026Contato() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    contact_type: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const update = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    if (!form.name.trim()) return "Informe seu nome completo.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "E-mail inválido.";
    if (!form.phone.trim()) return "Informe um telefone/WhatsApp.";
    if (!form.contact_type) return "Selecione o tipo de contato.";
    if (!form.subject.trim()) return "Informe o assunto.";
    if (form.message.trim().length < 10) return "A mensagem deve ter ao menos 10 caracteres.";
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        contact_type: form.contact_type,
        subject: form.subject.trim(),
        message: form.message.trim(),
      };

      const { error: dbError } = await supabase.from("expo2026_contacts").insert(payload);
      if (dbError) throw dbError;

      const { error: fnError } = await supabase.functions.invoke("send-expo-contact", {
        body: payload,
      });
      if (fnError) console.error("E-mail falhou (lead salvo):", fnError);

      setSuccess(true);
      setForm({ name: "", email: "", phone: "", contact_type: "", subject: "", message: "" });
      toast.success("Mensagem enviada com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível enviar sua mensagem. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition";

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <SEO
        title="Contato Expo Prudente 2026 | Roxou"
        description="Entre em contato com a equipe da Expo Prudente 2026 para dúvidas, propostas comerciais, patrocínio e imprensa."
        keywords="Expo Prudente 2026, contato Expo Prudente, patrocínio Expo Prudente, eventos Presidente Prudente, Roxou"
      />

      {/* glow background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-purple-700/20 blur-[120px]" />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full bg-fuchsia-600/15 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/expo2026" className="flex items-center gap-2 text-white/70 hover:text-white transition text-sm">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <Link to="/expo2026" className="font-bold tracking-tight bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
            EXPO PRUDENTE 2026
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-medium mb-5">
            <Sparkles className="w-3.5 h-3.5" /> Atendimento oficial Roxou
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
            <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
              CONTATO
            </span>
            <span className="block text-white/90 text-xl sm:text-2xl mt-2 font-bold">
              EXPO PRUDENTE 2026
            </span>
          </h1>
          <p className="text-white/60 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Fale com a equipe da Expo Prudente 2026 para dúvidas, propostas comerciais, imprensa, parcerias ou informações sobre o evento.
          </p>

          <a
            href="mailto:contato@roxou.com.br"
            className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600/20 to-fuchsia-600/20 border border-purple-500/40 text-purple-200 hover:border-purple-400 hover:text-white transition shadow-[0_0_30px_rgba(124,58,237,0.25)]"
          >
            <Mail className="w-4 h-4" /> contato@roxou.com.br
          </a>
        </div>

        {/* Form card */}
        {success ? (
          <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-purple-500/30 p-8 sm:p-12 text-center shadow-[0_0_60px_rgba(124,58,237,0.2)]">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-400 mb-4" />
            <h2 className="text-2xl font-bold mb-3">Mensagem enviada com sucesso!</h2>
            <p className="text-white/70 mb-6">Em breve nossa equipe entrará em contato.</p>
            <button
              onClick={() => setSuccess(false)}
              className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm"
            >
              Enviar nova mensagem
            </button>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 sm:p-10 shadow-[0_0_60px_rgba(124,58,237,0.15)] space-y-5"
          >
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wider">
                <User className="w-3 h-3 inline mr-1.5" /> Nome completo
              </label>
              <input
                className={inputCls}
                placeholder="Seu nome"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                disabled={loading}
                maxLength={120}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wider">
                  <Mail className="w-3 h-3 inline mr-1.5" /> E-mail
                </label>
                <input
                  type="email"
                  className={inputCls}
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  disabled={loading}
                  maxLength={160}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wider">
                  <Phone className="w-3 h-3 inline mr-1.5" /> Telefone / WhatsApp
                </label>
                <input
                  className={inputCls}
                  placeholder="(18) 99999-0000"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  disabled={loading}
                  maxLength={30}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wider">
                Tipo de contato
              </label>
              <select
                className={inputCls}
                value={form.contact_type}
                onChange={(e) => update("contact_type", e.target.value)}
                disabled={loading}
              >
                <option value="" className="bg-[#0a0a0f]">Selecione...</option>
                {CONTACT_TYPES.map((t) => (
                  <option key={t} value={t} className="bg-[#0a0a0f]">{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wider">
                Assunto
              </label>
              <input
                className={inputCls}
                placeholder="Título da sua mensagem"
                value={form.subject}
                onChange={(e) => update("subject", e.target.value)}
                disabled={loading}
                maxLength={160}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-2 uppercase tracking-wider">
                <MessageSquare className="w-3 h-3 inline mr-1.5" /> Mensagem
              </label>
              <textarea
                rows={6}
                className={inputCls + " resize-none"}
                placeholder="Conte para nós como podemos ajudar..."
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
                disabled={loading}
                maxLength={2000}
              />
              <p className="text-[11px] text-white/40 mt-1.5">{form.message.length}/2000 — mínimo 10 caracteres</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 disabled:opacity-60 disabled:cursor-not-allowed transition shadow-[0_0_40px_rgba(168,85,247,0.4)]"
            >
              {loading ? (
                <>ENVIANDO...</>
              ) : (
                <>
                  <Send className="w-4 h-4" /> ENVIAR MENSAGEM
                </>
              )}
            </button>

            <p className="text-[11px] text-white/40 text-center pt-2">
              Ao enviar, você concorda em receber retorno por e-mail ou WhatsApp da equipe Roxou.
            </p>
          </form>
        )}

        {/* Footer */}
        <div className="mt-12 text-center border-t border-white/5 pt-10">
          <h3 className="text-lg font-bold mb-2 bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
            Roxou — O portal de eventos de Presidente Prudente
          </h3>
          <p className="text-white/60 text-sm max-w-md mx-auto mb-5">
            Acompanhe as novidades da Expo Prudente 2026, shows confirmados e programação completa.
          </p>
          <Link
            to="/expo2026"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-purple-500/40 hover:bg-purple-500/10 hover:border-purple-400 transition text-sm font-bold"
          >
            VER NOTÍCIAS DA EXPO 2026 <ArrowLeft className="w-4 h-4 rotate-180" />
          </Link>
        </div>
      </main>
    </div>
  );
}

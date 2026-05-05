import { useState } from "react";
import { Mail, Phone, User, MessageSquare, Send, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ContactFormProps {
  /** Identifies which backend table/source to use: "expo" or "roxou" */
  kind: "expo" | "roxou";
  contactTypes: string[];
}

export default function ContactForm({ kind, contactTypes }: ContactFormProps) {
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
        kind,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        contact_type: form.contact_type,
        subject: form.subject.trim(),
        message: form.message.trim(),
      };

      const { data, error: fnError } = await supabase.functions.invoke<{
        success: boolean;
        error?: string;
      }>("send-expo-contact", { body: payload });

      if (fnError || !data?.success) {
        throw new Error(data?.error || fnError?.message || "Falha no envio");
      }

      setSuccess(true);
      setForm({ name: "", email: "", phone: "", contact_type: "", subject: "", message: "" });
      toast.success("Mensagem enviada com sucesso! Em breve nossa equipe entrará em contato.");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível enviar sua mensagem. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition";

  if (success) {
    return (
      <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-purple-500/30 p-8 sm:p-12 text-center shadow-[0_0_60px_rgba(124,58,237,0.2)]">
        <CheckCircle2 className="w-16 h-16 mx-auto text-green-400 mb-4" />
        <h2 className="text-2xl font-bold mb-3 text-white">Mensagem enviada com sucesso!</h2>
        <p className="text-white/70 mb-6">Em breve nossa equipe entrará em contato.</p>
        <button
          onClick={() => setSuccess(false)}
          className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm text-white"
        >
          Enviar nova mensagem
        </button>
      </div>
    );
  }

  return (
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
          {contactTypes.map((t) => (
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
        {loading ? <>ENVIANDO...</> : <><Send className="w-4 h-4" /> ENVIAR MENSAGEM</>}
      </button>

      <p className="text-[11px] text-white/40 text-center pt-2">
        Ao enviar, você concorda em receber retorno por e-mail ou WhatsApp da equipe Roxou.
      </p>
    </form>
  );
}

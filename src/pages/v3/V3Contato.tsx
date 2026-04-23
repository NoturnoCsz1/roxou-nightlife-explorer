import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MessageCircle, Instagram, Mail, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

const WHATSAPP_NUMBER = "5518997000000"; // placeholder — atualizar quando definido
const INSTAGRAM_HANDLE = "roxou";

export default function V3Contato() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      toast.error("Preencha seu nome e mensagem");
      return;
    }
    const text = encodeURIComponent(`Olá ROXOU! Sou ${name}.\n\n${message}`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, "_blank");
    toast.success("Abrindo WhatsApp...");
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-7">
      <div className="flex items-center gap-3">
        <Link to="/v3" className="w-9 h-9 rounded-full v3-glass flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="font-display font-extrabold text-2xl text-foreground">Contato</h1>
      </div>

      {/* Hero */}
      <div className="relative rounded-3xl overflow-hidden p-6 v3-glass-strong">
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative space-y-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-[10px] font-bold uppercase tracking-widest text-primary">
            <Sparkles className="w-3 h-3" /> Conta pra gente
          </span>
          <h2 className="font-display font-extrabold text-2xl leading-tight text-foreground">
            Quer divulgar seu evento ou tem alguma dúvida?
          </h2>
          <p className="text-xs text-muted-foreground">A gente responde rápido. De verdade.</p>
        </div>
      </div>

      {/* Direct CTAs */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl p-4 v3-glass v3-neon-hover space-y-2 active:scale-[0.97] transition-transform"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="font-display font-bold text-sm text-foreground">WhatsApp</p>
          <p className="text-[10px] text-muted-foreground">Resposta direta no chat</p>
        </a>
        <a
          href={`https://instagram.com/${INSTAGRAM_HANDLE}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl p-4 v3-glass v3-neon-hover space-y-2 active:scale-[0.97] transition-transform"
        >
          <div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center">
            <Instagram className="w-5 h-5 text-pink-400" />
          </div>
          <p className="font-display font-bold text-sm text-foreground">Instagram</p>
          <p className="text-[10px] text-muted-foreground">@{INSTAGRAM_HANDLE}</p>
        </a>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl p-5 v3-glass">
        <div className="flex items-center gap-2 mb-1">
          <Mail className="w-4 h-4 text-primary" />
          <h3 className="font-display font-bold text-base text-foreground">Mensagem direta</h3>
        </div>
        <input
          type="text"
          placeholder="Seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none transition-colors"
        />
        <textarea
          placeholder="Sua mensagem..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none transition-colors resize-none"
        />
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold uppercase tracking-wider text-[12px] text-white v3-neon-hover"
          style={{
            background: "linear-gradient(135deg, hsl(var(--v3-neon)), hsl(var(--v3-neon-soft)))",
          }}
        >
          <Send className="w-4 h-4" />
          Enviar via WhatsApp
        </button>
      </form>

      <p className="text-center text-[10px] text-muted-foreground/60">
        © 2026 ROXOU — Plataforma da noite do interior paulista.
      </p>
    </div>
  );
}

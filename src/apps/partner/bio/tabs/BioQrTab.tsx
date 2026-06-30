/**
 * QR Studio unificado da Bio.
 * Modelos: Bio, Menu, Mesa, Reserva, Lista VIP, Evento, WhatsApp, Instagram, PIX.
 * Tudo client-side com a lib `qrcode`. Sem novas tabelas.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Copy,
  Download,
  QrCode,
  Calendar,
  Crown,
  Bus,
  Utensils,
  MessageCircle,
  Instagram,
  Sparkles,
  Ticket,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  listQrCodes,
  upsertQrCode,
  type BioProfile,
  type BioQrCode,
} from "@/services/bio";
import { generateQrPngDataUrl, downloadDataUrl } from "@/lib/qrcode";

type QrTemplate = {
  id: string;
  label: string;
  subtitle: string;
  icon: typeof QrCode;
  /** Campos extras exibidos no formulário (além de Etiqueta). */
  extraInputs?: Array<{ key: string; placeholder: string }>;
  /** Constrói o alvo final a partir do parceiro + inputs extras. */
  build: (bio: BioProfile, extra: Record<string, string>) => { target_path: string; defaultLabel: string };
};

const QR_TEMPLATES: QrTemplate[] = [
  {
    id: "bio",
    label: "QR Bio",
    subtitle: "Página inicial",
    icon: QrCode,
    build: (b) => ({ target_path: `/bio/${b.slug}`, defaultLabel: "Bio" }),
  },
  {
    id: "menu",
    label: "QR Cardápio",
    subtitle: "Menu completo",
    icon: Utensils,
    build: (b) => ({ target_path: `/bio/${b.slug}/menu`, defaultLabel: "Cardápio" }),
  },
  {
    id: "mesa",
    label: "QR Mesa",
    subtitle: "Identifica a mesa",
    icon: Utensils,
    extraInputs: [{ key: "mesa", placeholder: "Nº da mesa" }],
    build: (b, x) => ({
      target_path: x.mesa ? `/bio/${b.slug}/menu?mesa=${encodeURIComponent(x.mesa)}` : `/bio/${b.slug}/menu`,
      defaultLabel: x.mesa ? `Mesa ${x.mesa}` : "Mesa",
    }),
  },
  {
    id: "reserva",
    label: "QR Reserva",
    subtitle: "Reservar mesa",
    icon: Calendar,
    build: (b) => ({ target_path: `/${b.slug}/reservas`, defaultLabel: "Reservas" }),
  },
  {
    id: "vip",
    label: "QR Lista VIP",
    subtitle: "Entrar na lista",
    icon: Crown,
    build: (b) => ({ target_path: `/${b.slug}/vip`, defaultLabel: "VIP" }),
  },
  {
    id: "evento",
    label: "QR Evento",
    subtitle: "Página do evento",
    icon: Ticket,
    extraInputs: [{ key: "slug", placeholder: "Slug do evento" }],
    build: (b, x) => ({
      target_path: x.slug ? `/${b.slug}/eventos/${x.slug}` : `/${b.slug}/eventos`,
      defaultLabel: x.slug ? `Evento ${x.slug}` : "Eventos",
    }),
  },
  {
    id: "whats",
    label: "QR WhatsApp",
    subtitle: "Falar direto",
    icon: MessageCircle,
    extraInputs: [{ key: "msg", placeholder: "Mensagem (opcional)" }],
    build: (b, x) => {
      const num = (b.whatsapp ?? "").replace(/\D/g, "");
      const base = num ? `https://wa.me/${num}` : `/bio/${b.slug}`;
      const target = x.msg && num ? `${base}?text=${encodeURIComponent(x.msg)}` : base;
      return { target_path: target, defaultLabel: "WhatsApp" };
    },
  },
  {
    id: "ig",
    label: "QR Instagram",
    subtitle: "Seguir perfil",
    icon: Instagram,
    build: (b) => ({
      target_path: b.instagram
        ? b.instagram.startsWith("http")
          ? b.instagram
          : `https://instagram.com/${b.instagram.replace(/^@/, "")}`
        : `/bio/${b.slug}`,
      defaultLabel: "Instagram",
    }),
  },
  {
    id: "pix",
    label: "QR PIX",
    subtitle: "Chave PIX simples",
    icon: Sparkles,
    extraInputs: [{ key: "chave", placeholder: "Chave PIX ou código copia-e-cola" }],
    build: (_b, x) => ({
      target_path: x.chave ? x.chave.trim() : "",
      defaultLabel: "PIX",
    }),
  },
];

export function BioQrTab({ bio }: { bio: BioProfile }) {
  const [qrs, setQrs] = useState<BioQrCode[]>([]);
  const [selectedTpl, setSelectedTpl] = useState<QrTemplate>(QR_TEMPLATES[0]);
  const [label, setLabel] = useState("");
  const [extras, setExtras] = useState<Record<string, string>>({});
  const base = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);

  async function reload() {
    setQrs(await listQrCodes(bio.id));
  }
  useEffect(() => {
    reload();
  }, [bio.id]);

  function selectTpl(tpl: QrTemplate) {
    setSelectedTpl(tpl);
    setExtras({});
  }

  async function create() {
    const built = selectedTpl.build(bio, extras);
    if (!built.target_path) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    await upsertQrCode({
      bio_id: bio.id,
      label: label || built.defaultLabel,
      target_path: built.target_path,
      table_number: selectedTpl.id === "mesa" ? extras.mesa || null : null,
    });
    setLabel("");
    setExtras({});
    toast.success("QR criado");
    await reload();
  }

  async function downloadPng(q: BioQrCode) {
    const fullUrl =
      q.target_path.startsWith("http") || !q.target_path.startsWith("/")
        ? q.target_path
        : `${base}${q.target_path}`;
    const dataUrl = await generateQrPngDataUrl(fullUrl, 720);
    downloadDataUrl(`qr-${q.label.replace(/\s+/g, "-")}.png`, dataUrl);
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">Modelos de QR</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {QR_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => selectTpl(t)}
              className={`rounded-xl border p-3 text-left transition-all hover:scale-[1.02] ${
                selectedTpl.id === t.id ? "border-purple-500 bg-purple-500/10" : "border-border"
              }`}
            >
              <t.icon className="h-5 w-5 mb-1 text-purple-500" />
              <div className="text-xs font-semibold">{t.label}</div>
              <div className="text-[10px] text-muted-foreground">{t.subtitle}</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
          <Input
            placeholder={`Etiqueta (ex: ${selectedTpl.id === "mesa" ? "Mesa 01" : "Fachada"})`}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          {selectedTpl.extraInputs?.map((f) => (
            <Input
              key={f.key}
              placeholder={f.placeholder}
              value={extras[f.key] ?? ""}
              onChange={(e) => setExtras({ ...extras, [f.key]: e.target.value })}
            />
          ))}
        </div>
        {selectedTpl.id === "pix" && (
          <p className="text-[11px] text-muted-foreground">
            Cole sua chave PIX ou o código copia-e-cola completo. O QR será gerado com o conteúdo exato — sem assinatura BR Code automática.
          </p>
        )}
        <Button onClick={create} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Gerar QR
        </Button>
      </Card>

      <div className="space-y-2">
        {qrs.map((q) => {
          const fullUrl =
            q.target_path.startsWith("http") || !q.target_path.startsWith("/")
              ? q.target_path
              : `${base}${q.target_path}`;
          const png = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(fullUrl)}`;
          return (
            <Card key={q.id} className="p-3 flex items-center gap-3">
              <img
                src={png}
                alt={q.label}
                loading="lazy"
                decoding="async"
                className="h-20 w-20 rounded bg-white"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{q.label}</div>
                <div className="text-[11px] text-muted-foreground truncate">{fullUrl}</div>
                <div className="text-[10px] text-muted-foreground">{q.scan_count} leituras</div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(fullUrl);
                    toast.success("Link copiado");
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => downloadPng(q)}>
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          );
        })}
        {qrs.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            <QrCode className="h-8 w-8 mx-auto mb-2 opacity-30" />
            Nenhum QR criado.
          </Card>
        )}
      </div>
    </div>
  );
}

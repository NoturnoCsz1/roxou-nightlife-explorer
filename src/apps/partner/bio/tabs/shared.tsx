/**
 * Helpers compartilhados entre as abas da Bio.
 * Extraído de BioTabs.tsx — sem mudança de comportamento.
 */
import {
  Instagram,
  Music2,
  Youtube,
  Globe,
  MessageCircle,
  Calendar,
  Crown,
  Bus,
  Utensils,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function fmtBRL(v: number | null | undefined) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function classifySource(referrer: string | null, source: string | null): string {
  const s = (source ?? "").toLowerCase();
  if (s.includes("qr")) return "QR Code";
  if (s.includes("instagram")) return "Instagram";
  if (s.includes("whatsapp")) return "WhatsApp";
  const r = (referrer ?? "").toLowerCase();
  if (!r) return "Direto";
  if (r.includes("instagram")) return "Instagram";
  if (r.includes("google")) return "Google";
  if (r.includes("whatsapp") || r.includes("wa.me")) return "WhatsApp";
  if (r.includes("facebook")) return "Facebook";
  if (r.includes("roxou")) return "Roxou";
  if (r.includes("tiktok")) return "TikTok";
  return "Outros";
}

export function autoIconFor(url: string) {
  const u = url.toLowerCase();
  if (u.includes("wa.me") || u.includes("whatsapp")) return MessageCircle;
  if (u.includes("instagram")) return Instagram;
  if (u.includes("tiktok")) return Music2;
  if (u.includes("youtube")) return Youtube;
  return Globe;
}

export const CTA_TEMPLATES: Array<{
  title: string;
  url: string;
  icon: typeof Calendar;
  description?: string;
}> = [
  { title: "Reservar agora", url: "#reservar", icon: Calendar, description: "Mesa garantida" },
  { title: "Entrar na Lista VIP", url: "#vip", icon: Crown, description: "Acesso preferencial" },
  { title: "Comprar ingresso", url: "#ingresso", icon: Sparkles },
  { title: "Solicitar motorista", url: "#motorista", icon: Bus },
  { title: "Ver cardápio", url: "#cardapio", icon: Utensils },
  { title: "Falar no WhatsApp", url: "https://wa.me/", icon: MessageCircle, description: "Resposta rápida" },
  { title: "Pagar via PIX", url: "#pix", icon: Sparkles },
];

export function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: string;
}) {
  return (
    <Card
      className={`p-3 bg-gradient-to-br ${accent ?? "from-card to-card"} border-border/50 hover:scale-[1.02] transition-transform`}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </Card>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4 space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </Card>
  );
}
export function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}
export function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function Conv({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

export function BarList({ items }: { items: Array<{ name: string; count: number }> }) {
  const total = items.reduce((acc, x) => acc + x.count, 0) || 1;
  return (
    <div className="space-y-2">
      {items.map((s) => {
        const pct = Math.round((s.count / total) * 100);
        return (
          <div key={s.name}>
            <div className="flex justify-between text-xs mb-1">
              <span>{s.name}</span>
              <span className="text-muted-foreground">
                {s.count} · {pct}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

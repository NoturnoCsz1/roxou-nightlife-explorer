/**
 * PublicVipList — Fase 10F
 *
 * Página pública /:partnerSlug/vip para inscrição em Lista VIP.
 * Aceita ?promoter=slug para rastrear quem trouxe o convidado.
 * Sem login. RPC SECURITY DEFINER `submit_public_vip_entry`.
 *
 * Regra: 1 cadastro = 1 pessoa = 1 QR = 1 check-in.
 * LGPD: consentimento opcional para comunicação futura.
 */
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import {
  getPublicVipListByPartner,
  submitPublicVipEntry,
  type PublicVipListInfo,
} from "@/services/publicVipList";

const PublicVipListPage = () => {
  const { partnerSlug } = useParams<{ partnerSlug: string }>();
  const [params] = useSearchParams();
  const promoterSlug = params.get("promoter")?.trim() || null;
  const navigate = useNavigate();
  const { toast } = useToast();

  const [list, setList] = useState<PublicVipListInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [accept, setAccept] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  useEffect(() => {
    if (!partnerSlug) return;
    let alive = true;
    setLoading(true);
    getPublicVipListByPartner(partnerSlug)
      .then((data) => alive && setList(data))
      .catch(() => alive && setList(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [partnerSlug]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!list) return;
    if (!accept) {
      toast({
        title: "Aceite os termos para continuar.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitPublicVipEntry({
        publicSlug: list.public_slug,
        name,
        phone,
        email: email || null,
        promoterSlug,
        marketingConsent,
        whatsappConsent: marketingConsent,
        emailConsent: marketingConsent && !!email,
      });
      navigate(`/${partnerSlug}/vip/sucesso/${result.public_token}`, {
        state: { result, list },
        replace: true,
      });
    } catch (err) {
      toast({
        title: "Não foi possível entrar na lista",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center bg-background px-4">
        <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
      </main>
    );
  }

  if (!list) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center bg-background px-4 overflow-x-hidden">
        <Card className="w-full max-w-md p-6 text-center">
          <h1 className="text-xl font-bold">Lista indisponível</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esse estabelecimento não tem Lista VIP ativa no momento.
          </p>
        </Card>
      </main>
    );
  }

  const displayTitle = list.public_title || list.title;
  const isOpen = list.is_open;
  const capacityLeft =
    list.max_entries != null
      ? Math.max(0, list.max_entries - list.used_entries)
      : null;
  const soldOut = capacityLeft != null && capacityLeft <= 0;

  return (
    <main className="min-h-screen w-full bg-background overflow-x-hidden">
      <SEO
        title={`${displayTitle} — Lista VIP | ${list.partner_name ?? "Roxou"}`}
        description={
          list.public_description ??
          `Entre na Lista VIP de ${list.partner_name ?? ""}`
        }
      />
      <div className="w-full max-w-xl mx-auto px-4 py-6 space-y-5">
        {list.public_cover_url ? (
          <div className="w-full aspect-[4/3] sm:aspect-[16/9] overflow-hidden rounded-xl bg-muted">
            <img
              src={list.public_cover_url}
              alt={displayTitle}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ) : null}

        <header className="flex items-center gap-3">
          {list.partner_logo_url ? (
            <img
              src={list.partner_logo_url}
              alt={list.partner_name ?? ""}
              className="w-12 h-12 rounded-full object-cover bg-muted shrink-0"
            />
          ) : null}
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-primary">
              Lista VIP
            </p>
            <h1 className="text-xl font-bold break-words">{displayTitle}</h1>
            {list.partner_name ? (
              <p className="text-xs text-muted-foreground break-words">
                {list.partner_name}
                {list.partner_city ? ` · ${list.partner_city}` : ""}
              </p>
            ) : null}
          </div>
        </header>

        {list.starts_at ? (
          <p className="text-sm text-muted-foreground">
            {new Date(list.starts_at).toLocaleString("pt-BR", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </p>
        ) : null}

        {list.public_description ? (
          <p className="text-sm text-foreground/90 whitespace-pre-line break-words">
            {list.public_description}
          </p>
        ) : null}

        {list.public_rules ? (
          <Card className="p-3 text-xs text-muted-foreground whitespace-pre-line break-words">
            {list.public_rules}
          </Card>
        ) : null}

        {capacityLeft != null ? (
          <p className="text-xs text-muted-foreground">
            {soldOut ? "Capacidade esgotada" : `${capacityLeft} vagas restantes`}
          </p>
        ) : null}

        {!isOpen ? (
          <Card className="p-4 text-center text-sm text-muted-foreground">
            Esta lista está fechada para novas inscrições.
          </Card>
        ) : soldOut ? (
          <Card className="p-4 text-center text-sm text-muted-foreground">
            Capacidade esgotada. Acompanhe o estabelecimento para a próxima.
          </Card>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="vip-name">Nome completo *</Label>
              <Input
                id="vip-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
                autoComplete="name"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vip-phone">WhatsApp *</Label>
              <Input
                id="vip-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                inputMode="tel"
                placeholder="(18) 99999-9999"
                maxLength={20}
                autoComplete="tel"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vip-email">E-mail (opcional)</Label>
              <Input
                id="vip-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={120}
                autoComplete="email"
              />
            </div>

            <p className="text-[11px] text-muted-foreground">
              1 cadastro = 1 pessoa = 1 QR Code = 1 entrada.
            </p>

            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={accept}
                onCheckedChange={(v) => setAccept(v === true)}
                className="mt-0.5"
              />
              <span className="break-words">
                Concordo com o uso dos meus dados para confirmar minha entrada
                conforme a LGPD.
              </span>
            </label>

            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={marketingConsent}
                onCheckedChange={(v) => setMarketingConsent(v === true)}
                className="mt-0.5"
              />
              <span className="break-words">
                Autorizo receber informações, promoções e novidades deste
                estabelecimento e da Roxou.
              </span>
            </label>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Enviando..." : "Entrar na Lista VIP"}
            </Button>
            {promoterSlug ? (
              <p className="text-[10px] text-muted-foreground text-center">
                Indicado por <strong>{promoterSlug}</strong>
              </p>
            ) : null}
          </form>
        )}
      </div>
    </main>
  );
};

export default PublicVipListPage;

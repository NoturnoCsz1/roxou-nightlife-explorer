/**
 * PublicVipList — Fase 10E
 *
 * Página pública /vip/:publicSlug para inscrição em Lista VIP.
 * Aceita ?promoter=slug para rastrear quem trouxe o convidado.
 * Sem login. Submete via RPC SECURITY DEFINER `submit_public_vip_entry`.
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
  getPublicVipList,
  submitPublicVipEntry,
  type PublicVipListInfo,
} from "@/services/publicVipList";

const PublicVipListPage = () => {
  const { publicSlug } = useParams<{ publicSlug: string }>();
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
  const [people, setPeople] = useState(1);
  const [accept, setAccept] = useState(false);

  useEffect(() => {
    if (!publicSlug) return;
    let alive = true;
    setLoading(true);
    getPublicVipList(publicSlug)
      .then((data) => {
        if (!alive) return;
        setList(data);
      })
      .catch(() => {
        if (!alive) return;
        setList(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [publicSlug]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicSlug || !list) return;
    if (!accept) {
      toast({ title: "Aceite os termos para continuar.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitPublicVipEntry({
        publicSlug,
        name,
        phone,
        email: email || null,
        peopleCount: people,
        promoterSlug,
      });
      navigate(`/vip/${publicSlug}/sucesso/${result.public_token}`, {
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
            O link pode ter sido desativado ou está incorreto.
          </p>
        </Card>
      </main>
    );
  }

  const displayTitle = list.public_title || list.title;
  const isOpen = list.is_open;
  const capacityLeft =
    list.max_entries != null ? Math.max(0, list.max_entries - list.used_entries) : null;
  const soldOut = capacityLeft != null && capacityLeft <= 0;

  return (
    <main className="min-h-screen w-full bg-background overflow-x-hidden">
      <SEO
        title={`${displayTitle} — Lista VIP | Roxou`}
        description={list.public_description ?? `Entre na Lista VIP de ${list.partner_name ?? ""}`}
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

        <header className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-primary">Lista VIP</p>
          <h1 className="text-2xl font-bold break-words">{displayTitle}</h1>
          {list.partner_name ? (
            <p className="text-sm text-muted-foreground break-words">
              {list.partner_name}
              {list.partner_city ? ` · ${list.partner_city}` : ""}
            </p>
          ) : null}
          {list.starts_at ? (
            <p className="text-sm text-muted-foreground">
              {new Date(list.starts_at).toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          ) : null}
        </header>

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
            {soldOut
              ? "Capacidade esgotada"
              : `${capacityLeft} vagas restantes`}
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
            <div className="space-y-1">
              <Label htmlFor="vip-people">Pessoas</Label>
              <Input
                id="vip-people"
                type="number"
                min={1}
                max={Math.max(1, list.max_entries_per_person || 1)}
                value={people}
                onChange={(e) => setPeople(Number(e.target.value) || 1)}
              />
              {list.max_entries_per_person > 1 ? (
                <p className="text-xs text-muted-foreground">
                  Até {list.max_entries_per_person} pessoas por inscrição.
                </p>
              ) : null}
            </div>

            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={accept}
                onCheckedChange={(v) => setAccept(v === true)}
                className="mt-0.5"
              />
              <span className="break-words">
                Concordo com o uso dos meus dados para confirmar minha entrada conforme a
                LGPD.
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

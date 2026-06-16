/**
 * PartnerVipCheckinPage — Fase 10E
 *
 * Rota /checkin/:publicToken para portaria escanear QR e confirmar entrada.
 * Exige usuário Partner logado com acesso ao parceiro da entry. Usa
 * RPC `get_vip_entry_by_token` (autoriza) e `check_in_partner_vip_entry`.
 */
import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getVipEntryByToken,
  checkInVipEntry,
  type PartnerVipEntry,
} from "../services/partnerVipLists";
import { usePartnerAuth } from "../hooks/usePartnerAuth";

interface Props {
  publicToken: string;
}

const Body = ({ publicToken }: Props) => {
  const { user, loading: authLoading } = usePartnerAuth();
  const [entry, setEntry] = useState<PartnerVipEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const e = await getVipEntryByToken(publicToken);
      setEntry(e);
      if (!e) setError("Inscrição não encontrada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar inscrição.");
    } finally {
      setLoading(false);
    }
  }, [publicToken]);

  useEffect(() => {
    if (!authLoading && user) void reload();
  }, [authLoading, user, reload]);

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 overflow-x-hidden">
        <Card className="w-full max-w-sm p-5 text-center space-y-3">
          <h1 className="text-lg font-bold">Login necessário</h1>
          <p className="text-sm text-muted-foreground">
            Entre com sua conta Partner para confirmar entradas.
          </p>
          <Button asChild className="w-full">
            <Link to={`/login?next=/checkin/${publicToken}`}>Entrar</Link>
          </Button>
        </Card>
      </main>
    );
  }

  const handleCheckIn = async () => {
    if (!entry) return;
    setBusy(true);
    try {
      const updated = await checkInVipEntry(entry.id);
      setEntry(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao confirmar.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
      </main>
    );
  }

  if (error || !entry) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 overflow-x-hidden">
        <Card className="w-full max-w-sm p-5 text-center space-y-3">
          <h1 className="text-lg font-bold">Não foi possível abrir</h1>
          <p className="text-sm text-muted-foreground break-words">
            {error ?? "Entrada inválida."}
          </p>
          <Button asChild variant="secondary">
            <Link to="/dashboard">Voltar</Link>
          </Button>
        </Card>
      </main>
    );
  }

  const alreadyIn = entry.status === "checked_in";

  return (
    <main className="min-h-screen w-full bg-background overflow-x-hidden">
      <div className="w-full max-w-md mx-auto px-4 py-8 space-y-5">
        <header className="text-center space-y-1">
          <p className="text-xs uppercase tracking-wide text-primary">Check-in VIP</p>
          <h1 className="text-2xl font-bold break-words">{entry.name}</h1>
          <p className="text-sm text-muted-foreground">
            {entry.people_count} pessoa(s)
          </p>
          {entry.promoter_name_snapshot ? (
            <p className="text-xs text-muted-foreground break-words">
              Promoter: {entry.promoter_name_snapshot}
            </p>
          ) : null}
        </header>

        {alreadyIn ? (
          <Card className="p-5 text-center space-y-2 border-emerald-500/40">
            <p className="text-emerald-500 font-semibold">Entrada já confirmada</p>
            {entry.checked_in_at ? (
              <p className="text-xs text-muted-foreground">
                {new Date(entry.checked_in_at).toLocaleString("pt-BR")}
              </p>
            ) : null}
          </Card>
        ) : entry.status === "cancelled" ? (
          <Card className="p-5 text-center text-sm text-destructive">
            Inscrição cancelada.
          </Card>
        ) : entry.status === "no_show" ? (
          <Card className="p-5 text-center text-sm text-amber-500">
            Marcado como no-show.
          </Card>
        ) : (
          <Button
            onClick={handleCheckIn}
            disabled={busy}
            className="w-full h-14 text-base"
          >
            {busy ? "Confirmando..." : "Confirmar entrada"}
          </Button>
        )}

        <div className="text-center">
          <Link
            to={`/lista-vip/${entry.vip_list_id}`}
            className="text-xs text-muted-foreground underline"
          >
            Ver lista
          </Link>
        </div>
      </div>
    </main>
  );
};

const PartnerVipCheckinPage = () => {
  const { publicToken } = useParams<{ publicToken: string }>();
  if (!publicToken) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Token inválido.</p>
      </main>
    );
  }
  return <Body publicToken={publicToken} />;
};

export default PartnerVipCheckinPage;

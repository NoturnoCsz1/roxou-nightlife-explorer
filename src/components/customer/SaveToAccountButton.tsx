/**
 * SaveToAccountButton — botão "Salvar na minha conta" usado nas telas
 * de sucesso de Reserva e Lista VIP.
 *
 * - Se logado: chama RPC link_record_to_customer(kind, token) direto.
 * - Senão: redireciona para /cliente/login com kind/token/redirect na query.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCustomerSession } from "@/hooks/useCustomerSession";
import { linkRecordToCustomer } from "@/services/customerProfile";

interface Props {
  kind: "reservation" | "vip_entry";
  token: string;
}

export function SaveToAccountButton({ kind, token }: Props) {
  const { user, loading } = useCustomerSession();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    if (!token) return;
    if (!user) {
      const redirect = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      navigate(
        `/cliente/login?kind=${kind}&token=${encodeURIComponent(
          token,
        )}&redirect=${redirect}`,
      );
      return;
    }
    setBusy(true);
    try {
      const res = await linkRecordToCustomer(kind, token);
      const reason = res.reason;
      if (reason === "linked") {
        toast({ title: "Comprovante salvo na sua conta." });
        navigate(
          kind === "reservation"
            ? "/cliente/minhas-reservas"
            : "/cliente/minhas-reservas?tab=vip",
        );
      } else if (reason === "already_linked_to_you") {
        toast({ title: "Este comprovante já está salvo na sua conta." });
        navigate(
          kind === "reservation"
            ? "/cliente/minhas-reservas"
            : "/cliente/minhas-reservas?tab=vip",
        );
      } else if (reason === "already_linked") {
        toast({
          title: "Este comprovante já foi salvo em outra conta.",
          variant: "destructive",
        });
      } else if (reason === "contact_mismatch") {
        toast({
          title:
            "Por segurança, este comprovante só pode ser salvo usando o mesmo e-mail ou telefone informado na reserva.",
          description:
            "Dica: utilize o mesmo e-mail ou telefone informado na reserva ou lista VIP.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Não foi possível salvar este comprovante agora.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Não foi possível salvar este comprovante agora.",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      disabled={busy || loading || !token}
      className="w-full min-h-[44px]"
    >
      {busy ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Bookmark className="mr-2 h-4 w-4" />
      )}
      Salvar na minha conta
    </Button>
  );
}

export default SaveToAccountButton;

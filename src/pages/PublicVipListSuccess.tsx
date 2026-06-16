/**
 * PublicVipListSuccess — Fase 10E
 *
 * Página de confirmação pós inscrição: mostra QR code, nome, lista,
 * estabelecimento e botões de compartilhar/copiar comprovante.
 *
 * Rota: /vip/:publicSlug/sucesso/:publicToken
 */
import { useEffect, useState } from "react";
import { useLocation, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { generateQrSvg } from "@/lib/qrcode";
import type {
  PublicVipListInfo,
  PublicVipSubmitResult,
} from "@/services/publicVipList";
import { getPublicVipList } from "@/services/publicVipList";

interface LocationState {
  result?: PublicVipSubmitResult;
  list?: PublicVipListInfo;
}

const PublicVipListSuccessPage = () => {
  const { publicSlug, publicToken } = useParams<{
    publicSlug: string;
    publicToken: string;
  }>();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;
  const { toast } = useToast();
  const [qrSvg, setQrSvg] = useState<string>("");
  const [list, setList] = useState<PublicVipListInfo | null>(state.list ?? null);

  const result = state.result;

  useEffect(() => {
    if (!list && publicSlug) {
      getPublicVipList(publicSlug).then(setList).catch(() => undefined);
    }
  }, [list, publicSlug]);

  useEffect(() => {
    if (!publicToken) return;
    const payload =
      result?.qr_code_payload ??
      `${window.location.origin}/checkin/${publicToken}`;
    generateQrSvg(payload).then(setQrSvg).catch(() => setQrSvg(""));
  }, [publicToken, result?.qr_code_payload]);

  const partnerName = list?.partner_name ?? "";
  const listTitle = result?.list_title ?? list?.public_title ?? list?.title ?? "Lista VIP";

  const comprovante = [
    `Lista VIP: ${listTitle}`,
    partnerName ? `Local: ${partnerName}` : null,
    result?.name ? `Nome: ${result.name}` : null,
    result?.people_count ? `Pessoas: ${result.people_count}` : null,
    publicToken ? `Código: ${publicToken}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(comprovante);
      toast({ title: "Comprovante copiado!" });
    } catch {
      toast({ title: "Não foi possível copiar.", variant: "destructive" });
    }
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(comprovante)}`;

  return (
    <main className="min-h-screen w-full bg-background overflow-x-hidden">
      <SEO title="Você está na Lista VIP | Roxou" description="Comprovante de inscrição em Lista VIP." />
      <div className="w-full max-w-md mx-auto px-4 py-8 space-y-5">
        <header className="text-center space-y-1">
          <p className="text-xs uppercase tracking-wide text-primary">Lista VIP</p>
          <h1 className="text-2xl font-bold">Você está na lista!</h1>
          {partnerName ? (
            <p className="text-sm text-muted-foreground break-words">{partnerName}</p>
          ) : null}
        </header>

        <Card className="p-4 space-y-3 text-center">
          <p className="text-base font-semibold break-words">{listTitle}</p>
          {result?.name ? (
            <p className="text-sm break-words">
              <span className="text-muted-foreground">Nome:</span> {result.name}
            </p>
          ) : null}
          {result?.people_count ? (
            <p className="text-sm">
              <span className="text-muted-foreground">Pessoas:</span> {result.people_count}
            </p>
          ) : null}
          {result?.status === "pending" ? (
            <p className="text-xs text-amber-500">
              Aguardando aprovação do estabelecimento.
            </p>
          ) : null}

          {qrSvg ? (
            <div
              className="mx-auto bg-white p-3 rounded-lg w-full max-w-[260px] aspect-square flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          ) : (
            <div className="mx-auto bg-muted w-full max-w-[260px] aspect-square rounded-lg" />
          )}

          {publicToken ? (
            <p className="text-[10px] text-muted-foreground break-all">
              {publicToken}
            </p>
          ) : null}
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button variant="secondary" onClick={copy}>
            Copiar comprovante
          </Button>
          <Button asChild>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              Abrir no WhatsApp
            </a>
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Mostre este QR Code na portaria para confirmar sua entrada.
        </p>

        <div className="text-center">
          <Link to="/" className="text-xs text-muted-foreground underline">
            Voltar para Roxou
          </Link>
        </div>
      </div>
    </main>
  );
};

export default PublicVipListSuccessPage;

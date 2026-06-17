/**
 * PublicVipListSuccess — Fase 10F
 *
 * Comprovante profissional pós inscrição. Cartão com logo, dados do
 * convidado, promoter, código VIP, QR e disclaimers obrigatórios.
 * Suporta download PNG do QR e do cartão, share WhatsApp e copiar código.
 *
 * Rota: /:partnerSlug/vip/sucesso/:publicToken
 */
import { useEffect, useRef, useState } from "react";
import { useLocation, useParams, Link } from "react-router-dom";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { generateQrSvg, downloadDataUrl } from "@/lib/qrcode";
import type {
  PublicVipListInfo,
  PublicVipSubmitResult,
} from "@/services/publicVipList";
import {
  getPublicVipList,
  getPublicVipListByPartner,
} from "@/services/publicVipList";

interface LocationState {
  result?: PublicVipSubmitResult;
  list?: PublicVipListInfo;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");

const PublicVipListSuccessPage = () => {
  const { partnerSlug, listSlug, publicToken } = useParams<{
    partnerSlug?: string;
    listSlug?: string;
    publicToken?: string;
  }>();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement | null>(null);

  const [qrSvg, setQrSvg] = useState<string>("");
  const [list, setList] = useState<PublicVipListInfo | null>(state.list ?? null);

  const result = state.result;

  useEffect(() => {
    if (list) return;
    const loader = listSlug
      ? getPublicVipList(listSlug)
      : partnerSlug
        ? getPublicVipListByPartner(partnerSlug)
        : null;
    if (!loader) return;
    loader.then((l) => l && setList(l)).catch(() => undefined);
  }, [list, partnerSlug, listSlug]);

  useEffect(() => {
    if (!publicToken) return;
    const payload =
      result?.qr_code_payload ??
      `${window.location.origin}/checkin/${publicToken}`;
    generateQrSvg(payload)
      .then(setQrSvg)
      .catch(() => setQrSvg(""));
  }, [publicToken, result?.qr_code_payload]);

  const partnerName = list?.partner_name ?? "";
  const listTitle =
    result?.list_title ?? list?.public_title ?? list?.title ?? "Lista VIP";
  const guestName = result?.name ?? "";
  const guestPhone = result?.phone ?? "";
  const promoterName = result?.promoter_name ?? "";
  const code = publicToken ? publicToken.slice(0, 8).toUpperCase() : "";
  const date = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const filenameBase = slugify(`${guestName || "convidado"}`);

  const generateCardPng = async (): Promise<string | null> => {
    if (!cardRef.current) return null;
    try {
      return await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0b0814",
      });
    } catch {
      toast({
        title: "Não foi possível gerar o comprovante.",
        variant: "destructive",
      });
      return null;
    }
  };

  const downloadCard = async () => {
    const url = await generateCardPng();
    if (!url) return;
    downloadDataUrl(`comprovante-vip-${filenameBase}.png`, url);
  };

  const buildShareText = () =>
    [
      `Lista VIP — ${listTitle}`,
      partnerName ? `Local: ${partnerName}` : null,
      guestName ? `Nome: ${guestName}` : null,
      promoterName ? `Promoter: ${promoterName}` : null,
      code ? `Código: ${code}` : null,
      `Data: ${date}`,
      "",
      "Comprovante de inscrição em Lista VIP.",
      "Não é convite, ingresso ou reserva. Entrada sujeita às regras do estabelecimento.",
    ]
      .filter(Boolean)
      .join("\n");

  const shareCard = async () => {
    const dataUrl = await generateCardPng();
    if (!dataUrl) return;
    const text = buildShareText();
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `comprovante-vip-${filenameBase}.png`, {
        type: "image/png",
      });
      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
      };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({
          files: [file],
          title: "Comprovante VIP",
          text,
        });
        return;
      }
    } catch {
      // fallback below
    }
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="min-h-screen w-full bg-background overflow-x-hidden">
      <SEO
        title="Você está na Lista VIP | Roxou"
        description="Comprovante de inscrição em Lista VIP."
      />
      <div className="w-full max-w-md mx-auto px-4 py-6 space-y-4">
        <header className="text-center space-y-1">
          <p className="text-xs uppercase tracking-wide text-primary">
            Lista VIP
          </p>
          <h1 className="text-2xl font-bold">Você está na lista!</h1>
        </header>

        {/* ====== Cartão Profissional ====== */}
        <div
          ref={cardRef}
          className="rounded-2xl p-5 space-y-4"
          style={{
            background:
              "linear-gradient(160deg, #15102b 0%, #0b0814 60%, #1a0b2a 100%)",
            border: "1px solid rgba(168,85,247,0.25)",
            boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
          }}
        >
          <div className="flex items-center gap-3">
            {list?.partner_logo_url ? (
              <img
                src={list.partner_logo_url}
                alt={partnerName}
                crossOrigin="anonymous"
                className="w-12 h-12 rounded-full object-cover bg-white/5 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-white/10 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-primary">
                Comprovante VIP
              </p>
              <p className="text-sm font-bold text-white break-words">
                {partnerName || "Estabelecimento"}
              </p>
            </div>
          </div>

          <div className="text-center text-white">
            <p className="text-xs text-white/60">Convidado</p>
            <p className="text-lg font-bold break-words">{guestName}</p>
            {guestPhone ? (
              <p className="text-xs text-white/60 mt-0.5">{guestPhone}</p>
            ) : null}
          </div>

          <div className="bg-white p-3 rounded-xl mx-auto w-full max-w-[260px] sm:max-w-[360px] aspect-square flex items-center justify-center overflow-hidden">
            {qrSvg ? (
              <div
                className="w-full h-full [&_svg]:w-full [&_svg]:h-full [&_svg]:max-w-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            ) : (
              <div className="w-full h-full bg-muted" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-white/80">
            <div>
              <p className="text-white/50">Promoter</p>
              <p className="font-medium break-words">
                {promoterName || "—"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/50">Código</p>
              <p className="font-mono font-bold tracking-widest">{code}</p>
            </div>
            <div>
              <p className="text-white/50">Lista</p>
              <p className="font-medium break-words">{listTitle}</p>
            </div>
            <div className="text-right">
              <p className="text-white/50">Data</p>
              <p className="font-medium">{date}</p>
            </div>
          </div>

          <p className="text-[10px] text-white/70 text-center border-t border-white/10 pt-3">
            Este QR Code é individual e válido para apenas 1 pessoa.
          </p>

          <p className="text-[9px] text-white/50 text-center leading-relaxed">
            Este documento é apenas um comprovante de inscrição em Lista VIP.
            Não constitui convite, ingresso, reserva de mesa ou garantia de
            entrada. A entrada está sujeita às regras do estabelecimento e à
            validação pela portaria.
          </p>

          <p className="text-[9px] text-white/40 text-center">
            Powered by Roxou Partner Pro
          </p>
        </div>

        {/* ====== Ações ====== */}
        <div className="grid grid-cols-2 gap-2 w-full">
          <Button variant="secondary" onClick={downloadQr} className="w-full min-w-0 truncate">
            Baixar QR PNG
          </Button>
          <Button variant="secondary" onClick={downloadCard} className="w-full min-w-0 truncate">
            Salvar comprovante
          </Button>
          <Button onClick={shareWhatsapp} className="w-full min-w-0 truncate">
            WhatsApp
          </Button>
          <Button variant="outline" onClick={copyCode} className="w-full min-w-0 truncate">
            Copiar código
          </Button>
        </div>

        {result?.status === "pending" ? (
          <Card className="p-3 text-xs text-amber-500 text-center">
            Aguardando aprovação do estabelecimento.
          </Card>
        ) : null}

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

/**
 * PartnerActionsSheet — bottom sheet com ações rápidas do Partner Pro.
 * Não cria regras de negócio. Navega para fluxos já existentes.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarPlus, BellRing, Share2, QrCode, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { PublicLinkQrDialog } from "./PublicLinkQrDialog";
import { cn } from "@/lib/utils";

interface Props {
  partnerSlug?: string | null;
  partnerName?: string | null;
  onCallNext?: () => void;
  className?: string;
}

export function PartnerActionsSheet({
  partnerSlug,
  partnerName,
  onCallNext,
  className,
}: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const publicUrl =
    partnerSlug && typeof window !== "undefined"
      ? `${window.location.origin}/${partnerSlug}/reservas`
      : null;

  const handleShare = async () => {
    if (!publicUrl) {
      toast({ title: "Slug indisponível", variant: "destructive" });
      return;
    }
    setOpen(false);
    try {
      if (navigator.share) {
        await navigator.share({
          title: partnerName ?? "Reservas",
          url: publicUrl,
        });
        return;
      }
    } catch {
      /* user cancelled */
    }
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast({ title: "Link copiado!" });
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  const actions = [
    {
      icon: CalendarPlus,
      label: "Nova reserva",
      onClick: () => {
        setOpen(false);
        navigate("/reservas");
      },
    },
    {
      icon: BellRing,
      label: "Chamar próximo",
      onClick: () => {
        setOpen(false);
        if (onCallNext) onCallNext();
        else navigate("/fila");
      },
    },
    {
      icon: Share2,
      label: "Compartilhar link",
      onClick: handleShare,
    },
    {
      icon: QrCode,
      label: "Mostrar QR",
      onClick: () => {
        setOpen(false);
        setQrOpen(true);
      },
    },
  ];

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="Ações rápidas"
            className={cn(
              "fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full",
              "bg-[var(--partner-gradient,linear-gradient(135deg,#a855f7,#7c3aed))]",
              "text-white shadow-[0_10px_30px_rgba(124,58,237,0.35)] active:scale-95 transition",
              className,
            )}
            style={{
              bottom:
                "calc(env(safe-area-inset-bottom, 0px) + var(--partner-bottom-nav-h, 72px) + 12px)",
            }}
          >
            <Plus className="h-6 w-6" />
          </button>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl border-white/10 bg-[rgba(17,17,17,0.95)] backdrop-blur-xl"
        >
          <SheetHeader>
            <SheetTitle className="text-left">Ações rápidas</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3 pt-4 pb-2">
            {actions.map((a) => (
              <Button
                key={a.label}
                variant="outline"
                onClick={a.onClick}
                className="h-auto flex-col items-center gap-2 py-4 border-white/10 bg-white/5 hover:bg-white/10"
              >
                <a.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{a.label}</span>
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {publicUrl ? (
        <PublicLinkQrDialog
          open={qrOpen}
          onOpenChange={setQrOpen}
          url={publicUrl}
          title={partnerName ?? "Reservas"}
        />
      ) : null}
    </>
  );
}

export default PartnerActionsSheet;

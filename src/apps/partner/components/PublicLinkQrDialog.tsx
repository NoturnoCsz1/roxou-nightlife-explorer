/**
 * PublicLinkQrDialog — gera/baixa QR Code para o link público de reservas.
 */
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  downloadDataUrl,
  generateQrPngDataUrl,
} from "@/lib/qrcode";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  url: string;
  filename?: string;
}

export function PublicLinkQrDialog({
  open,
  onOpenChange,
  url,
  filename = "reservas-qr.png",
}: Props) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !url) return;
    setLoading(true);
    generateQrPngDataUrl(url, 720)
      .then(setDataUrl)
      .finally(() => setLoading(false));
  }, [open, url]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-sm">
        <DialogHeader>
          <DialogTitle>QR do link público</DialogTitle>
          <DialogDescription className="break-all text-xs">
            {url}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center rounded-md bg-white p-4">
          {loading || !dataUrl ? (
            <div className="h-64 w-64 animate-pulse rounded-md bg-muted" />
          ) : (
            <img
              src={dataUrl}
              alt="QR Code de reservas"
              className="h-64 w-64"
            />
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="min-h-[44px]"
          >
            Fechar
          </Button>
          <Button
            disabled={!dataUrl}
            onClick={() => downloadDataUrl(filename, dataUrl)}
            className="min-h-[44px]"
          >
            <Download className="mr-2 h-4 w-4" />
            Baixar PNG
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PublicLinkQrDialog;

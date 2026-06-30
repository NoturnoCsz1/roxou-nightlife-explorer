import { useMemo } from "react";
import { Copy, Share2, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { type BioProfile } from "@/services/bio";
import { generateQrPngDataUrl, downloadDataUrl } from "@/lib/qrcode";

export function BioSharePanel({ bio }: { bio: BioProfile }) {
  const url = useMemo(
    () => (typeof window !== "undefined" ? `${window.location.origin}/bio/${bio.slug}` : `/bio/${bio.slug}`),
    [bio.slug],
  );

  function copy() {
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  }
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: bio.display_name, text: bio.headline ?? "", url });
      } catch {
        /* user cancelled */
      }
    } else {
      copy();
    }
  }
  async function downloadQr() {
    const dataUrl = await generateQrPngDataUrl(url, 720);
    downloadDataUrl(`qr-${bio.slug}.png`, dataUrl);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={copy}>
        <Copy className="h-4 w-4 mr-1" /> Copiar
      </Button>
      <Button size="sm" variant="outline" onClick={share}>
        <Share2 className="h-4 w-4 mr-1" /> Compartilhar
      </Button>
      <Button size="sm" variant="outline" onClick={downloadQr}>
        <Download className="h-4 w-4 mr-1" /> Baixar QR
      </Button>
      <Button size="sm" variant="secondary" asChild>
        <a href={`/bio/${bio.slug}`} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4 mr-1" /> Abrir
        </a>
      </Button>
    </div>
  );
}

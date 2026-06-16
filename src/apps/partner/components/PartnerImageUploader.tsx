/**
 * PartnerImageUploader — Fase 9E
 * Upload de logo do parceiro para o bucket `uploads` (pasta `partners/<id>/`).
 */
import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  uploadPartnerImage,
  type PartnerImageType,
} from "../services/partnerProfile";

interface Props {
  partnerId: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
  type?: PartnerImageType;
  label?: string;
  disabled?: boolean;
}

export function PartnerImageUploader({
  partnerId,
  currentUrl,
  onUploaded,
  type = "logo",
  label = "Logo",
  disabled,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const url = await uploadPartnerImage(partnerId, file, type);
      onUploaded(url);
      setPreview(url);
      toast.success("Imagem enviada.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha no upload.";
      toast.error(msg);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="mt-1 flex items-center gap-3">
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt={label}
              className="h-20 w-20 rounded-lg object-cover border border-border"
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  onUploaded("");
                }}
                className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive p-1 text-destructive-foreground"
                aria-label="Remover imagem"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ) : (
          <div className="h-20 w-20 rounded-lg border border-dashed border-border bg-muted/40" />
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || disabled}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs hover:border-primary/50 transition disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? "Enviando…" : preview ? "Trocar" : "Enviar"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}

export default PartnerImageUploader;

import { useState, useRef, useEffect } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sha256File } from "@/shared/utils/imageHash";

interface ImageUploadProps {
  folder: string;
  currentUrl: string;
  onUploaded: (url: string, imageHash?: string) => void;
  label?: string;
}

const ImageUpload = ({ folder, currentUrl, onUploaded, label = "Imagem" }: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync preview when currentUrl changes (e.g. from prefill)
  useEffect(() => {
    if (currentUrl && currentUrl !== preview) {
      setPreview(currentUrl);
    }
  }, [currentUrl]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    const imageHash = await sha256File(file);
    const ext = file.name.split(".").pop();
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from("uploads").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      toast.error("Erro no upload: " + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
    onUploaded(urlData.publicUrl, imageHash);
    toast.success("Upload concluído!");
    setUploading(false);
  }

  function handleRemove() {
    setPreview("");
    onUploaded("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
      <div className="mt-1">
        {preview ? (
          <div className="relative inline-block">
            <img src={preview} alt="preview" className="rounded-lg max-h-32 object-cover" />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive p-1 text-destructive-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-lg border border-dashed border-border/50 bg-background px-4 py-3 text-xs text-muted-foreground hover:border-primary/50 transition"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Enviando..." : "Escolher arquivo"}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
};

export default ImageUpload;

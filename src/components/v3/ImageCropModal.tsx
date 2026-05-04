import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, X, ZoomIn, Check } from "lucide-react";
import { toast } from "sonner";

interface ImageCropModalProps {
  open: boolean;
  file: File | null;
  aspect: number; // width/height (1 = avatar, 21/9 = capa)
  maxOutputWidth: number; // 512 avatar, 1920 capa
  quality?: number;
  title?: string;
  onClose: () => void;
  onConfirm: (blob: Blob) => Promise<void> | void;
}

const FRAME_WIDTH = 320;

export default function ImageCropModal({
  open,
  file,
  aspect,
  maxOutputWidth,
  quality = 0.8,
  title = "Ajustar imagem",
  onClose,
  onConfirm,
}: ImageCropModalProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [processing, setProcessing] = useState(false);

  const frameH = FRAME_WIDTH / aspect;

  useEffect(() => {
    if (!file) {
      setSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setSrc(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
  };

  // Base displayed size (cover the frame at zoom=1)
  const baseScale = imgSize.w && imgSize.h
    ? Math.max(FRAME_WIDTH / imgSize.w, frameH / imgSize.h)
    : 1;
  const displayW = imgSize.w * baseScale * zoom;
  const displayH = imgSize.h * baseScale * zoom;

  const clampOffset = useCallback((x: number, y: number) => {
    const maxX = Math.max(0, (displayW - FRAME_WIDTH) / 2);
    const maxY = Math.max(0, (displayH - frameH) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  }, [displayW, displayH, frameH]);

  useEffect(() => {
    setOffset((o) => clampOffset(o.x, o.y));
  }, [zoom, imgSize, clampOffset]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset(clampOffset(dragStart.current.ox + dx, dragStart.current.oy + dy));
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    setDragging(false);
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  const handleConfirm = async () => {
    if (!src || !imgSize.w) return;
    setProcessing(true);
    try {
      const img = new Image();
      img.src = src;
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error("Falha ao carregar imagem"));
      });

      // Map frame crop back to source pixels
      const scale = baseScale * zoom; // displayed px per source px
      const cropSrcW = FRAME_WIDTH / scale;
      const cropSrcH = frameH / scale;
      const centerX = imgSize.w / 2 - offset.x / scale;
      const centerY = imgSize.h / 2 - offset.y / scale;
      const sx = Math.max(0, centerX - cropSrcW / 2);
      const sy = Math.max(0, centerY - cropSrcH / 2);

      const outW = Math.min(maxOutputWidth, Math.round(cropSrcW));
      const outH = Math.round(outW / aspect);

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas indisponível");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, cropSrcW, cropSrcH, 0, 0, outW, outH);

      const blob: Blob = await new Promise((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("Falha ao processar"))), "image/jpeg", quality)
      );

      await onConfirm(blob);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erro ao processar imagem");
    } finally {
      setProcessing(false);
    }
  };

  if (!open || !file || !src) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-2xl border border-primary/30 bg-background/95 backdrop-blur-xl shadow-[0_0_40px_hsl(var(--primary)/0.35)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="font-display text-sm font-bold text-foreground">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/10 transition disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Crop area */}
        <div className="p-4 flex flex-col items-center gap-3">
          <div
            className="relative overflow-hidden bg-black rounded-xl border border-primary/20 select-none touch-none"
            style={{ width: FRAME_WIDTH, height: frameH }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <img
              src={src}
              alt="preview"
              onLoad={onImgLoad}
              draggable={false}
              className="absolute pointer-events-none will-change-transform"
              style={{
                width: displayW,
                height: displayH,
                left: `calc(50% - ${displayW / 2}px)`,
                top: `calc(50% - ${displayH / 2}px)`,
                transform: `translate(${offset.x}px, ${offset.y}px)`,
                cursor: dragging ? "grabbing" : "grab",
              }}
            />
            {/* Grid overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 ring-2 ring-primary/40 rounded-xl" />
            </div>
          </div>

          {/* Zoom */}
          <div className="w-full flex items-center gap-3 px-1">
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-primary"
            />
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            Arraste para posicionar • Use o zoom para enquadrar
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 pb-4">
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-foreground hover:bg-white/10 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={processing}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.5)] hover:brightness-110 transition disabled:opacity-70"
          >
            {processing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
            ) : (
              <><Check className="h-4 w-4" /> Confirmar</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

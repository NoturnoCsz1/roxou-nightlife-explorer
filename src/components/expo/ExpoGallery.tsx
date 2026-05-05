import { useEffect, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, X, Calendar, ImageOff } from "lucide-react";

interface Album {
  title: string;
  date: string;
  badge: string;
  images: string[];
}

const EXPO_GALLERY_ALBUMS: Album[] = [
  {
    title: "Gusttavo Lima na Expo Prudente 2026",
    date: "2026-09-10T22:00:00",
    badge: "10 SET • 22H",
    images: [
      "https://gusttavolima.com.br/wp-content/uploads/2025/10/18-07-sao-paulo-spdjc08186-1.jpg",
      "https://gusttavolima.com.br/wp-content/uploads/2026/04/gl-17-copiar.jpg",
      "https://gusttavolima.com.br/wp-content/uploads/2026/04/gl-95-copiar.jpg",
      "https://gusttavolima.com.br/wp-content/uploads/2026/04/gl-120-copiar.jpg",
      "https://gusttavolima.com.br/wp-content/uploads/2026/04/gl-229.jpg",
      "https://gusttavolima.com.br/wp-content/uploads/2026/04/john4758.jpg",
      "https://gusttavolima.com.br/wp-content/uploads/2025/10/18-07-sao-paulo-spimg_3873.jpg",
      "https://gusttavolima.com.br/wp-content/uploads/2025/10/18-07-sao-paulo-spimg_3874.jpg",
      "https://gusttavolima.com.br/wp-content/uploads/2025/10/18-07-sao-paulo-spimg_3868.jpg",
      "https://gusttavolima.com.br/wp-content/uploads/2025/10/18-07-sao-paulo-spdjc09591.jpg",
      "https://gusttavolima.com.br/wp-content/uploads/2025/10/18-07-sao-paulo-spdjc09356.jpg",
    ],
  },
  {
    title: "Zezé Di Camargo & Luciano na Expo Prudente 2026",
    date: "2026-09-11T22:00:00",
    badge: "11 SET • 22H",
    images: [
      "https://media.gettyimages.com/id/1140426172/pt/foto/sao-paulo-brazil-luciano-camargo-and-zeze-di-camargo-pose-backstage-before-the-concert-at.jpg?s=2048x2048&w=gi&k=20&c=cmpzYBs28DEiada4GLVSPHLL54fYkfh4ZiHPH80mwBE=",
      "https://media.gettyimages.com/id/1140426236/pt/foto/sao-paulo-brazil-zeze-di-camargo-e-luciano-perform-live-on-stage-at-espaco-das-americas-on.jpg?s=2048x2048&w=gi&k=20&c=fNOVDE_Lw_yy8ePDimirNhCjspy2u5he-uheSCpOpuk=",
      "https://media.gettyimages.com/id/1140426235/pt/foto/sao-paulo-brazil-zeze-di-camargo-e-luciano-perform-live-on-stage-at-espaco-das-americas-on.jpg?s=2048x2048&w=gi&k=20&c=_6JbwWLfbfm8Hmx_du1Wz2MZd-fhy_mab1fUo1SHN1I=",
      "https://media.gettyimages.com/id/1140426234/pt/foto/sao-paulo-brazil-zeze-di-camargo-e-luciano-perform-live-on-stage-at-espaco-das-americas-on.jpg?s=2048x2048&w=gi&k=20&c=MOiFEybm9kUQ9ZS75ZAEOzYjLu26Q9GIX4chx3ipPPg=",
      "https://media.gettyimages.com/id/1140426233/pt/foto/sao-paulo-brazil-zeze-di-camargo-e-luciano-perform-live-on-stage-at-espaco-das-americas-on.jpg?s=2048x2048&w=gi&k=20&c=tjmFwFgUYKN8iADEnNifACR9M9A6R4w2jAPqLWY3wJ0=",
      "https://media.gettyimages.com/id/1140426225/pt/foto/sao-paulo-brazil-zeze-di-camargo-e-luciano-perform-live-on-stage-at-espaco-das-americas-on.jpg?s=2048x2048&w=gi&k=20&c=RCi689DpuoY6PndQKnyYNSV6HxbxK-rcEeJ48WpgrKw=",
      "https://media.gettyimages.com/id/1140426219/pt/foto/sao-paulo-brazil-luciano-camargo-member-of-the-duo-zeze-di-camargo-e-luciano-performs-live-on.jpg?s=2048x2048&w=gi&k=20&c=X97uNGYCOZri-HFgxq3IEgOgCrI8uA3J8as4s6vRVik=",
      "https://media.gettyimages.com/id/1140426218/pt/foto/sao-paulo-brazil-zeze-di-camargo-e-luciano-perform-live-on-stage-at-espaco-das-americas-on.jpg?s=2048x2048&w=gi&k=20&c=REX4mSLMYYkUDGFewMAC5EVRFUZSiXYoE1uZDPRehKQ=",
      "https://media.gettyimages.com/id/1140426211/pt/foto/sao-paulo-brazil-luciano-camargo-member-of-the-duo-zeze-di-camargo-e-luciano-performs-live-on.jpg?s=2048x2048&w=gi&k=20&c=VQ7_IW4nOuwRXtGbEC1xWMxvzBmPfN5f50Cbd7OCvuo=",
      "https://media.gettyimages.com/id/1140426209/pt/foto/sao-paulo-brazil-zeze-di-camargo-member-of-the-duo-zeze-di-camargo-e-luciano-performs-live-on.jpg?s=2048x2048&w=gi&k=20&c=CLYYXMbg2_ob3aegXKYNuUlJdHNy-zflblccKGpPa1k=",
    ],
  },
];

function GalleryImage({ src, alt, onClick }: { src: string; alt: string; onClick: () => void }) {
  const [error, setError] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-primary/20 bg-white/5 backdrop-blur-md hover:border-orange-400/50 transition-all shadow-[0_0_30px_-15px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_-5px_rgba(251,146,60,0.5)]"
    >
      {error ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs bg-black/40">
          <ImageOff className="h-6 w-6" />
          <span>Imagem indisponível</span>
        </div>
      ) : (
        <>
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onError={() => setError(true)}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
        </>
      )}
    </button>
  );
}

export default function ExpoGallery() {
  const [lightbox, setLightbox] = useState<{ albumIdx: number; imgIdx: number } | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox]);

  const next = () => {
    if (!lightbox) return;
    const album = EXPO_GALLERY_ALBUMS[lightbox.albumIdx];
    setLightbox({ ...lightbox, imgIdx: (lightbox.imgIdx + 1) % album.images.length });
  };
  const prev = () => {
    if (!lightbox) return;
    const album = EXPO_GALLERY_ALBUMS[lightbox.albumIdx];
    setLightbox({
      ...lightbox,
      imgIdx: (lightbox.imgIdx - 1 + album.images.length) % album.images.length,
    });
  };

  const current = lightbox ? EXPO_GALLERY_ALBUMS[lightbox.albumIdx] : null;

  return (
    <section id="galeria" className="px-4 mx-auto max-w-6xl mt-16">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-yellow-300">
            Galeria premium
          </span>
        </div>
        <h2 className="font-display text-2xl sm:text-4xl font-black">
          📸 Galeria da <span className="text-orange-400">Expo Prudente 2026</span>
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Fotos, bastidores e momentos dos shows confirmados.
        </p>
      </div>

      <div className="space-y-8">
        {EXPO_GALLERY_ALBUMS.map((album, ai) => (
          <article
            key={album.title}
            className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-white/5 to-orange-500/5 backdrop-blur-md p-4 sm:p-6 shadow-[0_0_60px_-30px_rgba(168,85,247,0.5)]"
          >
            <header className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-400/40">
                <Calendar className="h-3 w-3 text-orange-300" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-300">
                  {album.badge}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/15 border border-green-400/40">
                <CheckCircle2 className="h-3 w-3 text-green-300" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-green-300">
                  Show confirmado
                </span>
              </span>
              <h3 className="font-display font-black text-lg sm:text-2xl text-white w-full sm:w-auto sm:ml-1">
                {album.title}
              </h3>
            </header>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {album.images.map((src, i) => (
                <GalleryImage
                  key={src}
                  src={src}
                  alt={`${album.title} — foto ${i + 1}`}
                  onClick={() => setLightbox({ albumIdx: ai, imgIdx: i })}
                />
              ))}
            </div>
          </article>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && current && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(null);
            }}
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-orange-500/30 border border-white/20 flex items-center justify-center text-white transition"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-orange-500/30 border border-white/20 flex items-center justify-center text-white transition"
            aria-label="Próximo"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          <div
            className="relative max-w-5xl w-full max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={current.images[lightbox.imgIdx]}
              alt={current.title}
              className="max-h-[75vh] w-auto rounded-2xl shadow-[0_0_60px_-10px_rgba(251,146,60,0.4)] object-contain"
            />
            <div className="mt-4 text-center">
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-orange-300">
                {current.badge}
              </div>
              <div className="font-display font-black text-base sm:text-xl text-white mt-1">
                {current.title}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {lightbox.imgIdx + 1} / {current.images.length}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

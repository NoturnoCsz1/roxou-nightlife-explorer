import { Instagram, Image as ImageIcon, Heart } from "lucide-react";
import { optimizedImageUrl, optimizedSrcSet } from "@/lib/imageOptimizer";

/**
 * Post vindo do sync IG (Business Discovery). Armazenado em partners.instagram_recent_posts (jsonb).
 * Os campos são exatamente os retornados pela API IG Graph + o que o cron persiste.
 */
interface IGPost {
  id?: string;
  media_url?: string | null;
  thumbnail_url?: string | null;
  permalink?: string | null;
  caption?: string | null;
  like_count?: number | null;
  media_type?: string | null;
  timestamp?: string | null;
}

interface Props {
  handle?: string | null;
  posts?: unknown;
  profilePictureUrl?: string | null;
  followersCount?: number | null;
  lastSyncAt?: string | null;
}

function normalizePosts(raw: unknown): IGPost[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p): p is IGPost => Boolean(p) && typeof p === "object")
    .map((p) => ({
      ...p,
      // proxy para CDN do IG: media_url > thumbnail_url
      media_url: (p as IGPost).media_url || (p as IGPost).thumbnail_url || null,
    }))
    .filter((p) => Boolean(p.media_url));
}

export default function PartnerInstagramFeed({
  handle,
  posts,
  profilePictureUrl,
  followersCount,
  lastSyncAt,
}: Props) {
  const cleanHandle = (handle || "").replace("@", "").trim();
  const normalized = normalizePosts(posts).slice(0, 6);
  const igUrl = cleanHandle ? `https://instagram.com/${cleanHandle}` : null;

  if (!cleanHandle) {
    return (
      <div className="py-10 rounded-xl bg-card border border-border/20 text-center">
        <div className="w-12 h-12 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-3">
          <Instagram className="w-6 h-6 text-muted-foreground/20" />
        </div>
        <p className="text-xs text-muted-foreground font-medium">Instagram não conectado</p>
      </div>
    );
  }

  // Real posts grid
  if (normalized.length > 0) {
    return (
      <div>
        <div className="flex items-center gap-2.5 mb-3 px-0.5">
          {profilePictureUrl && (
            <img
              src={profilePictureUrl}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover border border-primary/30"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground truncate">@{cleanHandle}</p>
            {typeof followersCount === "number" && followersCount > 0 && (
              <p className="text-[10px] text-muted-foreground">
                {followersCount.toLocaleString("pt-BR")} seguidores
              </p>
            )}
          </div>
          {igUrl && (
            <a
              href={igUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-extrabold uppercase tracking-wider text-primary px-2.5 py-1 rounded-full border border-primary/30 hover:bg-primary/10 transition-colors"
            >
              Seguir
            </a>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {normalized.map((post, i) => (
            <a
              key={post.id || post.permalink || i}
              href={post.permalink || igUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="aspect-square rounded-lg overflow-hidden relative group bg-card"
            >
              <img
                src={optimizedImageUrl(post.media_url!, 320, 70) || post.media_url!}
                srcSet={optimizedSrcSet(post.media_url!, [240, 480], 70)}
                sizes="(max-width: 640px) 30vw, 200px"
                alt={post.caption?.slice(0, 80) || `Post ${i + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  // CDN do IG expira: cai num fallback discreto
                  const target = e.currentTarget as HTMLImageElement;
                  target.style.display = "none";
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector(".ig-fallback")) {
                    const div = document.createElement("div");
                    div.className =
                      "ig-fallback absolute inset-0 bg-gradient-to-br from-card via-card to-primary/10 flex items-center justify-center";
                    div.innerHTML =
                      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary/40"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>';
                    parent.appendChild(div);
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                {typeof post.like_count === "number" && post.like_count > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-white">
                    <Heart className="w-2.5 h-2.5 fill-white" />
                    {post.like_count.toLocaleString("pt-BR")}
                  </span>
                )}
              </div>
            </a>
          ))}
        </div>

        <a
          href={igUrl!}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 mt-3 py-2.5 rounded-xl bg-card border border-border/30 text-[11px] text-primary font-semibold hover:border-primary/30 transition-colors"
        >
          <Instagram className="w-3.5 h-3.5" /> Ver mais no Instagram
        </a>

        {lastSyncAt && (
          <p className="text-[9px] text-muted-foreground/60 text-center mt-1.5">
            Atualizado automaticamente via Instagram
          </p>
        )}
      </div>
    );
  }

  // Fallback: premium placeholder quando ainda não há sync
  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <a
            key={i}
            href={igUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="aspect-square rounded-lg overflow-hidden relative group"
          >
            <div className="w-full h-full bg-gradient-to-br from-card via-card to-primary/5 flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-muted-foreground/15" />
            </div>
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Instagram className="w-4 h-4 text-primary/40" />
            </div>
          </a>
        ))}
      </div>
      <a
        href={igUrl!}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 mt-3 py-2.5 rounded-xl bg-card border border-border/30 text-[11px] text-primary font-semibold hover:border-primary/30 transition-colors"
      >
        <Instagram className="w-3.5 h-3.5" /> Seguir @{cleanHandle}
      </a>
      <p className="text-[9px] text-muted-foreground/50 text-center mt-1.5">
        Em breve, os posts reais aparecerão aqui automaticamente
      </p>
    </div>
  );
}

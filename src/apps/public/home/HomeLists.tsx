// ─── HomeLists — cards de ranking de locais e parceiros em destaque ───
// Extraído de src/pages/v3/V3Home.tsx (Fase 5). JSX, classes e estilos idênticos.

import { Link } from "react-router-dom";
import { BadgeCheck, CalendarDays, ChevronRight, Crown, Eye, Heart } from "lucide-react";
import type { VenueRank } from "./types";

/* ─── VENUE SPOTLIGHT (#1) — dominant card ─── */
export function VenueSpotlight({ v }: { v: VenueRank; maxViews: number }) {
  return (
    <Link
      to={`/local/${v.slug}`}
      className="relative flex items-center gap-4 p-4 mt-4 rounded-2xl bg-card border-2 border-primary/40 neon-border group overflow-hidden active:scale-[0.98] transition-transform"
    >
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 blur-3xl rounded-full" />
      <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-accent/8 blur-2xl rounded-full" />

      <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full gradient-primary neon-glow">
        <Crown className="w-3.5 h-3.5 text-primary-foreground" />
        <span className="text-[10px] font-black text-primary-foreground">#1</span>
      </div>

      <div className="w-16 h-16 rounded-xl bg-secondary overflow-hidden shrink-0 ring-2 ring-primary/40 shadow-lg">
        {v.logo_url ? (
          <img src={v.logo_url} alt={v.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary font-bold text-xl">{v.name[0]}</div>
        )}
      </div>

      <div className="flex-1 min-w-0 relative">
        <div className="flex items-center gap-1.5">
          <p className="font-display font-bold text-base text-foreground truncate">{v.name}</p>
          {v.verified_partner && <BadgeCheck className="w-4 h-4 text-accent shrink-0" />}
        </div>
        <p className="text-[10px] text-muted-foreground capitalize">{v.type}</p>

        <div className="flex items-center gap-3 mt-1.5">
          <span className="flex items-center gap-1 text-[10px] font-semibold text-primary">
            <Eye className="w-3 h-3" /> {v.views} views
          </span>
          {v.upcoming_events > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-accent">
              <CalendarDays className="w-3 h-3" /> {v.upcoming_events} evento{v.upcoming_events > 1 ? "s" : ""}
            </span>
          )}
          {(v.follower_count || 0) > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <Heart className="w-3 h-3" /> {v.follower_count}
            </span>
          )}
        </div>

        <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full gradient-primary transition-all duration-700 neon-glow" style={{ width: "100%" }} />
        </div>
        <p className="text-[9px] text-primary font-semibold mt-1">🔥 Mais acessado da semana</p>
      </div>
    </Link>
  );
}

/* ─── VENUE RANK CARD (#2-#5) ─── */
export function VenueRankCard({ v, rank, maxViews }: { v: VenueRank; rank: number; maxViews: number }) {
  const pct = Math.max(15, Math.round((v.views / maxViews) * 100));
  return (
    <Link
      to={`/local/${v.slug}`}
      className="flex flex-col p-3 rounded-xl bg-card border border-border/40 hover:border-primary/20 transition-all group active:scale-[0.97]"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`font-display font-black text-sm w-6 text-center ${rank <= 3 ? "text-primary" : "text-muted-foreground"}`}>#{rank}</span>
        <div className="w-9 h-9 rounded-lg bg-secondary overflow-hidden shrink-0">
          {v.logo_url ? (
            <img src={v.logo_url} alt={v.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px] font-bold">{v.name[0]}</div>
          )}
        </div>
        {v.verified_partner && <BadgeCheck className="w-3.5 h-3.5 text-accent ml-auto" />}
      </div>
      <p className="font-display font-semibold text-[12px] text-foreground truncate leading-tight">{v.name}</p>
      <p className="text-[9px] text-muted-foreground capitalize">{v.type}</p>
      <div className="flex items-center gap-2 mt-1.5 text-[9px] text-muted-foreground">
        <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" /> {v.views}</span>
        {v.upcoming_events > 0 && <span className="text-primary font-medium">{v.upcoming_events} ev.</span>}
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full gradient-primary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </Link>
  );
}

/* ─── FEATURED PARTNER CARD ─── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function FeaturedPartnerCard({ p }: { p: any }) {
  const rankLabel = p._rank && p._rank <= 3 ? `📈 Top ${p._rank} mais acessado` : null;
  return (
    <Link
      to={`/local/${p.slug}`}
      className="shrink-0 snap-start w-[200px] rounded-xl bg-card border border-border/40 hover:border-accent/30 transition-all overflow-hidden group active:scale-[0.97]"
    >
      <div className="relative h-[80px] bg-secondary overflow-hidden">
        {p.logo_url ? (
          <img src={p.logo_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/10">
            <span className="font-display font-bold text-2xl text-primary/60">{p.name[0]}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        {p.verified_partner && (
          <div className="absolute top-2 right-2">
            <BadgeCheck className="w-4 h-4 text-accent drop-shadow-md" />
          </div>
        )}
      </div>
      <div className="p-3 space-y-1">
        <p className="font-display font-bold text-[13px] text-foreground truncate">{p.name}</p>
        <p className="text-[9px] text-muted-foreground capitalize">{p.type}</p>
        {p.upcoming_events > 0 && (
          <p className="text-[10px] font-medium text-primary">
            🔥 {p.upcoming_events} evento{p.upcoming_events > 1 ? "s" : ""} essa semana
          </p>
        )}
        {rankLabel && <p className="text-[10px] font-medium text-accent">{rankLabel}</p>}
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary mt-1">
          Ver agenda <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </Link>
  );
}

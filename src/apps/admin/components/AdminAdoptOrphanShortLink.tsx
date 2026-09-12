/**
 * AdminAdoptOrphanShortLink — Adoção administrativa de short links órfãos
 * (banco OFICIAL).
 *
 * Usa exclusivamente:
 * - `partnerSupabase`: cliente oficial dedicado (sessão em `roxou.partner.auth`);
 * - RPC oficial `public.admin_adopt_orphan_short_link(_slug, _venue_id)`
 *   (migration 0007) — a função revalida admin/superadmin, orfandade e
 *   tenancy no servidor; esta tela é apenas a interface da operação.
 *
 * Visível somente quando `public.is_admin_or_superadmin()` retorna true.
 * Não altera RPC, trigger ou RLS. Não usa service_role. Não armazena senha.
 */
import { useEffect, useState } from "react";
import {
  Link2, Search, ShieldCheck, Loader2, Building2, Check,
} from "lucide-react";
import { partnerSupabase } from "@/apps/partner/backend/partnerSupabase";

type AdminCheck = "checking" | "no-session" | "not-admin" | "admin";

type OrphanLink = {
  id: string;
  slug: string;
  title: string | null;
  venue_id: string | null;
  organization_id: string | null;
  created_by: string | null;
  is_active: boolean;
  show_on_bio: boolean | null;
  [key: string]: unknown;
};

type VenueOption = { id: string; name: string | null; city: string | null };

function isOrphan(l: OrphanLink): boolean {
  return !l.venue_id && !l.organization_id && !l.created_by;
}

export default function AdminAdoptOrphanShortLink() {
  const [check, setCheck] = useState<AdminCheck>("checking");
  const [slug, setSlug] = useState("");
  const [searching, setSearching] = useState(false);
  const [link, setLink] = useState<OrphanLink | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [venueQuery, setVenueQuery] = useState("");
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [venue, setVenue] = useState<VenueOption | null>(null);
  const [searchingVenues, setSearchingVenues] = useState(false);

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await partnerSupabase.auth.getSession();
      if (!sessionData?.session) {
        if (!cancelled) setCheck("no-session");
        return;
      }
      // Checagem oficial de admin/superadmin do banco oficial.
      const { data: isAdmin, error } = await partnerSupabase.rpc(
        "is_admin_or_superadmin" as never,
      );
      if (cancelled) return;
      if (error) {
        console.error("[AdoptOrphanShortLink] is_admin_or_superadmin:", error);
        setCheck("not-admin");
        return;
      }
      setCheck(isAdmin ? "admin" : "not-admin");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function searchLink() {
    const s = slug.trim().toLowerCase();
    if (!s) return;
    setSearching(true);
    setSearchError(null);
    setLink(null);
    setResult(null);
    const { data, error } = await partnerSupabase
      .from("short_links")
      .select("*")
      .eq("slug", s)
      .maybeSingle();
    setSearching(false);
    if (error) {
      setSearchError(error.message);
      return;
    }
    if (!data) {
      setSearchError(`Nenhum link encontrado com o código "${s}".`);
      return;
    }
    setLink(data as OrphanLink);
  }

  async function searchVenues() {
    const qv = venueQuery.trim();
    if (qv.length < 2) return;
    setSearchingVenues(true);
    const { data, error } = await partnerSupabase
      .from("venues")
      .select("id, name, city")
      .ilike("name", `%${qv}%`)
      .order("name", { ascending: true })
      .limit(10);
    setSearchingVenues(false);
    if (error) {
      setSearchError(`Busca de estabelecimentos: ${error.message}`);
      return;
    }
    setVenues((data ?? []) as VenueOption[]);
  }

  async function adopt() {
    if (!link || !venue || running) return;
    const confirmed = window.confirm(
      `Vincular o link "${link.slug}" ao estabelecimento "${venue.name ?? venue.id}"?\n\n` +
        "A RPC oficial preencherá venue_id e organization_id (derivada do " +
        "estabelecimento). Código, título, destino, cliques e data de criação " +
        "são preservados. Continuar?",
    );
    if (!confirmed) return;
    setRunning(true);
    setResult(null);
    try {
      const { data, error } = await partnerSupabase.rpc(
        "admin_adopt_orphan_short_link" as never,
        { _slug: link.slug, _venue_id: venue.id } as never,
      );
      if (error) {
        setResult(`error: ${JSON.stringify(error, null, 2)}`);
      } else {
        setResult(`data: ${JSON.stringify(data, null, 2)}`);
        // Recarrega o registro para refletir o vínculo.
        void searchLink();
      }
    } catch (err) {
      setResult(`error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunning(false);
    }
  }

  if (check === "checking") return null;
  if (check === "no-session" || check === "not-admin") {
    // Invisível para não-admin; para admin sem sessão oficial, mostramos a dica.
    if (check === "not-admin") return null;
    return (
      <div className="rounded-xl border border-border/50 bg-card/40 p-4 text-xs text-muted-foreground">
        Adoção de links órfãos (banco oficial): entre no Partner Pro com uma
        conta admin/superadmin para habilitar esta ferramenta.
      </div>
    );
  }

  const orphan = link ? isOrphan(link) : false;

  return (
    <section className="rounded-xl border border-amber-500/30 bg-card/60 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-amber-500/15 text-amber-400 p-2">
          <ShieldCheck className="w-4 h-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Adoção de link órfão (banco oficial)
          </h2>
          <p className="text-xs text-muted-foreground">
            Vincula um short link sem dono a um estabelecimento oficial, via RPC
            segura. Visível apenas para admin/superadmin.
          </p>
        </div>
      </div>

      {/* Passo 1: localizar o link */}
      <div className="flex gap-2">
        <div className="flex items-center gap-2 flex-1 bg-background border border-border rounded-lg px-3 py-2">
          <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void searchLink()}
            placeholder="Código do link (ex.: expo2026)"
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
        <button
          onClick={() => void searchLink()}
          disabled={searching || !slug.trim()}
          className="px-3 py-2 rounded-lg bg-muted hover:bg-muted/70 text-sm flex items-center gap-2 disabled:opacity-60"
        >
          {searching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Pesquisar
        </button>
      </div>

      {searchError && (
        <p className="text-xs text-destructive whitespace-pre-wrap">{searchError}</p>
      )}

      {link && (
        <div className="rounded-lg border border-border/50 bg-background/40 p-3 space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono text-primary">roxou.click/{link.slug}</span>
            {orphan ? (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
                Órfão
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                Já vinculado
              </span>
            )}
          </div>
          <p className="text-muted-foreground">
            Título: {link.title ?? "—"} · Ativo: {link.is_active ? "sim" : "não"} ·
            Na Bio: {link.show_on_bio ? "sim" : "não"}
          </p>
          {!orphan && (
            <p className="text-muted-foreground">
              Este link já possui estabelecimento, organização ou criador. A RPC
              recusaria a adoção — nenhuma ação disponível.
            </p>
          )}
        </div>
      )}

      {/* Passo 2: escolher o estabelecimento (somente se órfão) */}
      {link && orphan && (
        <>
          <div className="flex gap-2">
            <div className="flex items-center gap-2 flex-1 bg-background border border-border rounded-lg px-3 py-2">
              <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                value={venueQuery}
                onChange={(e) => setVenueQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void searchVenues()}
                placeholder="Buscar estabelecimento oficial por nome…"
                className="flex-1 bg-transparent outline-none text-sm"
              />
            </div>
            <button
              onClick={() => void searchVenues()}
              disabled={searchingVenues || venueQuery.trim().length < 2}
              className="px-3 py-2 rounded-lg bg-muted hover:bg-muted/70 text-sm flex items-center gap-2 disabled:opacity-60"
            >
              {searchingVenues ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Buscar
            </button>
          </div>

          {venues.length > 0 && (
            <ul className="rounded-lg border border-border/50 divide-y divide-border/40 overflow-hidden">
              {venues.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => setVenue(v)}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 hover:bg-muted/40 ${
                      venue?.id === v.id ? "bg-primary/10" : ""
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block font-medium truncate">
                        {v.name ?? "(sem nome)"}
                      </span>
                      <span className="block text-xs text-muted-foreground truncate">
                        {v.city ?? "—"} · {v.id}
                      </span>
                    </span>
                    {venue?.id === v.id && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={() => void adopt()}
            disabled={!venue || running}
            className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {running && <Loader2 className="w-4 h-4 animate-spin" />}
            {running
              ? "Vinculando..."
              : `Vincular "${link.slug}"${venue ? ` a "${venue.name ?? ""}"` : ""}`}
          </button>
        </>
      )}

      {result && (
        <pre className="text-xs whitespace-pre-wrap break-all rounded-md bg-background/40 border border-border/50 p-3 max-h-64 overflow-auto">
          {result}
        </pre>
      )}
    </section>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search, X } from "lucide-react";
import SEO from "@/components/SEO";
import { BdaLayout } from "@/components/bda/BdaLayout";
import BdaParticipantCard from "@/components/bda/BdaParticipantCard";
import { BDA_PAGE_SIZE, BDA_ROUTES } from "@/components/bda/bdaConfig";
import {
  BdaPublicEntry,
  BdaPublicStats,
  fetchPublicStats,
  listPublicEntries,
} from "@/modules/bda/bdaService";
import { useBdaSettings } from "@/modules/bda/useBdaSettings";

const CANONICAL = "https://roxou.com.br/batalhadeaura/participantes";

type Filter = "todos" | "solo" | "dupla";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "todos", label: "Todos" },
  { id: "solo", label: "Solo" },
  { id: "dupla", label: "Dupla" },
];

export default function BdaParticipantes() {
  const { settings } = useBdaSettings();
  const [entries, setEntries] = useState<BdaPublicEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<Filter>("todos");
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<BdaPublicStats | null>(null);
  const reqId = useRef(0);

  /* Debounce da busca — evita consultas excessivas no celular. */
  useEffect(() => {
    const id = setTimeout(() => setSearch(term.trim()), 400);
    return () => clearTimeout(id);
  }, [term]);

  useEffect(() => {
    fetchPublicStats().then(setStats).catch(() => setStats(null));
  }, []);

  const load = useCallback(
    async (nextPage: number, append: boolean) => {
      const id = ++reqId.current;
      if (append) setLoadingMore(true);
      else setEntries(null);
      setError(null);
      try {
        const res = await listPublicEntries({
          search,
          category: filter,
          page: nextPage,
          pageSize: BDA_PAGE_SIZE,
        });
        if (id !== reqId.current) return;
        setTotal(res.total);
        setEntries((prev) => (append && prev ? [...prev, ...res.entries] : res.entries));
        setPage(nextPage);
      } catch {
        if (id !== reqId.current) return;
        setError("Não foi possível carregar os participantes. Verifique sua conexão e tente novamente.");
        setEntries([]);
      } finally {
        if (id === reqId.current) setLoadingMore(false);
      }
    },
    [search, filter],
  );

  useEffect(() => {
    load(0, false);
  }, [load]);

  const hasMore = entries !== null && entries.length < total;

  return (
    <BdaLayout>
      <SEO
        title="Participantes Confirmados | Batalha de Aura PP"
        description="Lista oficial de participantes confirmados da Batalha de Aura PP, publicada somente com aprovação da organização e autorização expressa."
        canonical={CANONICAL}
        ogType="website"
      />
      <section className="px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <h1 className="bda-font-display text-center text-2xl font-black uppercase text-white sm:text-4xl [text-shadow:0_0_24px_rgba(168,85,247,0.5)]">
            Participantes confirmados
          </h1>
          <p className="bda-font-body mx-auto mt-3 max-w-xl text-center text-sm text-[#C8D2E0]/70">
            Exibimos apenas inscrições aprovadas pela organização e com autorização expressa de
            exibição. Nenhum dado pessoal sensível é publicado.
          </p>

          {/* ===== Estatísticas reais ===== */}
          {stats && stats.total_registrations > 0 && (
            <div className="mx-auto mt-8 grid max-w-lg grid-cols-3 gap-2 sm:gap-3">
              {[
                { v: stats.total_registrations, l: "Inscrições" },
                { v: stats.solo_participants, l: "Solo" },
                { v: stats.duplas, l: "Duplas" },
              ].map((s) => (
                <div
                  key={s.l}
                  className="rounded-2xl border border-[#C8D2E0]/12 bg-white/[0.03] px-2 py-3 text-center"
                >
                  <div className="bda-font-display text-xl font-black text-white sm:text-2xl">
                    {s.v}
                  </div>
                  <div className="bda-font-body text-[10px] uppercase tracking-[0.18em] text-[#C8D2E0]/60">
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ===== Busca ===== */}
          <div className="mx-auto mt-8 max-w-md">
            <label htmlFor="bda-busca" className="sr-only">
              Buscar participante ou dupla
            </label>
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C8D2E0]/50"
              />
              <input
                id="bda-busca"
                type="search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Buscar por nome público ou dupla"
                className="bda-font-body h-12 w-full rounded-full border border-[#C8D2E0]/18 bg-white/[0.04] pl-11 pr-10 text-sm text-white outline-none placeholder:text-[#C8D2E0]/40 focus-visible:border-[#A855F7] focus-visible:ring-2 focus-visible:ring-[#A855F7]/40"
              />
              {term && (
                <button
                  type="button"
                  aria-label="Limpar busca"
                  onClick={() => setTerm("")}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#C8D2E0]/60 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* ===== Filtros ===== */}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`bda-font-display min-h-11 rounded-full border px-5 text-[11px] font-bold uppercase tracking-[0.16em] transition focus-visible:ring-2 focus-visible:ring-[#A855F7]/60 ${
                  filter === f.id
                    ? "border-[#A855F7] bg-[#A855F7]/15 text-white"
                    : "border-[#C8D2E0]/18 text-[#C8D2E0]/60 hover:border-[#2E7DFF]/45"
                }`}
              >
                {f.label}
              </button>
            ))}
            <span className="bda-font-body flex min-h-11 items-center rounded-full border border-[#C8D2E0]/12 px-4 text-[11px] uppercase tracking-[0.14em] text-[#C8D2E0]/45">
              Mais recentes primeiro
            </span>
          </div>

          {/* ===== Lista ===== */}
          <div className="mt-9">
            {!settings.public_list_enabled ? (
              <p className="bda-font-body text-center text-sm text-[#C8D2E0]/70">
                A lista pública de participantes ainda não foi liberada pela organização.
              </p>
            ) : entries === null ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-52 animate-pulse rounded-2xl bg-white/[0.04]" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center">
                <p className="bda-font-body text-sm text-[#FFB4B4]">{error}</p>
                <button
                  type="button"
                  onClick={() => load(0, false)}
                  className="bda-font-display mt-4 inline-flex h-11 items-center rounded-full border border-[#C8D2E0]/25 px-6 text-xs font-bold uppercase tracking-[0.18em] text-white"
                >
                  Tentar novamente
                </button>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center">
                <p className="bda-font-body text-sm text-[#C8D2E0]/70">
                  {search
                    ? "Nenhum participante encontrado com esse nome."
                    : "Os primeiros participantes confirmados aparecerão aqui em breve."}
                </p>
                {!search && (
                  <Link
                    to={BDA_ROUTES.home}
                    className="bda-font-display mt-6 inline-flex h-11 items-center rounded-full border border-[#A855F7]/45 px-6 text-xs font-bold uppercase tracking-[0.18em] text-white"
                  >
                    Voltar ao campeonato
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {entries.map((e) => (
                    <BdaParticipantCard key={e.registrationId} entry={e} />
                  ))}
                </div>
                {hasMore && (
                  <div className="mt-8 text-center">
                    <button
                      type="button"
                      disabled={loadingMore}
                      onClick={() => load(page + 1, true)}
                      className="bda-font-display inline-flex h-12 items-center gap-2 rounded-full border border-[#A855F7]/45 px-8 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#A855F7]/12 disabled:opacity-60"
                    >
                      {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                      Carregar mais
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mt-12 text-center">
            <Link
              to={BDA_ROUTES.privacidade}
              className="bda-font-body text-[11px] uppercase tracking-[0.16em] text-[#C8D2E0]/50 underline underline-offset-4 hover:text-white"
            >
              Privacidade e proteção de dados
            </Link>
          </div>
        </div>
      </section>
    </BdaLayout>
  );
}

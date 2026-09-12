/**
 * PublicVenueBioPage — página pública da Roxou Bio.
 *
 * URL conceitual: parceiro.click/{venues.slug}
 * Rota de teste na build atual: /p/{slug}
 *
 * Renderiza EXCLUSIVAMENTE o JSON de `public.public_get_venue_bio(slug)`.
 * Nenhuma tabela protegida é consultada aqui. Links apontam sempre para
 * https://roxou.click/{slug}, preservando o tracking oficial.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getPublicVenueBio,
  type PublicBioPayload,
} from "@modules/partner/bio/converged/venueBioService";

const THEME_BG: Record<string, string> = {
  roxou_dark: "bg-[#0b0510] text-white",
  roxou_neon: "bg-[#120425] text-white",
  minimal_dark: "bg-neutral-950 text-neutral-100",
  minimal_light: "bg-neutral-50 text-neutral-900",
};

const PublicVenueBioPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<PublicBioPayload | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "empty">("loading");

  useEffect(() => {
    let alive = true;
    setState("loading");
    getPublicVenueBio(slug ?? "")
      .then((payload) => {
        if (!alive) return;
        if (payload?.venue) {
          setData(payload);
          setState("ready");
        } else {
          setState("empty");
        }
      })
      .catch(() => alive && setState("empty"));
    return () => {
      alive = false;
    };
  }, [slug]);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0510]">
        <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
      </div>
    );
  }

  if (state === "empty" || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 bg-[#0b0510] p-6 text-center text-white">
        <h1 className="text-lg font-semibold">Página indisponível</h1>
        <p className="text-sm text-white/60">
          Esta Bio não existe ou ainda não foi publicada.
        </p>
      </div>
    );
  }

  const { venue, bio, links, events } = data;
  const accent = bio.accent_color || "#A020F0";
  const themeClass = THEME_BG[bio.theme] ?? THEME_BG.roxou_dark;

  return (
    <main className={`min-h-screen ${themeClass}`}>
      {venue.cover_url ? (
        <img
          src={venue.cover_url}
          alt={`Capa de ${venue.name}`}
          className="h-40 w-full object-cover sm:h-56"
          loading="lazy"
        />
      ) : null}

      <div className="mx-auto w-full max-w-md px-4 pb-16">
        <header className="-mt-10 flex flex-col items-center text-center">
          {venue.logo_url ? (
            <img
              src={venue.logo_url}
              alt={venue.name}
              className="h-20 w-20 rounded-2xl border-2 object-cover"
              style={{ borderColor: accent }}
              loading="lazy"
            />
          ) : null}
          <h1 className="mt-3 text-xl font-bold">{venue.name}</h1>
          {bio.headline ? (
            <p className="mt-1 text-sm opacity-80">{bio.headline}</p>
          ) : null}
          {venue.city ? (
            <p className="mt-1 text-xs opacity-60">{venue.city}</p>
          ) : null}
        </header>

        {bio.primary_cta_label && bio.primary_cta_url ? (
          <a
            href={bio.primary_cta_url}
            target="_blank"
            rel="noreferrer"
            className="mt-5 block rounded-xl px-4 py-3 text-center text-sm font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            {bio.primary_cta_label}
          </a>
        ) : null}

        {bio.about ? (
          <p className="mt-5 whitespace-pre-line text-center text-sm opacity-80">
            {bio.about}
          </p>
        ) : null}

        {bio.show_links && links.length > 0 ? (
          <section className="mt-6 space-y-2">
            {links.map((l) => (
              <a
                key={l.slug}
                href={l.short_url}
                className="block rounded-xl border px-4 py-3 text-center text-sm font-medium"
                style={{ borderColor: accent }}
              >
                {l.title || l.slug}
              </a>
            ))}
          </section>
        ) : null}

        {bio.show_events && events.length > 0 ? (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide opacity-70">
              Próximos eventos
            </h2>
            <ul className="space-y-3">
              {events.map((ev) => (
                <li key={ev.id} className="overflow-hidden rounded-xl border border-white/10">
                  {ev.cover_image ? (
                    <img
                      src={ev.cover_image}
                      alt={ev.title}
                      className="h-36 w-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <div className="p-3">
                    <p className="text-sm font-semibold">{ev.title}</p>
                    <p className="text-xs opacity-70">
                      {ev.start_date
                        ? new Date(`${ev.start_date}T${ev.start_time ?? "00:00"}:00-03:00`)
                            .toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                            })
                        : ""}
                      {ev.start_time ? ` · ${ev.start_time.slice(0, 5)}` : ""}
                      {ev.is_free ? " · Entrada gratuita" : ""}
                    </p>
                    {ev.ticket_url ? (
                      <a
                        href={ev.ticket_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-xs font-semibold"
                        style={{ color: accent }}
                      >
                        Ingressos
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <footer className="mt-10 text-center text-[11px] opacity-50">
          Roxou Bio · roxou.com.br
        </footer>
      </div>
    </main>
  );
};

export default PublicVenueBioPage;

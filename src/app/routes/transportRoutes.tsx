import { lazy } from "react";
import { Route, useLocation, Navigate } from "react-router-dom";
import { L } from "./lazyFallback";

/**
 * Sub-árvore de Transporte (Onda 3 — isolamento por produto).
 *
 * IMPORTANTE:
 *  - Estas rotas são FILHAS de `<Route path="/" element={<PublicLayout />}>`
 *    definido em `publicRoutes.tsx`. Não altere esta hierarquia sem
 *    revalidar o header/footer público do PublicLayout.
 *  - Inclui caronas, excursões, privativo e área do motorista.
 *  - URLs preservadas 1:1.
 */
const V3Transport = lazy(() => import("@/pages/v3/V3Transport"));
const V3RideRequest = lazy(() => import("@/pages/v3/V3RideRequest"));
const V3DriverBoard = lazy(() => import("@/pages/v3/V3DriverBoard"));
const V3MyRides = lazy(() => import("@/pages/v3/V3MyRides"));
const V3Chat = lazy(() => import("@/pages/v3/V3Chat"));
const TransportesHubPage = lazy(
  () => import("@/pages/transportes/TransportesHubPage"),
);
const ExcursoesListPage = lazy(
  () => import("@/pages/transportes/ExcursoesListPage"),
);
const ExcursaoDetailPage = lazy(
  () => import("@/pages/transportes/ExcursaoDetailPage"),
);
const ExcursaoAssentosPage = lazy(
  () => import("@/pages/transportes/ExcursaoAssentosPage"),
);
const ExcursaoPassageiroPage = lazy(
  () => import("@/pages/transportes/ExcursaoPassageiroPage"),
);
const ExcursaoConfirmacaoPage = lazy(
  () => import("@/pages/transportes/ExcursaoConfirmacaoPage"),
);
const AcompanharExcursaoPage = lazy(
  () => import("@/pages/transportes/AcompanharExcursaoPage"),
);
const PrivativoPlaceholder = lazy(
  () => import("@/pages/transportes/PrivativoPlaceholder"),
);
const TransportesComingSoon = lazy(
  () => import("@/pages/transportes/TransportesComingSoon"),
);
const MinhasViagensPage = lazy(
  () => import("@/pages/transportes/MinhasViagensPage"),
);
const MotoristaHubPage = lazy(
  () => import("@/pages/transportes/MotoristaHubPage"),
);
const MotoristaGpsPage = lazy(
  () => import("@/pages/transportes/motorista/MotoristaGpsPage"),
);

/** Redireciona /transportes/excursao/:slug (legacy) para /transportes/excursoes/:slug. */
function RedirectExcursaoLegacy() {
  const { pathname, search, hash } = useLocation();
  const target = pathname.replace(
    "/transportes/excursao/",
    "/transportes/excursoes/",
  );
  return <Navigate to={`${target}${search}${hash}`} replace />;
}

export const TransportRoutes = () => (
  <>
    <Route path="transporte" element={L(<V3Transport />)} />
    <Route path="transportes" element={L(<TransportesHubPage />)} />

    {/* Caronas */}
    <Route path="transportes/caronas" element={L(<V3Transport />)} />
    <Route path="transportes/caronas/oferecer" element={L(<V3DriverBoard />)} />
    <Route path="transportes/caronas/procurar" element={L(<V3RideRequest />)} />
    <Route path="transportes/caronas/minhas" element={L(<V3MyRides />)} />
    <Route
      path="transportes/caronas/motorista"
      element={L(<V3DriverBoard />)}
    />

    {/* Excursões */}
    <Route path="transportes/excursoes" element={L(<ExcursoesListPage />)} />
    <Route
      path="transportes/excursoes/:slug"
      element={L(<ExcursaoDetailPage />)}
    />
    <Route
      path="transportes/excursoes/:slug/assentos"
      element={L(<ExcursaoAssentosPage />)}
    />
    <Route
      path="transportes/excursoes/:slug/passageiro"
      element={L(<ExcursaoPassageiroPage />)}
    />
    <Route
      path="transportes/excursoes/:slug/confirmacao"
      element={L(<ExcursaoConfirmacaoPage />)}
    />
    <Route
      path="transportes/excursao/:slug"
      element={<RedirectExcursaoLegacy />}
    />

    <Route
      path="transportes/acompanhar/:token"
      element={L(<AcompanharExcursaoPage />)}
    />

    {/* Privativo */}
    <Route path="transportes/privativo" element={L(<PrivativoPlaceholder />)} />
    <Route
      path="transportes/privativo/solicitar"
      element={L(
        <TransportesComingSoon
          title="Solicitar transporte privativo"
          description="Reserve ida e volta com motorista exclusivo para o evento."
          emoji="🚖"
        />,
      )}
    />
    <Route
      path="transportes/privativo/minhas"
      element={L(
        <TransportesComingSoon
          title="Minhas viagens privativas"
          description="Acompanhe seus pedidos de transporte privativo."
          emoji="🚖"
        />,
      )}
    />
    <Route
      path="transportes/privativo/motoristas"
      element={L(
        <TransportesComingSoon
          title="Motoristas parceiros"
          description="Veja os motoristas habilitados para o transporte privativo."
          emoji="🚖"
        />,
      )}
    />

    <Route path="transportes/minhas" element={L(<MinhasViagensPage />)} />

    {/* Motorista */}
    <Route path="transportes/motorista" element={L(<MotoristaHubPage />)} />
    <Route
      path="transportes/motorista/viagens"
      element={L(
        <TransportesComingSoon
          title="Próximas viagens"
          description="Lista das viagens em que você é o motorista."
          emoji="🚍"
        />,
      )}
    />
    <Route
      path="transportes/motorista/gps"
      element={L(<MotoristaGpsPage />)}
    />
    <Route
      path="transportes/motorista/checkins"
      element={L(
        <TransportesComingSoon
          title="Embarques"
          description="Confirme passageiros embarcados e pendentes."
          emoji="🎫"
        />,
      )}
    />

    <Route path="motorista" element={L(<V3DriverBoard />)} />
    <Route path="chat/:requestId" element={L(<V3Chat />)} />
    <Route path="meus-pedidos" element={L(<V3MyRides />)} />
  </>
);

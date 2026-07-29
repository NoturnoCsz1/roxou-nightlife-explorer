import { lazy } from "react";
import { Route } from "react-router-dom";
import { L } from "./lazyFallback";

/**
 * Hotsite Batalha de Aura PP — árvore de rotas isolada.
 * Nenhuma rota existente da Roxou é afetada.
 */
const BatalhaDeAura = lazy(() => import("@/pages/batalhadeaura/BatalhaDeAura"));
const BdaComingSoon = lazy(() => import("@/pages/batalhadeaura/BdaComingSoon"));
const BdaInscricao = lazy(() => import("@/pages/batalhadeaura/BdaInscricao"));
const BdaParticipantes = lazy(
  () => import("@/pages/batalhadeaura/BdaParticipantes"),
);
const BdaConfirmacao = lazy(
  () => import("@/pages/batalhadeaura/BdaConfirmacao"),
);
const BdaPrivacidade = lazy(
  () => import("@/pages/batalhadeaura/BdaPrivacidade"),
);

export const BdaRoutes = () => (
  <>
    <Route path="/batalhadeaura" element={L(<BatalhaDeAura />)} />
    <Route path="/batalhadeaura/inscricao" element={L(<BdaInscricao />)} />
    <Route
      path="/batalhadeaura/participantes"
      element={L(<BdaParticipantes />)}
    />
    <Route path="/batalhadeaura/confirmacao" element={L(<BdaConfirmacao />)} />
    <Route path="/batalhadeaura/privacidade" element={L(<BdaPrivacidade />)} />
    <Route
      path="/batalhadeaura/regulamento"
      element={L(<BdaComingSoon title="Regulamento" />)}
    />
    <Route
      path="/batalhadeaura/ranking"
      element={L(<BdaComingSoon title="Ranking" />)}
    />
    <Route
      path="/batalhadeaura/patrocinadores"
      element={L(<BdaComingSoon title="Patrocinadores" />)}
    />
    <Route path="/batalhadeaura/faq" element={L(<BdaComingSoon title="FAQ" />)} />
    <Route
      path="/batalhadeaura/admin"
      element={L(<BdaComingSoon title="Painel Administrativo" />)}
    />
  </>
);

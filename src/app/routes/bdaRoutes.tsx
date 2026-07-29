import { lazy } from "react";
import { Route } from "react-router-dom";
import { L } from "./lazyFallback";

/**
 * Hotsite Batalha de Aura PP — árvore de rotas isolada.
 * Nenhuma rota existente da Roxou é afetada.
 */
const BatalhaDeAura = lazy(() => import("@/pages/batalhadeaura/BatalhaDeAura"));
const BdaComingSoon = lazy(() => import("@/pages/batalhadeaura/BdaComingSoon"));

export const BdaRoutes = () => (
  <>
    <Route path="/batalhadeaura" element={L(<BatalhaDeAura />)} />
    <Route
      path="/batalhadeaura/inscricao"
      element={L(<BdaComingSoon title="Inscrição" />)}
    />
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

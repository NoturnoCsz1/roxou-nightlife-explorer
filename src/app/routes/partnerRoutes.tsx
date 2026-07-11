import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { L } from "./lazyFallback";

/**
 * Árvore de rotas do Partner (Onda 3 — isolamento por produto).
 *
 * Inclui:
 *  - /admin/partner-preview/* (beta interno gateado por usePartnerBetaAccess)
 *  - /partner e /partner/* (atalhos que redirecionam ao subdomínio)
 *  - /validator (alias top-level para o validador do Partner Pro)
 *
 * PartnerPreviewLayout permanece lazy (já era). URLs 1:1.
 */
const PartnerPreviewLayout = lazy(
  () => import("@/apps/partner/layouts/PartnerPreviewLayout"),
);
const PartnerDashboardPage = lazy(
  () => import("@/apps/partner/pages/PartnerDashboardPage"),
);
const PartnerProfilePage = lazy(
  () => import("@/apps/partner/pages/PartnerProfilePage"),
);
const PartnerEventsPage = lazy(
  () => import("@/apps/partner/pages/PartnerEventsPage"),
);
const PartnerReservationsPage = lazy(
  () => import("@/apps/partner/pages/PartnerReservationsPage"),
);
const PartnerVipListPage = lazy(
  () => import("@/apps/partner/pages/PartnerVipListPage"),
);
const PartnerVipListDetailRoute = lazy(
  () => import("@/apps/partner/routes/PartnerVipListDetailRoute"),
);
const PartnerAnalyticsPage = lazy(
  () => import("@/apps/partner/pages/PartnerAnalyticsPage"),
);
const PartnerSettingsPage = lazy(
  () => import("@/apps/partner/pages/PartnerSettingsPage"),
);
const PartnerBetaLandingPage = lazy(
  () => import("@/apps/partner/pages/PartnerBetaLandingPage"),
);
const PartnerShortcutRedirect = lazy(
  () => import("@/components/PartnerShortcutRedirect"),
);

export const PartnerRoutes = () => (
  <>
    <Route
      path="/admin/partner-preview"
      element={L(<PartnerPreviewLayout />)}
    >
      <Route index element={L(<PartnerBetaLandingPage />)} />
      <Route path="dashboard" element={L(<PartnerDashboardPage />)} />
      <Route path="perfil" element={L(<PartnerProfilePage />)} />
      <Route path="eventos" element={L(<PartnerEventsPage />)} />
      <Route path="reservas" element={L(<PartnerReservationsPage />)} />
      <Route path="lista-vip" element={L(<PartnerVipListPage />)} />
      <Route
        path="lista-vip/:listId"
        element={L(<PartnerVipListDetailRoute />)}
      />
      <Route path="analytics" element={L(<PartnerAnalyticsPage />)} />
      <Route path="configuracoes" element={L(<PartnerSettingsPage />)} />
    </Route>

    <Route path="/partner" element={L(<PartnerShortcutRedirect />)} />
    <Route path="/partner/*" element={L(<PartnerShortcutRedirect />)} />
    <Route
      path="/validator"
      element={<Navigate to="/partner/validator" replace />}
    />
  </>
);

/**
 * Route wrappers — Fase 9M.
 * Adaptam páginas-componente (que recebem props) para usar useParams
 * quando montadas via React Router.
 */
import { useNavigate, useParams, Navigate } from "react-router-dom";
import PartnerEventDetailPage from "../pages/PartnerEventDetailPage";
import PartnerEventFormPage from "../pages/PartnerEventFormPage";

export const PartnerEventDetailRoute = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  if (!eventId) return <Navigate to="/eventos" replace />;
  return (
    <PartnerEventDetailPage
      eventId={eventId}
      onEdit={() => navigate(`/eventos/${eventId}/editar`)}
      onClose={() => navigate("/eventos")}
    />
  );
};

export const PartnerEventNewRoute = () => {
  const navigate = useNavigate();
  return (
    <PartnerEventFormPage
      onSaved={(ev) => navigate(`/eventos/${ev.id}`)}
      onCancel={() => navigate("/eventos")}
    />
  );
};

export const PartnerEventEditRoute = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  if (!eventId) return <Navigate to="/eventos" replace />;
  return (
    <PartnerEventFormPage
      eventId={eventId}
      onSaved={() => navigate(`/eventos/${eventId}`)}
      onCancel={() => navigate(`/eventos/${eventId}`)}
    />
  );
};
